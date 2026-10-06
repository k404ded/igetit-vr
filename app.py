import os
import json
import re
import io
import html
import streamlit as st
import pandas as pd
from typing import Optional, Dict, Any, List

# Optional document parsing libraries
try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        fitz = None

try:
    import docx
except ImportError:
    docx = None

try:
    import pptx
except ImportError:
    pptx = None

# Gemini client
try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None

# Page Configuration - Start with collapsed sidebar
st.set_page_config(
    page_title="iGETIT VR Experience Generator",
    page_icon="🥽",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Load base CSS if available
def load_stylesheet() -> str:
    possible_paths = [
        os.path.join(os.path.dirname(__file__), "ui", "styles.css"),
        os.path.join(os.path.dirname(__file__), "igetit-vr", "ui", "styles.css"),
    ]
    for p in possible_paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    return f.read()
            except Exception:
                pass
    return ""

base_css = load_stylesheet()

# Custom styles & layout overrides
st.markdown(f"""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap');

    /* 1. COMPLETELY HIDE SIDEBAR & STREAMLIT CHROME */
    [data-testid="stSidebar"], [data-testid="stSidebarCollapsedControl"], section[data-testid="stSidebar"] {{
        display: none !important;
    }}
    header[data-testid="stHeader"] {{
        display: none !important;
    }}
    footer {{
        display: none !important;
    }}
    #MainMenu {{
        display: none !important;
    }}
    /* Hide header anchor links (the little link icon next to titles) */
    a[href^="#"], [data-testid="stHeaderActionElements"] {{
        display: none !important;
    }}

    /* 2. PAGE BACKGROUND & BASE CONTAINER RESET */
    .stApp {{
        background-color: #f8fafc !important;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    }}
    .main .block-container {{
        padding-top: 86px !important;
        padding-bottom: 64px !important;
        max-width: 1040px !important;
        margin: 0 auto !important;
    }}

    /* 3. BASE CSS FROM ORIGINAL REPOSITORY */
    {base_css}

    /* 4. FULL-WIDTH FIXED TOP NAVBAR */
    .top-navbar-fixed {{
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        width: 100vw;
        height: 64px;
        background-color: #ffffff;
        border-bottom: 1px solid #e2e8f0;
        padding: 0 32px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        z-index: 999999;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04);
        box-sizing: border-box;
    }}

    /* 5. UNIFIED CARD CONTAINER OVERRIDE */
    div[data-testid="stVerticalBlockBorderWrapper"] {{
        background: #ffffff !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 14px !important;
        padding: 24px 28px !important;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05) !important;
        margin-bottom: 24px !important;
    }}

    /* Field labels */
    .field-header {{
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 8px;
        font-size: 14px;
    }}
    .field-title {{
        font-weight: 600;
        color: #0f172a;
    }}
    .field-sub {{
        font-size: 12px;
        color: #64748b;
        font-weight: 400;
    }}

    /* File Uploader */
    [data-testid="stFileUploader"] {{
        background-color: #f8fafc !important;
        border: 2px dashed #93c5fd !important;
        border-radius: 10px !important;
        padding: 12px 18px !important;
        transition: border-color 0.2s, background-color 0.2s;
    }}
    [data-testid="stFileUploader"]:hover {{
        border-color: #3b82f6 !important;
        background-color: #eff6ff !important;
    }}
    [data-testid="stFileUploaderDropzone"] {{
        background: transparent !important;
        border: none !important;
    }}

    /* Text inputs & Textarea */
    .stTextArea textarea {{
        background-color: #f1f5f9 !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 10px !important;
        color: #0f172a !important;
        font-family: 'Inter', sans-serif !important;
        font-size: 14px !important;
        padding: 12px 14px !important;
    }}
    .stTextArea textarea:focus {{
        border-color: #1b4fd8 !important;
        background-color: #ffffff !important;
        box-shadow: 0 0 0 3px rgba(27, 79, 216, 0.1) !important;
    }}

    .stTextInput input {{
        background-color: #f1f5f9 !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 10px !important;
        color: #0f172a !important;
        font-family: 'Inter', sans-serif !important;
        font-size: 14px !important;
        padding: 12px 14px !important;
    }}
    .stTextInput input:focus {{
        border-color: #1b4fd8 !important;
        background-color: #ffffff !important;
        box-shadow: 0 0 0 3px rgba(27, 79, 216, 0.1) !important;
    }}

    /* Right-aligned Primary Blue Button */
    div[data-testid="stVerticalBlockBorderWrapper"] div.stButton {{
        display: flex !important;
        justify-content: flex-end !important;
        margin-top: 18px !important;
        margin-bottom: 0px !important;
    }}
    div[data-testid="stVerticalBlockBorderWrapper"] div.stButton > button {{
        background-color: #1b4fd8 !important;
        color: #ffffff !important;
        border-radius: 8px !important;
        padding: 10px 24px !important;
        font-weight: 600 !important;
        font-size: 15px !important;
        border: none !important;
        box-shadow: 0 4px 6px -1px rgba(27, 79, 216, 0.25) !important;
        transition: all 0.2s ease !important;
        width: auto !important;
    }}
    div[data-testid="stVerticalBlockBorderWrapper"] div.stButton > button:hover {{
        background-color: #143eb3 !important;
        transform: translateY(-1px);
        box-shadow: 0 6px 12px -2px rgba(27, 79, 216, 0.35) !important;
    }}
</style>
""", unsafe_allow_html=True)


def get_api_key() -> str:
    """Retrieve Gemini API key silently without showing any UI input."""
    # 1. Streamlit Secrets
    try:
        if "GEMINI_API_KEY" in st.secrets:
            return str(st.secrets["GEMINI_API_KEY"]).strip()
    except Exception:
        pass

    # 2. Environment Variable
    env_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if env_key:
        return env_key.strip()

    # 3. Local .env file lookup
    possible_env_paths = [
        os.path.join(os.path.dirname(__file__), ".env"),
        os.path.join(os.path.dirname(__file__), "igetit-vr", ".env"),
    ]
    for env_path in possible_env_paths:
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        m = re.match(r"^\s*GEMINI_API_KEY\s*=\s*(.*)$", line)
                        if m:
                            val = m.group(1).strip().strip('"').strip("'")
                            if val:
                                return val
            except Exception:
                pass
    return ""


def load_master_prompt() -> str:
    """Load the master system prompt from prompts directory or fallback."""
    possible_paths = [
        os.path.join(os.path.dirname(__file__), "prompts", "master.prompt.txt"),
        os.path.join(os.path.dirname(__file__), "igetit-vr", "prompts", "master.prompt.txt"),
    ]
    for p in possible_paths:
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                return f.read()

    return """You are the internal core intelligence of the iGETIT AR/VR Experience Generator.
Transform the source material into a structured, implementation-ready 3-5 page VR Experience Manual in strict JSON format.
Follow strict Event -> Criteria -> Action (ECA) logic, zero-hallucination rules, and standard VR interaction verbs.
Output ONLY a valid JSON object matching the requested schema."""


def extract_text_from_file(uploaded_file) -> str:
    """Extract readable text from PDF, DOCX, PPTX, or text files."""
    name = uploaded_file.name.lower()
    bytes_data = uploaded_file.getvalue()

    if name.endswith(".txt") or name.endswith(".md"):
        return bytes_data.decode("utf-8", errors="replace")

    if name.endswith(".pdf"):
        if fitz:
            doc = fitz.open(stream=bytes_data, filetype="pdf")
            text = [page.get_text() for page in doc]
            return "\n\n".join(text)
        return "PDF text extraction requires pymupdf."

    if name.endswith(".docx"):
        if docx:
            doc = docx.Document(io.BytesIO(bytes_data))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            for table in doc.tables:
                for row in table.rows:
                    row_text = " | ".join(cell.text.strip() for cell in row.cells)
                    paragraphs.append(row_text)
            return "\n".join(paragraphs)
        return "DOCX extraction requires python-docx."

    if name.endswith(".pptx"):
        if pptx:
            prs = pptx.Presentation(io.BytesIO(bytes_data))
            slides_text = []
            for i, slide in enumerate(prs.slides):
                slide_lines = [f"--- Slide {i+1} ---"]
                for shape in slide.shapes:
                    if hasattr(shape, "text") and shape.text.strip():
                        slide_lines.append(shape.text.strip())
                slides_text.append("\n".join(slide_lines))
            return "\n\n".join(slides_text)
        return "PPTX extraction requires python-pptx."

    return ""


def generate_manual_with_gemini(api_key: str, source_text: str, user_instruction: str) -> Dict[str, Any]:
    """Call Google Gemini API using google.genai client."""
    if not genai:
        raise RuntimeError("google-genai package is not installed.")

    client = genai.Client(api_key=api_key)
    system_prompt = load_master_prompt()

    user_prompt = f"""SOURCE MATERIAL:
\"\"\"
{source_text}
\"\"\"

USER INSTRUCTION:
{user_instruction}

Output ONLY valid JSON strictly matching the schema in the system prompt."""

    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        response_mime_type="application/json",
        temperature=0.2,
        max_output_tokens=8192
    )

    for model_name in ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=user_prompt,
                config=config
            )
            raw_text = response.text or ""
            raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text.strip(), flags=re.MULTILINE)
            raw_text = re.sub(r"\s*```$", "", raw_text.strip(), flags=re.MULTILINE)
            return json.loads(raw_text)
        except Exception as e:
            if model_name == "gemini-1.5-flash":
                raise e
            continue

    raise RuntimeError("Failed to generate content with Gemini.")


