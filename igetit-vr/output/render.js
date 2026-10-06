/**
 * iGETIT VR Experience Generator - Output Renderer
 * Generates an executive document-style HTML view and formatted text/markdown.
 */

export const COLS = {
  assets: [
    ['asset', 'Asset Name'],
    ['type', 'Type'],
    ['purpose', 'Purpose / Usage in VR'],
    ['source', 'Source / Gap']
  ],
  storyboard: [
    ['step', 'Step'],
    ['instruction', 'Source Instruction'],
    ['interaction', 'Learner Interaction'],
    ['event', 'Event (Trigger)'],
    ['criteria', 'Criteria (Acceptance)'],
    ['action', 'VR System Action'],
    ['expected', 'Expected Result'],
    ['incorrect', 'Incorrect Action / Recovery']
  ],
  safety: [
    ['step', 'Step'],
    ['risk', 'Risk / Incorrect Action'],
    ['response', 'VR System Response'],
    ['recovery', 'Recovery Path']
  ],
  voiceover: [
    ['step', 'Step'],
    ['text', 'Spoken Voice-Over Prompt']
  ],
  gaps: [
    ['missing', 'Missing Technical Information'],
    ['why', 'Why It Is Needed in VR'],
    ['impact', 'Simulation Impact']
  ]
};

export const SECTION_TITLES = {
  assets: '2. Required VR Assets',
  storyboard: '3. VR Experience Storyboard',
  safety: '4. Safety & Error Handling',
  voiceover: '5. Voice-over / Instructional Prompts',
  gaps: '6. Implementation Gaps'
};

const escapeHtml = (str) =>
  String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

const highlightGaps = (str) => {
  const escaped = escapeHtml(str);
  return escaped.replace(
    /(Implementation Gap[^<]*|Gap:[^<]*)/gi,
    '<span class="gap-pill">$1</span>'
  );
};

const renderBadges = (arr) => {
  if (!arr || !arr.length) return '<span class="empty-val">None specified</span>';
  return `<div class="badge-list">${arr
    .map((item) => `<span class="tag-badge">${escapeHtml(item)}</span>`)
    .join('')}</div>`;
};

const renderInteractionBadge = (interaction) => {
  const clean = escapeHtml(interaction || 'Operate');
  const lower = clean.toLowerCase();
  let colorClass = 'verb-operate';
  if (['grab', 'pick', 'move', 'place'].includes(lower)) colorClass = 'verb-manipulate';
  else if (['align', 'rotate'].includes(lower)) colorClass = 'verb-align';
  else if (['inspect', 'verify', 'compare', 'observe'].includes(lower)) colorClass = 'verb-inspect';
  else if (['press', 'activate', 'confirm', 'complete'].includes(lower)) colorClass = 'verb-control';
  return `<span class="interaction-badge ${colorClass}">${clean}</span>`;
};

const renderAssetTypeBadge = (type) => {
  const clean = escapeHtml(type || '3D');
  const lower = clean.toLowerCase();
  let colorClass = 'asset-3d';
  if (lower.includes('ui')) colorClass = 'asset-ui';
  else if (lower.includes('anim')) colorClass = 'asset-anim';
  else if (lower.includes('audio')) colorClass = 'asset-audio';
  return `<span class="asset-badge ${colorClass}">${clean}</span>`;
};

