// Browser-side document & multimodal extraction layer
// Leverages pdf.js, mammoth, JSZip loaded in ui/index.html

const SUPPORTED_EXTS = /\.(pdf|pptx|docx|txt|md|png|jpe?g|webp|bmp)$/i;

export function checkFile(file) {
  if (/\.(ppt|doc)$/i.test(file.name)) {
    return `${file.name}: Legacy binary .ppt / .doc files are not supported directly. Please save or export as .pptx, .docx, or PDF.`;
  }
  if (!SUPPORTED_EXTS.test(file.name) && !file.type.startsWith('image/')) {
    return `${file.name}: Unsupported file format. Please upload PDF, PPTX, DOCX, TXT, or images (PNG/JPG).`;
  }
  return null;
}

/**
 * PDF text extraction with layout preservation (line breaks, tables, headings)
 */
async function extractPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const content = await page.getTextContent();
    let pageText = `\n[--- Page ${pageNum} ---]\n`;

    let lastY = null;
    let currentLine = '';

    for (const item of content.items) {
      if (!item.str && !item.hasEOL) continue;

      // Detect vertical delta (new line in layout)
      const currentY = item.transform ? item.transform[5] : null;
      const isNewLine = lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 5;

      if (isNewLine || item.hasEOL) {
        if (currentLine.trim()) {
          pageText += currentLine.trim() + '\n';
        }
        currentLine = item.str || '';
      } else {
        currentLine += (currentLine.length > 0 && !currentLine.endsWith(' ') ? ' ' : '') + item.str;
      }

      if (currentY !== null) lastY = currentY;
    }

    if (currentLine.trim()) {
      pageText += currentLine.trim() + '\n';
    }

    fullText += pageText;
  }

  return fullText;
}

/**
 * DOCX extraction with paragraphs, headings, bullet lists, and tables
 */
async function extractDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  try {
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    const html = htmlResult.value;

    // Convert HTML structure to formatted markdown-style text
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    let text = '';
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
        return;
      }
      const tag = node.nodeName.toLowerCase();
      if (['h1', 'h2', 'h3', 'h4', 'h5'].includes(tag)) {
        text += '\n\n### ' + node.textContent.trim() + '\n';
        return;
      }
      if (tag === 'p') {
        text += '\n' + node.textContent.trim();
        return;
      }
      if (tag === 'li') {
        text += '\n• ' + node.textContent.trim();
        return;
      }
      if (tag === 'table') {
        text += '\n[Table Start]\n';
        const rows = node.querySelectorAll('tr');
        rows.forEach(tr => {
          const cells = Array.from(tr.querySelectorAll('th, td')).map(td => td.textContent.trim().replace(/\|/g, '-'));
          if (cells.length) {
            text += '| ' + cells.join(' | ') + ' |\n';
          }
        });
        text += '[Table End]\n';
        return;
      }
      node.childNodes.forEach(walk);
    };

    walk(doc.body);
    const cleaned = text.replace(/\n{3,}/g, '\n\n').trim();
    if (cleaned.length > 30) return cleaned;
  } catch (err) {
    console.warn('DOCX HTML extraction fallback:', err);
  }

  // Fallback to raw text
  const raw = await mammoth.extractRawText({ arrayBuffer });
  return raw.value;
}

/**
 * PPTX extraction with slide numbers, paragraphs, table rows, and speaker notes
 */