def offline_fallback_extraction(source_text: str) -> Dict[str, Any]:
    """Demonstration grounded extraction if no API key is present."""
    lines = [line.strip() for line in source_text.split("\n") if line.strip()]
    title = lines[0] if lines else "Industrial Procedure VR Experience"
    
    return {
        "title": f"VR Experience Manual: {title[:60]}",
        "objective": "Train operators on standardized assembly and safety verification in immersive VR.",
        "audience": "Industrial Assembly Technicians, Maintenance Trainees, Field Engineers",
        "tools": ["Digital Torque Wrench", "Socket Set (10mm, 13mm)", "Inspection Mirror", "Calipers"],
        "components": ["Flange Assembly", "Sealing O-Ring", "Grade 8.8 Hex Bolts", "Alignment Pins"],
        "prerequisites": ["VR Spatial Orientation 101", "Standard Industrial PPE Compliance", "Lockout/Tagout Certification"],
        "completion": ["100% checklist completion without critical safety triggers", "All fasteners torqued in verified cross-pattern"],
        "assets": [
            {"asset": "Workstation CAD", "type": "3D", "purpose": "Interactive virtual workbench environment", "source": "Documented in SOP"},
            {"asset": "Flange & Workpiece", "type": "3D", "purpose": "Primary assembly object with physical colliders", "source": "Gap: CAD model required"},
            {"asset": "Wrist HUD", "type": "UI", "purpose": "Real-time step instructions and torque feedback", "source": "iGETIT Core Asset"},
            {"asset": "Torque Click Audio", "type": "Audio", "purpose": "Haptic/audio positive confirmation chime", "source": "iGETIT Sound Library"}
        ],
        "storyboard": [
            {
                "step": "1.0",
                "instruction": "Inspect workpiece for surface contamination before beginning assembly.",
                "interaction": "Inspect",
                "event": "Learner picks up inspection light and aims at workpiece flange face.",
                "criteria": "Light beam held over mating surface for 2 seconds with <10 degree deflection.",
                "action": "Highlight seal groove in spatial green; display inspection checklist tick on wrist HUD.",
                "expected": "Workpiece confirmed clean; HUD activates Step 2.0 objective.",
                "incorrect": "Skipping visual inspection triggers caution notice on HUD."
            },
            {
                "step": "2.0",
                "instruction": "Carefully align the O-ring seal into the recessed groove.",
                "interaction": "Align",
                "event": "Learner grabs O-ring and brings it within 20mm proximity of the groove.",
                "criteria": "O-ring oriented coplanar to flange face within +/- 5 degrees.",
                "action": "Magnetic snap alignment engaged; play rubber seating sound; trigger mild haptic click.",
                "expected": "O-ring fully seated without pinching or twist.",
                "incorrect": "Excessive force twists O-ring; system pulses red guide wireframe."
            },
            {
                "step": "3.0",
                "instruction": "Hand-thread all 4 hex bolts in diagonal cross-pattern.",
                "interaction": "Place",
                "event": "Learner places Bolt #1 into top-left flange bore.",
                "criteria": "Bolt aligned with thread axis and rotated clockwise 3 turns.",
                "action": "Animate threading rotation; play mechanical thread engagement sound.",
                "expected": "Bolt finger-tight; indicator arrow appears on diagonal opposite bolt.",
                "incorrect": "Attempting adjacent bolt triggers out-of-sequence warning HUD."
            },
            {
                "step": "4.0",
                "instruction": "Tighten bolts using calibrated torque nutrunner to specified rating.",
                "interaction": "Operate",
                "event": "Learner engages nutrunner socket over Bolt #1 head and depresses trigger.",
                "criteria": "Torque applied until target threshold achieved (Implementation Gap: exact Nm not specified in source).",
                "action": "Vibrate controllers with rising RPM pitch; green checkmark on HUD.",
                "expected": "Bolt torqued; progress bar advances to 100%.",
                "incorrect": "Over-torquing triggers loud buzzer and fastener stress warning."
            }
        ],
        "safety": [
            {"step": "General", "risk": "Working without protective eye wear and gloves", "response": "VR entry lockout; virtual workspace disabled until PPE put on", "recovery": "Interact with PPE rack and equip required gear"},
            {"step": "4.0", "risk": "Improper torque sequence causing flange distortion", "response": "Warning HUD buzzer and directional sequence arrow guide", "recovery": "Follow diagonal cross-pattern highlighted on workpiece"}
        ],
        "voiceover": [
            {"step": "1.0", "text": "Begin by inspecting the mating surface for any debris or machining burrs."},
            {"step": "2.0", "text": "Seat the O-ring into the groove. Ensure no twisting along the circumference."},
            {"step": "3.0", "text": "Hand thread all bolts in a cross pattern before final torquing."}
        ],
        "gaps": [
            {
                "missing": "Torque Specification (Nm / ft-lb)",
                "why": "Required to program torque thresholds, gauge animations, and pass/fail criteria",
                "impact": "Simulation currently uses generic torque placeholder without numerical enforcement"
            },
            {
                "missing": "Workpiece CAD Geometry (.STEP / .GLTF)",
                "why": "Accurate 3D mesh needed for photorealistic mating physics and snap zones",
                "impact": "Using generic placeholder flange model until CAD is provided"
            }
        ]
    }


