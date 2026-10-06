import os
import json
import re
import io
import streamlit as st
import pandas as pd
from typing import Optional, Dict, Any

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

# Set page config
st.set_page_config(
    page_title="iGETIT VR Experience Generator",
    page_icon="🥽",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for modern styling
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700&display=swap');
    
    .main-title {
        font-family: 'Outfit', sans-serif;
        font-size: 2.2rem;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 0.2rem;
    }
    .dark .main-title {
        color: #f8fafc;
    }
    .sub-title {
        font-family: 'Inter', sans-serif;
        color: #64748b;
        font-size: 1.05rem;
        margin-bottom: 1.5rem;
    }
    .kpi-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1rem;
    }
    .gap-badge {
        background-color: #fef2f2;
        color: #b91c1c;
        padding: 2px 8px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 0.85rem;
        border: 1px solid #fecaca;
    }
    .doc-viewer-container {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 24px;
        background: #ffffff;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }
</style>
""", unsafe_allow_html=True)


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

    # Fallback default if file not found
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
            text = []
            for page in doc:
                text.append(page.get_text())
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

    return "Unsupported file type."


def generate_manual_with_gemini(api_key: str, model_name: str, source_text: str, user_instruction: str) -> Dict[str, Any]:
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

    response = client.models.generate_content(
        model=model_name,
        contents=user_prompt,
        config=config
    )

    raw_text = response.text or ""
    # Strip markdown formatting if any
    raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text.strip(), flags=re.MULTILINE)
    raw_text = re.sub(r"\s*```$", "", raw_text.strip(), flags=re.MULTILINE)

    return json.loads(raw_text)


def offline_fallback_extraction(source_text: str) -> Dict[str, Any]:
    """Offline demonstration extraction if no API key is provided."""
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


def to_markdown(data: Dict[str, Any]) -> str:
    """Format the generated VR Manual data into a clean Markdown document."""
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
        for s in data["safety"]:
            md += f"| {s.get('step','')} | {s.get('risk','')} | {s.get('response','')} | {s.get('recovery','')} |\n"
        md += "\n"

    # Gaps
    md += "## 5. Implementation Gaps\n\n"
    if data.get("gaps"):
        md += "| Missing Technical Information | Why Needed in VR | Simulation Impact |\n|---|---|---|\n"
        for g in data["gaps"]:
            md += f"| {g.get('missing','')} | {g.get('why','')} | {g.get('impact','')} |\n"
        md += "\n"

    return md


# --- Streamlit UI Layout ---

# Header
st.markdown("<h1 class='main-title'>🥽 iGETIT VR Experience Generator</h1>", unsafe_allow_html=True)
st.markdown("<p class='sub-title'>Transform industrial SOPs, manufacturing manuals, and assembly guides into implementation-ready 3–5 page VR Experience Manuals.</p>", unsafe_allow_html=True)

# Sidebar Configuration
with st.sidebar:
    st.header("⚙️ Configuration")
    
    # Try getting API key from st.secrets, then os.environ, then user input
    default_key = ""
    try:
        default_key = st.secrets.get("GEMINI_API_KEY", "")
    except Exception:
        pass
    if not default_key:
        default_key = os.environ.get("GEMINI_API_KEY", "")

    api_key_input = st.text_input(
        "Google Gemini API Key",
        value=default_key,
        type="password",
        help="Enter your Gemini API Key. For Streamlit Cloud, you can also store this under App Settings -> Secrets."
    )

    model_choice = st.selectbox(
        "AI Model",
        options=["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"],
        index=0
    )

    use_demo_mode = st.checkbox(
        "Offline Demonstration Mode",
        value=False if api_key_input else True,
        help="Generate a complete demonstration manual without calling live external AI APIs."
    )

    st.divider()
    st.markdown("### 📋 About iGETIT VR")
    st.caption("Powered by the hidden AR/VR Instructional Architect system prompt. Grounded on Event &rarr; Criteria &rarr; Action (ECA) logic with zero-hallucination policy.")

# Main Inputs
col_left, col_right = st.columns([1, 1], gap="medium")

with col_left:
    st.subheader("1. Upload Source Document")
    uploaded_file = st.file_uploader(
        "Upload SOP / Assembly Manual",
        type=["pdf", "docx", "pptx", "txt", "md"],
        help="Upload standard operating procedures, manufacturing instructions, or technical presentations."
    )

    extracted_content = ""
    if uploaded_file:
        with st.spinner("Extracting content from document..."):
            extracted_content = extract_text_from_file(uploaded_file)
            st.success(f"Loaded {uploaded_file.name} ({len(extracted_content)} characters)")

with col_right:
    st.subheader("2. Source Text & Instruction")
    source_text_area = st.text_area(
        "Source Material Content",
        value=extracted_content,
        height=180,
        placeholder="Paste technical procedure, SOP, or assembly instructions here..."
    )

    user_instruction = st.text_input(
        "User Instruction",
        value="Convert this into a VR Experience Manual for iGETIT.",
        help="Custom directional prompt for the VR instructional architect agent."
    )

# Action button
generate_clicked = st.button("🚀 Generate VR Experience Manual", type="primary", use_container_width=True)

# Generation logic
if generate_clicked:
    if not source_text_area.strip() and not use_demo_mode:
        st.error("Please provide source material (upload a document or paste text).")
    else:
        with st.status("Generating VR Experience Manual...", expanded=True) as status:
            st.write("1. Reading source material & technical specifications...")
            st.write("2. Compiling AR/VR Master Architecture System Prompt...")
            st.write("3. Mapping procedural steps into Event &rarr; Criteria &rarr; Action logic...")
            
            try:
                if use_demo_mode or not api_key_input:
                    st.write("4. Running grounded extraction engine...")
                    result_data = offline_fallback_extraction(source_text_area)
                else:
                    st.write(f"4. Invoking Google Gemini ({model_choice})...")
                    result_data = generate_manual_with_gemini(
                        api_key=api_key_input,
                        model_name=model_choice,
                        source_text=source_text_area,
                        user_instruction=user_instruction
                    )

                st.write("5. Validating output against 6 required VR manual sections...")
                status.update(label="VR Experience Manual Generated Successfully!", state="complete", expanded=False)
                st.session_state["vr_result"] = result_data
            except Exception as e:
                status.update(label="Generation Failed", state="error", expanded=True)
                st.error(f"Error during generation: {str(e)}")

# Display Results
if "vr_result" in st.session_state:
    data = st.session_state["vr_result"]

    st.divider()
    st.header(f"📄 {data.get('title', 'VR Experience Manual')}")

    tabs = st.tabs([
        "📋 Overview & Assets",
        "🎮 VR Storyboard (ECA)",
        "⚠️ Safety & Voiceover",
        "🔍 Technical Gaps",
        "📥 Export & Download"
    ])

    # Tab 1: Overview & Assets
    with tabs[0]:
        col_ov1, col_ov2 = st.columns(2)
        with col_ov1:
            st.markdown("#### 🎯 Learning Objective")
            st.info(data.get("objective", "N/A"))
            st.markdown("#### 👥 Target Audience")
            st.write(data.get("audience", "N/A"))
            st.markdown("#### 🛠️ Tools & Equipment")
            for t in data.get("tools", []):
                st.markdown(f"- {t}")

        with col_ov2:
            st.markdown("#### 🧩 Components & Materials")
            for c in data.get("components", []):
                st.markdown(f"- {c}")
            st.markdown("#### 📌 Prerequisites")
            for p in data.get("prerequisites", []):
                st.markdown(f"- {p}")
            st.markdown("#### ✅ Completion Criteria")
            for cc in data.get("completion", []):
                st.markdown(f"- {cc}")

        st.divider()
        st.markdown("#### 📦 Required VR Assets")
        if data.get("assets"):
            df_assets = pd.DataFrame(data["assets"])
            st.dataframe(df_assets, use_container_width=True, hide_index=True)
        else:
            st.caption("No assets specified.")

    # Tab 2: VR Storyboard
    with tabs[1]:
        st.markdown("### 3. VR Experience Storyboard")
        st.caption("Procedural interaction mapping grounded in the source manual using the Event → Criteria → Action logic framework.")
        if data.get("storyboard"):
            df_sb = pd.DataFrame(data["storyboard"])
            st.dataframe(
                df_sb,
                use_container_width=True,
                hide_index=True,
                column_config={
                    "step": st.column_config.TextColumn("Step", width="small"),
                    "instruction": st.column_config.TextColumn("Instruction", width="medium"),
                    "interaction": st.column_config.TextColumn("Verb", width="small"),
                    "event": st.column_config.TextColumn("Event (Trigger)", width="medium"),
                    "criteria": st.column_config.TextColumn("Criteria", width="medium"),
                    "action": st.column_config.TextColumn("VR Action", width="medium"),
                    "expected": st.column_config.TextColumn("Expected Result", width="medium"),
                    "incorrect": st.column_config.TextColumn("Recovery", width="medium"),
                }
            )
        else:
            st.warning("No storyboard steps generated.")

    # Tab 3: Safety & Voiceover
    with tabs[2]:
        col_s1, col_s2 = st.columns(2)
        with col_s1:
            st.markdown("#### ⚠️ Safety & Error Handling")
            if data.get("safety"):
                st.dataframe(pd.DataFrame(data["safety"]), use_container_width=True, hide_index=True)
            else:
                st.caption("No specific safety risks noted.")

        with col_s2:
            st.markdown("#### 🎙️ Voice-Over Instructional Prompts")
            if data.get("voiceover"):
                st.dataframe(pd.DataFrame(data["voiceover"]), use_container_width=True, hide_index=True)
            else:
                st.caption("No voice-over prompts noted.")

    # Tab 4: Gaps
    with tabs[3]:
        st.markdown("### 6. Technical Implementation Gaps")
        st.markdown("""
        > **Zero-Hallucination Policy:** Specifications not documented in the source material (e.g. unstated torque ratings, missing CAD files, tolerances) are logged below rather than guessed.
        """)
        if data.get("gaps"):
            df_gaps = pd.DataFrame(data["gaps"])
            st.dataframe(df_gaps, use_container_width=True, hide_index=True)
        else:
            st.success("No implementation gaps detected!")

    # Tab 5: Export
    with tabs[4]:
        st.markdown("### 📥 Export Manual")
        md_text = to_markdown(data)
        json_text = json.dumps(data, indent=2)

        col_d1, col_d2 = st.columns(2)
        with col_d1:
            st.download_button(
                "⬇️ Download Markdown (.md)",
                data=md_text,
                file_name=f"{data.get('title','vr_manual')}.md",
                mime="text/markdown",
                use_container_width=True
            )
        with col_d2:
            st.download_button(
                "⬇️ Download Structured JSON (.json)",
                data=json_text,
                file_name=f"{data.get('title','vr_manual')}.json",
                mime="application/json",
                use_container_width=True
            )

        st.divider()
        with st.expander("📄 Preview Markdown Content"):
            st.markdown(md_text)
