# iGETIT VR Experience Generator

A production-ready AI Agent that transforms industrial standard operating procedures (SOPs), manufacturing manuals, assembly guides, and work instructions into structured, implementation-ready **3–5 page VR Experience Manuals**.

---

## Product Goal

**Upload source material → enter one short instruction → Generate → receive a concise 3–5 page VR Experience Manual.**

The user is **never** required to supply or manage the 140–1200 line AR/VR master prompt. That instruction layer is housed securely on the server as the agent's hidden system intelligence.

Default User Instruction:
> `Convert this into a VR Experience Manual for iGETIT.`

---

## Core Agent Workflow

```text
SOURCE MATERIAL (PDF / PPTX / DOCX / Text / Image)
      ↓
CONTENT EXTRACTION (pdf.js / mammoth / JSZip / Multimodal Base64)
      ↓
SOURCE UNDERSTANDING (Tools, Components, Objectives, Preconditions)
      ↓
PROCEDURE EXTRACTION (Numbered steps, visual references)
      ↓
VR EXPERIENCE MAPPING (Observe, Grab, Align, Place, Operate, Verify...)
      ↓
EVENT → CRITERIA → ACTION (ECA) LOGIC
      ↓
ASSET IDENTIFICATION (3D, UI, Animation, Audio)
      ↓
SAFETY & ERROR HANDLING (PPE, hazards, lockout, recovery)
      ↓
IMPLEMENTATION GAP DETECTION (Unstated torque, missing CAD, tolerances)
      ↓
STRUCTURED STORYBOARD GENERATION
      ↓
OUTPUT VALIDATION & AUTO-REPAIR
      ↓
3–5 PAGE VR EXPERIENCE MANUAL (Viewer, PDF, DOCX, Markdown)
```

---

## Quick Start

### 1. Requirements
- Node.js 18+ installed (Zero `npm install` needed — runs with 100% native Node.js).

### 2. Configuration (Optional API Key)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Configure your preferred AI provider:
- **Anthropic Claude (Recommended)**: Set `ANTHROPIC_API_KEY=sk-ant-...`
- **Google Gemini**: Set `GEMINI_API_KEY=AIzaSy...`
- **Offline / Demonstration Mode**: If no API key is set, the server automatically utilizes an intelligent local grounded extraction engine so you can test end-to-end immediately!

### 3. Run the Server
```bash
npm start
# or: node server.js
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## Architecture & Codebase Structure

```text
igetit-vr/
├── prompts/
│   └── master.prompt.txt     # Hidden server-side AR/VR Master Prompt (ECA logic, zero-hallucination rules)
├── agent/
│   ├── generate.js           # Multi-provider generation layer (Claude, Gemini, Local Fallback)
│   └── validator.js          # Structural validation, ECA verification, and auto-repair engine
├── parsers/
│   └── index.js              # Browser-side parsers: PDF, DOCX (tables & headings), PPTX (tables & notes), vision images
├── output/
│   ├── render.js             # Executive document HTML renderer, interaction badges, and markdown generator
│   └── export.js             # Landscape A4 PDF export (jsPDF autoTable) & Word (.docx) export (JSZip)
├── ui/
│   ├── index.html            # Main UI with drag-and-drop zone, 9-stage progress tracker, document viewer
│   ├── styles.css            # Modern design system (Inter/Outfit typography, light/dark themes, glassmorphic cards)
│   └── app.js                # Client controller, clipboard screenshot pasting, and event orchestrator
├── server.js                 # HTTP server with private prompt protection and /api/generate endpoint
├── package.json              # Zero-dependency package manifest
└── .env.example              # Environment variables template
```

---

## Output Structure (6 Sections)

1. **Training Overview**: Objective, Target Audience, Tools/Equipment, Components/Materials, Prerequisites, Completion Criteria.
2. **Required VR Assets**: Tabular catalog of 3D models, UI overlays, mechanical animations, and sound effects with Source/Gap attribution.
3. **VR Experience Storyboard (Primary)**: Step, Source Instruction, Learner Interaction (standardized VR verb), Event (trigger), Criteria (acceptance threshold), Action (VR system response), Expected Result, Incorrect Action / Recovery.
4. **Safety & Error Handling**: Documented hazards, PPE enforcement, incorrect action interceptions, and corrective recovery paths.
5. **Voice-over / Instructional Prompts**: Concise spoken audio cues for key milestones.
6. **Implementation Gaps**: Explicit catalog of unstated technical parameters (e.g. unstated torque ratings, missing CAD files, undefined tolerances) preserved with zero hallucination.

---

## Export Formats

- **Copy Output**: Formatted GitHub-flavored Markdown copied directly to clipboard.
- **Download PDF**: Formatted landscape A4 PDF with table auto-pagination and headers.
- **Download DOCX**: Microsoft Word compatible document with tables and formatting.
- **Start New**: Instant reset for next document analysis.