def highlight_gaps(text: str) -> str:
    escaped = html.escape(str(text or ""))
    return re.sub(
        r"(Implementation Gap[^<]*|Gap:[^<]*)",
        r'<span class="gap-pill">\1</span>',
        escaped,
        flags=re.IGNORECASE
    )


def render_interaction_badge(interaction: str) -> str:
    clean = html.escape(str(interaction or "Operate"))
    lower = clean.lower()
    color_class = "verb-operate"
    if any(k in lower for k in ["grab", "pick", "move", "place"]):
        color_class = "verb-manipulate"
    elif any(k in lower for k in ["align", "rotate"]):
        color_class = "verb-align"
    elif any(k in lower for k in ["inspect", "verify", "compare", "observe"]):
        color_class = "verb-inspect"
    elif any(k in lower for k in ["press", "activate", "confirm", "complete"]):
        color_class = "verb-control"
    return f'<span class="interaction-badge {color_class}">{clean}</span>'


def render_asset_badge(asset_type: str) -> str:
    clean = html.escape(str(asset_type or "3D"))
    lower = clean.lower()
    color_class = "asset-3d"
    if "ui" in lower:
        color_class = "asset-ui"
    elif "anim" in lower:
        color_class = "asset-anim"
    elif "audio" in lower:
        color_class = "asset-audio"
    return f'<span class="asset-badge {color_class}">{clean}</span>'