function renderTable(data, sectionKey) {
  const rows = data[sectionKey] || [];
  if (!rows.length) {
    return `<div class="empty-section-note">No items identified for this section.</div>`;
  }

  const columns = COLS[sectionKey];
  const ths = columns.map((col) => `<th>${col[1]}</th>`).join('');

  const trs = rows
    .map((row) => {
      const tds = columns
        .map((col) => {
          const key = col[0];
          const val = row[key];

          if (sectionKey === 'storyboard' && key === 'interaction') {
            return `<td>${renderInteractionBadge(val)}</td>`;
          }
          if (sectionKey === 'assets' && key === 'type') {
            return `<td>${renderAssetTypeBadge(val)}</td>`;
          }
          if (sectionKey === 'safety' && key === 'risk') {
            return `<td><span class="hazard-text">⚠ ${highlightGaps(val)}</span></td>`;
          }
          if (sectionKey === 'gaps' && key === 'missing') {
            return `<td><strong class="gap-title">${highlightGaps(val)}</strong></td>`;
          }

          return `<td>${highlightGaps(val)}</td>`;
        })
        .join('');
      return `<tr>${tds}</tr>`;
    })
    .join('');

  return `<div class="table-container"><table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
}

/**
 * Render structured JSON data into an executive VR Experience Manual HTML view
 */
export function renderHTML(data) {
  const stepCount = data.storyboard?.length || 0;
  const assetCount = data.assets?.length || 0;
  const gapCount = data.gaps?.length || 0;

  return `
    <div class="manual-document">
      <!-- Document Header Banner -->
      <header class="doc-header">
        <div class="doc-meta-strip">
          <span class="brand-badge">iGETIT VR</span>
          <span class="spec-badge">Experience Manual Specification</span>
          <span class="status-badge">Implementation Ready</span>
        </div>
        <h1 class="doc-title">${escapeHtml(data.title || 'VR Experience Manual')}</h1>
        <p class="doc-subtitle">Structured VR Training Architecture &bull; Event &rarr; Criteria &rarr; Action Framework</p>
        
        <div class="doc-stats-bar">
          <div class="stat-item">
            <span class="stat-num">${stepCount}</span>
            <span class="stat-label">Storyboard Steps</span>
          </div>
          <div class="stat-item">
            <span class="stat-num">${assetCount}</span>
            <span class="stat-label">Required VR Assets</span>
          </div>
          <div class="stat-item ${gapCount > 0 ? 'stat-alert' : ''}">
            <span class="stat-num">${gapCount}</span>
            <span class="stat-label">Implementation Gaps</span>
          </div>
          <div class="stat-item">
            <span class="stat-num">3–5</span>
            <span class="stat-label">Target Page Scope</span>
          </div>
        </div>
      </header>

      <!-- Section 1: Training Overview -->
      <section class="doc-section">
        <h2 class="section-heading">1. Training Overview</h2>
        <div class="overview-grid">
          <div class="overview-card full-span">
            <div class="overview-label">Training Objective</div>
            <div class="overview-value">${highlightGaps(data.objective)}</div>
          </div>
          <div class="overview-card">
            <div class="overview-label">Target Audience</div>
            <div class="overview-value">${highlightGaps(data.audience)}</div>
          </div>
          <div class="overview-card">
            <div class="overview-label">Prerequisites</div>
            <div class="overview-value">${renderBadges(data.prerequisites)}</div>
          </div>
          <div class="overview-card">
            <div class="overview-label">Tools &amp; Equipment</div>
            <div class="overview-value">${renderBadges(data.tools)}</div>
          </div>
          <div class="overview-card">
            <div class="overview-label">Components &amp; Workpieces</div>
            <div class="overview-value">${renderBadges(data.components)}</div>
          </div>
          <div class="overview-card full-span">
            <div class="overview-label">Completion Criteria</div>
            <div class="overview-value">${renderBadges(data.completion)}</div>
          </div>
        </div>
      </section>

      <!-- Section 2: Required VR Assets -->
      <section class="doc-section">
        <h2 class="section-heading">${SECTION_TITLES.assets}</h2>
        <p class="section-desc">Classified inventory of 3D models, UI overlays, mechanical animations, and sound effects required for build.</p>
        ${renderTable(data, 'assets')}
      </section>

      <!-- Section 3: VR Experience Storyboard (PRIMARY) -->
      <section class="doc-section primary-section">
        <div class="section-header-row">
          <h2 class="section-heading">${SECTION_TITLES.storyboard}</h2>
          <span class="primary-flag">Primary Implementation Core</span>
        </div>
        <p class="section-desc">Procedural interaction mapping grounded in the source manual using the Event &rarr; Criteria &rarr; Action logic framework.</p>
        ${renderTable(data, 'storyboard')}
      </section>

      <!-- Section 4: Safety & Error Handling -->
      <section class="doc-section">
        <h2 class="section-heading">${SECTION_TITLES.safety}</h2>
        <p class="section-desc">Grounded hazard safeguards, incorrect action interceptions, and real-time recovery mechanisms.</p>
        ${renderTable(data, 'safety')}
      </section>

      <!-- Section 5: Voice-over / Instructional Prompts -->
      <section class="doc-section">
        <h2 class="section-heading">${SECTION_TITLES.voiceover}</h2>
        <p class="section-desc">Concise auditory instructions and guidance prompts delivered at critical procedural milestones.</p>
        ${renderTable(data, 'voiceover')}
      </section>

      <!-- Section 6: Implementation Gaps -->
      <section class="doc-section gaps-section">
        <div class="section-header-row">
          <h2 class="section-heading">${SECTION_TITLES.gaps}</h2>
          <span class="gap-count-flag">${gapCount} Gaps Detected</span>
        </div>
        <div class="gap-callout">
          <strong>Zero-Hallucination Policy:</strong> Parameters not specified in the source document (e.g. unstated torque ratings, missing CAD files, or undefined tolerances) are explicitly recorded below rather than guessed.
        </div>
        ${renderTable(data, 'gaps')}
      </section>
      
      <footer class="doc-footer">
        <div>iGETIT VR Experience Manual &bull; Generated by iGETIT Agent</div>
        <div>Confidential &amp; Proprietary &bull; Implementation Ready</div>
      </footer>
    </div>
  `;
}

/**
 * Generate clean Markdown representation for clipboard copy
 */
export function toText(data) {
  let md = `# ${data.title || 'VR Experience Manual'}\n\n`;
  md += `## 1. Training Overview\n`;
  md += `- **Objective**: ${data.objective}\n`;
  md += `- **Target Audience**: ${data.audience}\n`;
  md += `- **Tools / Equipment**: ${(data.tools || []).join(', ')}\n`;
  md += `- **Components**: ${(data.components || []).join(', ')}\n`;
  md += `- **Prerequisites**: ${(data.prerequisites || []).join(', ')}\n`;
  md += `- **Completion Criteria**: ${(data.completion || []).join(', ')}\n\n`;

  for (const key in SECTION_TITLES) {
    md += `## ${SECTION_TITLES[key]}\n\n`;
    const rows = data[key] || [];
    const cols = COLS[key];

    if (!rows.length) {
      md += `None identified.\n\n`;
      continue;
    }

    md += '| ' + cols.map((c) => c[1]).join(' | ') + ' |\n';
    md += '| ' + cols.map(() => '---').join(' | ') + ' |\n';
    for (const row of rows) {
      md += '| ' + cols.map((c) => String(row[c[0]] ?? '').replace(/\|/g, '-').replace(/\n/g, ' ')).join(' | ') + ' |\n';
    }
    md += '\n';
  }

  return md;
}
