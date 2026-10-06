/**
 * iGETIT VR Experience Generator - Export Module
 * Supports PDF generation via jsPDF & autoTable, and Word (.docx) generation via JSZip.
 */

import { COLS, SECTION_TITLES } from './render.js';

function sanitizeFilename(title) {
  return (title || 'iGETIT-VR-Experience-Manual')
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50);
}

/**
 * Download high-fidelity PDF manual (Landscape A4, formatted tables, page footers)
 */
export function downloadPdf(data) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert('PDF export library is still loading. Please try again in a moment.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const primaryColor = [27, 79, 216]; // #1b4fd8
  const darkText = [20, 33, 61];

  // Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('iGETIT VR EXPERIENCE MANUAL', 30, 28);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Implementation Specification &bull; ECA Framework', pageWidth - 240, 28);

  // Document Title
  doc.setTextColor(...darkText);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(data.title || 'VR Experience Manual', 30, 72);

  // Section 1: Overview Table
  doc.autoTable({
    startY: 85,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 4,
      textColor: darkText,
      lineColor: [220, 225, 235],
      lineWidth: 0.5
    },
    head: [[{ content: '1. Training Overview', colSpan: 2, styles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' } }]],
    body: [
      ['Objective', data.objective || ''],
      ['Target Audience', data.audience || ''],
      ['Tools & Equipment', (data.tools || []).join(', ')],
      ['Components & Materials', (data.components || []).join(', ')],
      ['Prerequisites', (data.prerequisites || []).join(', ')],
      ['Completion Criteria', (data.completion || []).join(', ')]
    ],
    columnStyles: {
      0: { cellWidth: 140, fontStyle: 'bold', fillColor: [248, 250, 252] },
      1: { cellWidth: 'auto' }
    }
  });

  // Render Sections 2 through 6
  const sectionKeys = ['assets', 'storyboard', 'safety', 'voiceover', 'gaps'];

  for (const key of sectionKeys) {
    const title = SECTION_TITLES[key];
    const columns = COLS[key];
    const rows = (data[key] || []).map((row) =>
      columns.map((col) => String(row[col[0]] ?? ''))
    );

    let startY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 18 : 90;
    if (startY > pageHeight - 80) {
      doc.addPage();
      startY = 40;
    }

    doc.autoTable({
      startY,
      theme: 'grid',
      styles: {
        fontSize: key === 'storyboard' ? 7 : 7.5,
        cellPadding: 3.5,
        textColor: darkText,
        lineColor: [220, 225, 235],
        lineWidth: 0.5,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: 255,
        fontStyle: 'bold'
      },
      head: [
        [{ content: title, colSpan: columns.length, styles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 9 } }],
        columns.map((c) => c[1])
      ],
      body: rows.length ? rows : [['No items identified.', ...Array(columns.length - 1).fill('')]],
      alternateRowStyles: {
        fillColor: [250, 251, 254]
      }
    });
  }

  // Page Numbers Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 150, 165);
    doc.text(
      `iGETIT VR Experience Manual  |  Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 16,
      { align: 'center' }
    );
  }

  const filename = `${sanitizeFilename(data.title)}.pdf`;
  doc.save(filename);
}

/**
 * Helper to escape XML strings for Word OOXML
 */
const escapeXml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * Generate native Word (.docx) using JSZip, with fallback to HTML-doc (.doc)
 */
export async function downloadDocx(data) {
  const baseName = sanitizeFilename(data.title);

  // If JSZip is available, build a genuine .docx container
  if (window.JSZip) {
    try {
      const zip = new window.JSZip();

      // [Content_Types].xml
      zip.file(
        '[Content_Types].xml',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
      );

      // _rels/.rels
      zip.file(
        '_rels/.rels',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
      );

      // Generate word/document.xml body
      let docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <!-- Document Title -->
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading1"/>
        <w:jc w:val="left"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="1B4FD8"/></w:rPr>
        <w:t>${escapeXml(data.title || 'VR Experience Manual')}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr><w:i/><w:sz w:val="20"/><w:color w:val="64748B"/></w:rPr>
        <w:t>iGETIT AR/VR Experience Manual &bull; Event &rarr; Criteria &rarr; Action Framework</w:t>
      </w:r>
    </w:p>

    <!-- Section 1: Overview -->
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="1B4FD8"/></w:rPr><w:t>1. Training Overview</w:t></w:r></w:p>
    
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="0" w:type="auto"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="DDE1E8"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="DDE1E8"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="DDE1E8"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="DDE1E8"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="DDE1E8"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="DDE1E8"/>
        </w:tblBorders>
      </w:tblPr>
      ${[
        ['Objective', data.objective || ''],
        ['Target Audience', data.audience || ''],
        ['Tools & Equipment', (data.tools || []).join(', ')],
        ['Components & Materials', (data.components || []).join(', ')],
        ['Prerequisites', (data.prerequisites || []).join(', ')],
        ['Completion Criteria', (data.completion || []).join(', ')]
      ].map(([label, val]) => `
        <w:tr>
          <w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(label)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcW w:w="6800" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(val)}</w:t></w:r></w:p></w:tc>
        </w:tr>`).join('')}
    </w:tbl>`;

      // Render Sections 2 through 6 in Word XML
      const sectionKeys = ['assets', 'storyboard', 'safety', 'voiceover', 'gaps'];
      for (const key of sectionKeys) {
        const title = SECTION_TITLES[key];
        const cols = COLS[key];
        const rows = data[key] || [];

        docXml += `
    <w:p><w:pPr><w:spacing w:before="300"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="1B4FD8"/></w:rPr><w:t>${escapeXml(title)}</w:t></w:r></w:p>
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="0" w:type="auto"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="DDE1E8"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="DDE1E8"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="DDE1E8"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="DDE1E8"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="DDE1E8"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="DDE1E8"/>
        </w:tblBorders>
      </w:tblPr>
      <!-- Header Row -->
      <w:tr>
        ${cols.map(c => `
        <w:tc>
          <w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="1B4FD8"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="FFFFFF"/></w:rPr><w:t>${escapeXml(c[1])}</w:t></w:r></w:p>
        </w:tc>`).join('')}
      </w:tr>
      <!-- Data Rows -->
      ${rows.map(row => `
      <w:tr>
        ${cols.map(c => `
        <w:tc>
          <w:p><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>${escapeXml(String(row[c[0]] ?? ''))}</w:t></w:r></w:p>
        </w:tc>`).join('')}
      </w:tr>`).join('')}
    </w:tbl>`;
      }

      docXml += `
  </w:body>
</w:document>`;

      zip.file('word/document.xml', docXml);

      const blob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    } catch (err) {
      console.warn('Native DOCX generation fallback to HTML doc:', err);
    }
  }

  // Fallback to HTML-Word .doc
  const filename = `${baseName}.doc`;
  let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>${escapeXml(data.title || 'VR Experience Manual')}</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #14213d; }
    h1 { color: #1b4fd8; font-size: 20pt; border-bottom: 2pt solid #1b4fd8; padding-bottom: 4pt; }
    h2 { color: #1b4fd8; font-size: 14pt; margin-top: 18pt; border-bottom: 1pt solid #dde1e8; padding-bottom: 3pt; }
    table { border-collapse: collapse; width: 100%; margin-top: 8pt; margin-bottom: 12pt; font-size: 9.5pt; }
    th, td { border: 1pt solid #dde1e8; padding: 5pt 7pt; text-align: left; vertical-align: top; }
    th { background-color: #1b4fd8; color: #ffffff; font-weight: bold; }
    .kv-label { font-weight: bold; width: 160pt; background-color: #f8fafc; }
  </style></head><body>
  <h1>${escapeXml(data.title || 'VR Experience Manual')}</h1>
  <p><em>iGETIT VR Training Framework &bull; Event &rarr; Criteria &rarr; Action Logic</em></p>
  
  <h2>1. Training Overview</h2>
  <table>
    <tr><td class="kv-label">Objective</td><td>${escapeXml(data.objective || '')}</td></tr>
    <tr><td class="kv-label">Target Audience</td><td>${escapeXml(data.audience || '')}</td></tr>
    <tr><td class="kv-label">Tools &amp; Equipment</td><td>${escapeXml((data.tools || []).join(', '))}</td></tr>
    <tr><td class="kv-label">Components</td><td>${escapeXml((data.components || []).join(', '))}</td></tr>
    <tr><td class="kv-label">Prerequisites</td><td>${escapeXml((data.prerequisites || []).join(', '))}</td></tr>
    <tr><td class="kv-label">Completion Criteria</td><td>${escapeXml((data.completion || []).join(', '))}</td></tr>
  </table>`;

  const sectionKeys = ['assets', 'storyboard', 'safety', 'voiceover', 'gaps'];
  for (const key of sectionKeys) {
    const title = SECTION_TITLES[key];
    const columns = COLS[key];
    const rows = data[key] || [];

    html += `<h2>${escapeXml(title)}</h2><table><tr>${columns.map((c) => `<th>${escapeXml(c[1])}</th>`).join('')}</tr>`;
    if (!rows.length) {
      html += `<tr><td colspan="${columns.length}">None identified.</td></tr>`;
    } else {
      for (const row of rows) {
        html += `<tr>${columns.map((col) => `<td>${escapeXml(String(row[col[0]] ?? ''))}</td>`).join('')}</tr>`;
      }
    }
    html += `</table>`;
  }
  html += `</body></html>`;

  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