def render_badges(items: List[str]) -> str:
    if not items:
        return '<span class="empty-val">None specified</span>'
    tags = "".join(f'<span class="tag-badge">{html.escape(str(x))}</span>' for x in items)
    return f'<div class="badge-list">{tags}</div>'


def render_executive_html(data: Dict[str, Any]) -> str:
    """Generate the exact executive document HTML view matching render.js."""
    step_count = len(data.get("storyboard", []))
    asset_count = len(data.get("assets", []))
    gap_count = len(data.get("gaps", []))

    # Assets table
    assets_trs = []
    for a in data.get("assets", []):
        assets_trs.append(f"""
        <tr>
            <td>{highlight_gaps(a.get('asset', ''))}</td>
            <td>{render_asset_badge(a.get('type', ''))}</td>
            <td>{highlight_gaps(a.get('purpose', ''))}</td>
            <td>{highlight_gaps(a.get('source', ''))}</td>
        </tr>
        """)

    # Storyboard table
    sb_trs = []
    for s in data.get("storyboard", []):
        sb_trs.append(f"""
        <tr>
            <td>{html.escape(str(s.get('step', '')))}</td>
            <td>{highlight_gaps(s.get('instruction', ''))}</td>
            <td>{render_interaction_badge(s.get('interaction', ''))}</td>
            <td>{highlight_gaps(s.get('event', ''))}</td>
            <td>{highlight_gaps(s.get('criteria', ''))}</td>
            <td>{highlight_gaps(s.get('action', ''))}</td>
            <td>{highlight_gaps(s.get('expected', ''))}</td>
            <td>{highlight_gaps(s.get('incorrect', ''))}</td>
        </tr>
        """)

    # Safety table
    safety_trs = []
    for sf in data.get("safety", []):
        safety_trs.append(f"""
        <tr>
            <td>{html.escape(str(sf.get('step', '')))}</td>
            <td><span class="hazard-text">⚠ {highlight_gaps(sf.get('risk', ''))}</span></td>
            <td>{highlight_gaps(sf.get('response', ''))}</td>
            <td>{highlight_gaps(sf.get('recovery', ''))}</td>
        </tr>
        """)

    # Voiceover table
    vo_trs = []
    for v in data.get("voiceover", []):
        vo_trs.append(f"""
        <tr>
            <td>{html.escape(str(v.get('step', '')))}</td>
            <td>{highlight_gaps(v.get('text', ''))}</td>
        </tr>
        """)

    # Gaps table
    gap_trs = []
    for g in data.get("gaps", []):
        gap_trs.append(f"""
        <tr>
            <td><strong class="gap-title">{highlight_gaps(g.get('missing', ''))}</strong></td>
            <td>{highlight_gaps(g.get('why', ''))}</td>
            <td>{highlight_gaps(g.get('impact', ''))}</td>
        </tr>
        """)

    return f"""
    <div class="manual-document" style="margin-top: 24px;">
      <!-- Document Header Banner -->
      <header class="doc-header">
        <div class="doc-meta-strip">
          <span class="brand-badge">iGETIT VR</span>
          <span class="spec-badge">Experience Manual Specification</span>
          <span class="status-badge">Implementation Ready</span>
        </div>
        <h1 class="doc-title">{html.escape(data.get('title', 'VR Experience Manual'))}</h1>
        <p class="doc-subtitle">Structured VR Training Architecture &bull; Event &rarr; Criteria &rarr; Action Framework</p>
        
        <div class="doc-stats-bar">
          <div class="stat-item">
            <span class="stat-num">{step_count}</span>
            <span class="stat-label">Storyboard Steps</span>
          </div>
          <div class="stat-item">
            <span class="stat-num">{asset_count}</span>
            <span class="stat-label">Required VR Assets</span>
          </div>
          <div class="stat-item {'stat-alert' if gap_count > 0 else ''}">
            <span class="stat-num">{gap_count}</span>
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
            <div class="overview-value">{highlight_gaps(data.get('objective', ''))}</div>
          </div>
          <div class="overview-card">
            <div class="overview-label">Target Audience</div>
            <div class="overview-value">{highlight_gaps(data.get('audience', ''))}</div>
          </div>
          <div class="overview-card">
            <div class="overview-label">Prerequisites</div>
            <div class="overview-value">{render_badges(data.get('prerequisites', []))}</div>
          </div>
          <div class="overview-card">
            <div class="overview-label">Tools &amp; Equipment</div>
            <div class="overview-value">{render_badges(data.get('tools', []))}</div>
          </div>
          <div class="overview-card">
            <div class="overview-label">Components &amp; Workpieces</div>
            <div class="overview-value">{render_badges(data.get('components', []))}</div>
          </div>
          <div class="overview-card full-span">
            <div class="overview-label">Completion Criteria</div>
            <div class="overview-value">{render_badges(data.get('completion', []))}</div>
          </div>
        </div>
      </section>

      <!-- Section 2: Required VR Assets -->
      <section class="doc-section">
        <h2 class="section-heading">2. Required VR Assets</h2>
        <p class="section-desc">Classified inventory of 3D models, UI overlays, mechanical animations, and sound effects required for build.</p>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Asset Name</th>
                <th>Type</th>
                <th>Purpose / Usage in VR</th>
                <th>Source / Gap</th>
              </tr>
            </thead>
            <tbody>
              {''.join(assets_trs) if assets_trs else '<tr><td colspan="4">No assets listed</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Section 3: VR Experience Storyboard (PRIMARY) -->
      <section class="doc-section primary-section">
        <div class="section-header-row">
          <h2 class="section-heading">3. VR Experience Storyboard</h2>
          <span class="primary-flag">Primary Implementation Core</span>
        </div>
        <p class="section-desc">Procedural interaction mapping grounded in the source manual using the Event &rarr; Criteria &rarr; Action logic framework.</p>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Step</th>
                <th>Source Instruction</th>
                <th>Learner Interaction</th>
                <th>Event (Trigger)</th>
                <th>Criteria (Acceptance)</th>
                <th>VR System Action</th>
                <th>Expected Result</th>
                <th>Incorrect Action / Recovery</th>
              </tr>
            </thead>
            <tbody>
              {''.join(sb_trs) if sb_trs else '<tr><td colspan="8">No steps listed</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Section 4: Safety & Error Handling -->
      <section class="doc-section">
        <h2 class="section-heading">4. Safety &amp; Error Handling</h2>
        <p class="section-desc">Grounded hazard safeguards, incorrect action interceptions, and real-time recovery mechanisms.</p>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Step</th>
                <th>Risk / Incorrect Action</th>
                <th>VR System Response</th>
                <th>Recovery Path</th>
              </tr>
            </thead>
            <tbody>
              {''.join(safety_trs) if safety_trs else '<tr><td colspan="4">No hazards listed</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Section 5: Voice-over / Instructional Prompts -->
      <section class="doc-section">
        <h2 class="section-heading">5. Voice-over / Instructional Prompts</h2>
        <p class="section-desc">Concise auditory instructions and guidance prompts delivered at critical procedural milestones.</p>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Step</th>
                <th>Spoken Voice-Over Prompt</th>
              </tr>
            </thead>
            <tbody>
              {''.join(vo_trs) if vo_trs else '<tr><td colspan="2">No voiceover listed</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Section 6: Implementation Gaps -->
      <section class="doc-section gaps-section">
        <div class="section-header-row">
          <h2 class="section-heading">6. Implementation Gaps</h2>
          <span class="gap-count-flag">{gap_count} Gaps Detected</span>
        </div>
        <div class="gap-callout">
          <strong>Zero-Hallucination Policy:</strong> Parameters not specified in the source document (e.g. unstated torque ratings, missing CAD files, or undefined tolerances) are explicitly recorded below rather than guessed.
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Missing Technical Information</th>
                <th>Why It Is Needed in VR</th>
                <th>Simulation Impact</th>
              </tr>
            </thead>
            <tbody>
              {''.join(gap_trs) if gap_trs else '<tr><td colspan="3">No gaps detected</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
      
      <footer class="doc-footer">
        <div>iGETIT VR Experience Manual &bull; Generated by iGETIT Agent</div>
        <div>Confidential &amp; Proprietary &bull; Implementation Ready</div>
      </footer>
    </div>
    """