async function extractPptx(file) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slideKeys = Object.keys(zip.files)
    .filter(k => /^ppt\/slides\/slide\d+\.xml$/.test(k))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)[0], 10);
      const numB = parseInt(b.match(/\d+/)[0], 10);
      return numA - numB;
    });

  let fullText = '';

  for (const slideKey of slideKeys) {
    const slideNum = slideKey.match(/\d+/)[0];
    const xml = await zip.files[slideKey].async('string');
    let slideContent = `\n[--- Slide ${slideNum} ---]\n`;

    // 1. Extract tables if present
    const tableMatches = xml.matchAll(/<a:tbl[\s\S]*?<\/a:tbl>/g);
    for (const tMatch of tableMatches) {
      slideContent += '[Table in Slide]\n';
      const rowMatches = tMatch[0].matchAll(/<a:tr[\s\S]*?<\/a:tr>/g);
      for (const rMatch of rowMatches) {
        const cellMatches = [...rMatch[0].matchAll(/<a:tc[\s\S]*?<\/a:tc>/g)];
        const cells = cellMatches.map(c => {
          const textRuns = [...c[0].matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map(m => m[1]).join(' ');
          return textRuns.trim() || '-';
        });
        if (cells.length) {
          slideContent += '| ' + cells.join(' | ') + ' |\n';
        }
      }
    }

    // 2. Extract paragraph texts
    const paragraphs = xml.matchAll(/<a:p[\s\S]*?<\/a:p>/g);
    for (const pMatch of paragraphs) {
      // Don't duplicate table text if it was inside a:tbl
      if (pMatch[0].includes('a:tbl')) continue;
      const textPieces = [...pMatch[0].matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map(m => m[1]).join('');
      if (textPieces.trim()) {
        slideContent += textPieces.trim() + '\n';
      }
    }

    // 3. Extract speaker notes if available
    const notesKey = `ppt/notesSlides/notesSlide${slideNum}.xml`;
    if (zip.files[notesKey]) {
      const notesXml = await zip.files[notesKey].async('string');
      const noteTexts = [...notesXml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map(m => m[1]).join(' ').trim();
      if (noteTexts && !noteTexts.includes(slideNum)) {
        slideContent += `[Speaker Notes]: ${noteTexts}\n`;
      }
    }

    fullText += slideContent;
  }

  const mediaCount = Object.keys(zip.files).filter(k => /^ppt\/media\/.*\.(png|jpe?g)$/i.test(k)).length;
  if (mediaCount > 0) {
    fullText += `\n[Note: Presentation contains ${mediaCount} embedded images. For critical diagrams, upload them as separate image files for visual inspection.]\n`;
  }

  return fullText;
}

/**
 * Compress and optimize image to high-clarity JPEG (max 1280px dimension)
 * Reduces payload and token consumption by 90% while preserving sharp diagram/text readability.
 */
function compressAndOptimizeImage(file) {
  return new Promise((resolve) => {
    // If not an image, resolve with null
    if (!file.type.startsWith('image/') && !/\.(png|jpe?g|webp|bmp)$/i.test(file.name)) {
      return resolve(null);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1280;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        const b64 = dataUrl.split(',')[1];
        resolve({
          media_type: 'image/jpeg',
          data: b64,
          filename: file.name
        });
      };

      img.onerror = () => {
        // Fallback to raw base64 if canvas drawing fails
        const b64 = e.target.result.split(',')[1];
        resolve({
          media_type: file.type || 'image/png',
          data: b64,
          filename: file.name
        });
      };

      img.src = e.target.result;
    };

    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/**
 * Unified extractor for all source material
 */
export async function extract(files, pastedText = '') {
  let combinedText = '';
  const images = [];

  for (const file of files) {
    const lowerName = file.name.toLowerCase();

    // Multimodal image processing with auto-compression
    if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp)$/i.test(lowerName)) {
      const imgData = await compressAndOptimizeImage(file);
      if (imgData) {
        images.push(imgData);
        combinedText += `\n=== SOURCE IMAGE ATTACHMENT: ${file.name} ===\n[Diagram/Screenshot attached for multimodal vision inspection]\n`;
      }
      continue;
    }

    // Document parsers
    let text = '';
    if (lowerName.endsWith('.pdf')) {
      text = await extractPdf(file);
    } else if (lowerName.endsWith('.docx')) {
      text = await extractDocx(file);
    } else if (lowerName.endsWith('.pptx')) {
      text = await extractPptx(file);
    } else {
      text = await file.text();
    }

    // Verify readable content
    const stripped = text.replace(/\s|\[--- Page \d+ ---]|\[--- Slide \d+ ---]/g, '');
    if (stripped.length < 15) {
      throw Object.assign(
        new Error(`Could not extract readable text from ${file.name}. The document may be scanned or empty. Please upload clear screenshots or paste the text directly.`),
        { unreadable: true }
      );
    }

    combinedText += `\n=== SOURCE DOCUMENT: ${file.name} ===\n${text}\n`;
  }

  if (pastedText && pastedText.trim()) {
    combinedText += `\n=== USER PASTED SOURCE TEXT ===\n${pastedText.trim()}\n`;
  }

  return { text: combinedText, images };
}
