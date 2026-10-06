/**
 * iGETIT VR Experience Generator - Client Application Logic
 */

import { checkFile, extract } from '/parsers/index.js';
import { renderHTML, toText } from '/output/render.js';
import { downloadPdf, downloadDocx } from '/output/export.js';

const $ = (id) => document.getElementById(id);

let uploadedFiles = [];
let manualData = null;
let progressTimer = null;

// The 9 Canonical Agent Workflow Stages
const WORKFLOW_STAGES = [
  'Reading source material',
  'Extracting procedure',
  'Understanding process',
  'Mapping VR interactions',
  'Building ECA logic',
  'Checking safety & errors',
  'Identifying implementation gaps',
  'Generating storyboard',
  'Validating output'
];

/**
 * Render the 9 stages in the progress UI
 */
function updateProgressStages(activeIdx) {
  const listEl = $('stagesList');
  const percent = Math.min(100, Math.round(((activeIdx + 1) / WORKFLOW_STAGES.length) * 100));
  $('progressBar').style.width = `${percent}%`;

  listEl.innerHTML = WORKFLOW_STAGES.map((stageName, idx) => {
    let stateClass = 'pending';
    let icon = `<span class="stage-bullet">${idx + 1}</span>`;

    if (idx < activeIdx) {
      stateClass = 'completed';
      icon = `<svg class="stage-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (idx === activeIdx) {
      stateClass = 'current';
      icon = `<span class="stage-spinner"></span>`;
    }

    return `
      <li class="stage-item ${stateClass}">
        <div class="stage-icon">${icon}</div>
        <div class="stage-label">${stageName}</div>
      </li>
    `;
  }).join('');
}

/**
 * Refresh file chips in the upload area
 */
function renderFileList() {
  const container = $('fileList');
  if (!uploadedFiles.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = uploadedFiles
    .map((file, idx) => {
      const sizeKb = Math.round(file.size / 1024);
      const isImg = file.type.startsWith('image/');
      return `
        <div class="file-chip">
          <svg class="file-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${isImg 
              ? '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>'
              : '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>'}
          </svg>
          <span class="file-name" title="${file.name}">${file.name}</span>
          <span class="file-size">${sizeKb} KB</span>
          <button type="button" class="remove-file-btn" data-index="${idx}" title="Remove file">&times;</button>
        </div>
      `;
    })
    .join('');
}

/**
 * Add files to the collection with validation
 */
function addFiles(filesList) {
  hideError();
  for (const f of filesList) {
    const error = checkFile(f);
    if (error) {
      showError(error);
    } else {
      // Prevent duplicates
      if (!uploadedFiles.some((item) => item.name === f.name && item.size === f.size)) {
        uploadedFiles.push(f);
      }
    }
  }
  renderFileList();
}

function showError(msg) {
  const el = $('errorMsg');
  el.textContent = msg;
  el.hidden = false;
}

function hideError() {
  const el = $('errorMsg');
  el.textContent = '';
  el.hidden = true;
}

// Event Listeners for File Drop & Selection
const dropZone = $('dropZone');
const fileInput = $('fileInput');

dropZone.onclick = () => fileInput.click();
dropZone.onkeydown = (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
};

fileInput.onchange = (e) => {
  if (e.target.files?.length) {
    addFiles([...e.target.files]);
    e.target.value = '';
  }
};

dropZone.ondragover = (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-active');
};

dropZone.ondragleave = () => {
  dropZone.classList.remove('drag-active');
};

dropZone.ondrop = (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-active');
  if (e.dataTransfer?.files?.length) {
    addFiles([...e.dataTransfer.files]);
  }
};

// Remove single file chip
$('fileList').onclick = (e) => {
  const btn = e.target.closest('.remove-file-btn');
  if (btn && btn.dataset.index) {
    uploadedFiles.splice(Number(btn.dataset.index), 1);
    renderFileList();
  }
};

// Clipboard screenshot paste support
window.addEventListener('paste', (e) => {
  const clipboardFiles = [...(e.clipboardData?.files || [])].filter((f) =>
    f.type.startsWith('image/')
  );
  if (clipboardFiles.length) {
    const timestamp = Date.now();
    const images = clipboardFiles.map(
      (f, idx) =>
        new File([f], `screenshot-${timestamp}-${idx + 1}.png`, {
          type: f.type || 'image/png'
        })
    );
    addFiles(images);
  }
});

// Generation Trigger
$('generateBtn').onclick = async () => {
  hideError();

  const pasted = $('pastedText').value.trim();
  if (!uploadedFiles.length && !pasted) {
    showError(
      'Please upload a work instruction, SOP, presentation, image, or paste the procedure text.'
    );
    return;
  }

  // Switch UI to progress view
  $('inputSection').hidden = true;
  $('progressSection').hidden = false;

  let currentStage = 0;
  updateProgressStages(0);

  // Progressive timer to simulate and transition through stages while awaiting AI completion
  progressTimer = setInterval(() => {
    if (currentStage < WORKFLOW_STAGES.length - 2) {
      currentStage++;
      updateProgressStages(currentStage);
    }
  }, 4000);

  try {
    // 1. Content Extraction
    currentStage = 1;
    updateProgressStages(1);
    const { text, images } = await extract(uploadedFiles, pasted);

    // 2. Transmit to server agent
    currentStage = 3;
    updateProgressStages(3);

    const userInstruction =
      $('instructionInput').value.trim() ||
      'Convert this into a VR Experience Manual for iGETIT.';

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instruction: userInstruction,
        text,
        images
      })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Generation failed on server.');
    }

    // 8. Storyboard generated, 9. Validated
    clearInterval(progressTimer);
    updateProgressStages(8);

    manualData = result;

    // Render output
    setTimeout(() => {
      $('docViewer').innerHTML = renderHTML(manualData);
      $('progressSection').hidden = true;
      $('outputSection').hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 450);
  } catch (err) {
    clearInterval(progressTimer);
    $('progressSection').hidden = true;
    $('inputSection').hidden = false;
    showError(err.message || 'An unexpected error occurred during generation.');
  }
};

// Toolbar Actions
$('copyBtn').onclick = async () => {
  if (!manualData) return;
  const md = toText(manualData);
  try {
    await navigator.clipboard.writeText(md);
    const label = $('copyBtn').querySelector('span');
    const orig = label.textContent;
    label.textContent = 'Copied to Clipboard!';
    setTimeout(() => (label.textContent = orig), 2200);
  } catch (e) {
    showError('Could not copy to clipboard automatically.');
  }
};

$('downloadPdfBtn').onclick = () => {
  if (manualData) downloadPdf(manualData);
};

$('downloadDocxBtn').onclick = () => {
  if (manualData) downloadDocx(manualData);
};

$('startNewBtn').onclick = () => {
  uploadedFiles = [];
  renderFileList();
  $('pastedText').value = '';
  $('instructionInput').value = 'Convert this into a VR Experience Manual for iGETIT.';
  hideError();
  manualData = null;
  $('outputSection').hidden = true;
  $('inputSection').hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Theme toggle
const themeBtn = $('themeToggle');
const savedTheme = localStorage.getItem('igetit-theme') || 'light';
if (savedTheme === 'dark') {
  document.body.classList.add('dark-mode');
}

themeBtn.onclick = () => {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('igetit-theme', isDark ? 'dark' : 'light');
};