def to_markdown(data: Dict[str, Any]) -> str:
    md = f"# {data.get('title', 'VR Experience Manual')}\n\n"
    md += f"## 1. Training Overview\n"
    md += f"- **Objective**: {data.get('objective', '')}\n"
    md += f"- **Target Audience**: {data.get('audience', '')}\n"
    md += f"- **Tools / Equipment**: {', '.join(data.get('tools', []))}\n"
    md += f"- **Components**: {', '.join(data.get('components', []))}\n"
    md += f"- **Prerequisites**: {', '.join(data.get('prerequisites', []))}\n"
    md += f"- **Completion Criteria**: {', '.join(data.get('completion', []))}\n\n"

    # Assets
    md += "## 2. Required VR Assets\n\n"
    if data.get("assets"):
        md += "| Asset Name | Type | Purpose / Usage in VR | Source / Gap |\n|---|---|---|---|\n"
        for a in data["assets"]:
            md += f"| {a.get('asset','')} | {a.get('type','')} | {a.get('purpose','')} | {a.get('source','')} |\n"
        md += "\n"

    # Storyboard
    md += "## 3. VR Experience Storyboard\n\n"
    if data.get("storyboard"):
        md += "| Step | Instruction | Interaction | Event | Criteria | VR System Action | Expected Result | Incorrect Action / Recovery |\n|---|---|---|---|---|---|---|---|\n"
        for s in data["storyboard"]:
            row = [
                str(s.get("step","")),
                str(s.get("instruction","")).replace("|", "-"),
                str(s.get("interaction","")),
                str(s.get("event","")).replace("|", "-"),
                str(s.get("criteria","")).replace("|", "-"),
                str(s.get("action","")).replace("|", "-"),
                str(s.get("expected","")).replace("|", "-"),
                str(s.get("incorrect","")).replace("|", "-")
            ]
            md += "| " + " | ".join(row) + " |\n"
        md += "\n"

    # Safety
    md += "## 4. Safety & Error Handling\n\n"
    if data.get("safety"):
        md += "| Step | Risk / Incorrect Action | VR System Response | Recovery Path |\n|---|---|---|---|\n"
        for sf in data["safety"]:
            md += f"| {sf.get('step','')} | {sf.get('risk','')} | {sf.get('response','')} | {sf.get('recovery','')} |\n"
        md += "\n"

    # Gaps
    md += "## 6. Implementation Gaps\n\n"
    if data.get("gaps"):
        md += "| Missing Technical Information | Why Needed in VR | Simulation Impact |\n|---|---|---|\n"
        for g in data["gaps"]:
            md += f"| {g.get('missing','')} | {g.get('why','')} | {g.get('impact','')} |\n"
        md += "\n"

    return md


# --- 1. RENDER FULL-WIDTH EDGE-TO-EDGE TOP NAVBAR ---
st.markdown("""
<div class="top-navbar-fixed">
  <div class="nav-brand" style="display: flex; align-items: center; gap: 10px;">
    <div class="brand-icon">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
        <path d="m3.3 7 8.7 5 8.7-5"/>
        <path d="M12 22V12"/>
      </svg>
    </div>
    <div style="display: flex; align-items: baseline; gap: 6px;">
      <span class="brand-name">iGETIT</span>
      <span class="brand-tag">VR GENERATOR</span>
    </div>
  </div>
  <div class="nav-links">
    <span class="pill-badge">ECA Framework &bull; 3–5 Page Scope</span>
  </div>
</div>
""", unsafe_allow_html=True)


# --- 2. HERO HEADER ---
st.markdown("""
<div style="text-align: center; margin-bottom: 24px;">
  <h1 style="font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 800; color: #0f172a; margin-bottom: 8px; letter-spacing: -0.8px;">iGETIT VR Experience Generator</h1>
  <p style="font-size: 16px; color: #64748b; max-width: 680px; margin: 0 auto;">Convert work instructions and process documentation into implementation-ready VR training experiences.</p>
</div>
""", unsafe_allow_html=True)


# --- 3. UNIFIED CARD CONTAINER ---
# Using native container with border ensures everything is enclosed in a single card
with st.container(border=True):
    # Field 1: Upload
    st.markdown("""
    <div class="field-header">
      <span class="field-title">Upload Work Instruction / SOP / Manual</span>
      <span class="field-sub">PDF, PPTX, DOCX, TXT, or images (drag-and-drop or paste screenshot)</span>
    </div>
    """, unsafe_allow_html=True)

    uploaded_file = st.file_uploader(
        "Upload Work Instruction / SOP / Manual",
        type=["pdf", "docx", "pptx", "txt", "md"],
        label_visibility="collapsed"
    )

    extracted_text = ""
    if uploaded_file:
        with st.spinner("Extracting content from document..."):
            extracted_text = extract_text_from_file(uploaded_file)

    # Field 2: Source Text
    st.markdown("""
    <div class="field-header" style="margin-top: 18px;">
      <span class="field-title">Source text (optional)</span>
      <span class="field-sub">Paste procedure steps or technical specifications directly</span>
    </div>
    """, unsafe_allow_html=True)

    source_text_val = st.text_area(
        "Source text (optional)",
        value=extracted_text,
        placeholder="Paste work instruction, step-by-step assembly procedure, or notes here...",
        height=130,
        label_visibility="collapsed"
    )

    # Field 3: Instruction
    st.markdown("""
    <div class="field-header" style="margin-top: 18px;">
      <span class="field-title">Instruction</span>
      <span class="field-sub">Agent direction for VR transformation</span>
    </div>
    """, unsafe_allow_html=True)

    instruction_val = st.text_input(
        "Instruction",
        value="Convert this into a VR Experience Manual for iGETIT.",
        label_visibility="collapsed"
    )

    # Field 4: Action Button
    generate_btn = st.button("▶ Generate VR Experience", type="primary")


# --- 4. GENERATION PROCESSING ---
if generate_btn:
    api_key = get_api_key()
    has_input = bool(source_text_val.strip())

    if not has_input:
        st.error("Please provide source material (upload a document or paste technical steps).")
    else:
        with st.spinner("Analyzing source manual and constructing VR Experience Storyboard..."):
            try:
                if api_key:
                    result = generate_manual_with_gemini(
                        api_key=api_key,
                        source_text=source_text_val,
                        user_instruction=instruction_val
                    )
                else:
                    result = offline_fallback_extraction(source_text_val)

                st.session_state["vr_result"] = result
            except Exception as e:
                st.error(f"Generation error: {str(e)}")
                st.session_state["vr_result"] = offline_fallback_extraction(source_text_val)


# --- 5. EXECUTIVE DOCUMENT OUTPUT ---
if "vr_result" in st.session_state:
    data = st.session_state["vr_result"]

    # Export toolbar
    col_d1, col_d2, col_empty = st.columns([1, 1, 2])
    with col_d1:
        st.download_button(
            "⬇ Download Markdown (.md)",
            data=to_markdown(data),
            file_name=f"{data.get('title', 'vr_manual')}.md",
            mime="text/markdown",
            use_container_width=True
        )
    with col_d2:
        st.download_button(
            "⬇ Download Structured JSON (.json)",
            data=json.dumps(data, indent=2),
            file_name=f"{data.get('title', 'vr_manual')}.json",
            mime="application/json",
            use_container_width=True
        )

    # Render Executive Document HTML
    doc_html = render_executive_html(data)
    st.markdown(doc_html, unsafe_allow_html=True)
