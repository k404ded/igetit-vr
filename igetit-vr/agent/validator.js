/**
 * iGETIT VR Experience Generator - Output Validation & Repair Engine
 * Validates structural integrity, VR quality, ECA logic, safety grounding,
 * hallucination prevention, and conciseness.
 */

const VALID_VR_INTERACTIONS = [
  'Observe', 'Select', 'Grab', 'Pick', 'Move', 'Place', 'Align',
  'Rotate', 'Inspect', 'Press', 'Activate', 'Operate', 'Confirm',
  'Compare', 'Verify', 'Complete'
];

const VALID_ASSET_TYPES = ['3D', 'UI', 'Animation', 'Audio'];

const TOP_LEVEL_ARRAYS = [
  'tools', 'components', 'prerequisites', 'completion',
  'assets', 'storyboard', 'safety', 'voiceover', 'gaps'
];

/**
 * Robust JSON parser that handles codeblocks, leading/trailing prose, and minor malformations.
 */
function parseJSON(raw) {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Empty response from model');
  }

  // Remove markdown code fences if present
  let clean = raw.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }

  // Find outermost JSON object
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('No valid JSON object found in model output');
  }

  let jsonStr = clean.slice(start, end + 1);

  // Attempt standard JSON parse
  try {
    return JSON.parse(jsonStr);
  } catch (e1) {
    // Attempt common repair: remove trailing commas before } or ]
    try {
      const repaired = jsonStr
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/[\u0000-\u001F]+/g, (match) => {
          if (match === '\n' || match === '\r' || match === '\t') return match;
          return '';
        });
      return JSON.parse(repaired);
    } catch (e2) {
      throw new Error(`JSON parse error: ${e1.message}`);
    }
  }
}

/**
 * Map arbitrary verb or string to closest standard VR interaction verb.
 */
function normalizeInteraction(str) {
  if (!str) return 'Operate';
  const trimmed = str.trim();
  const match = VALID_VR_INTERACTIONS.find(
    v => v.toLowerCase() === trimmed.toLowerCase()
  );
  if (match) return match;

  const lower = trimmed.toLowerCase();
  if (lower.includes('grab') || lower.includes('take') || lower.includes('hold') || lower.includes('get')) return 'Grab';
  if (lower.includes('pick') || lower.includes('retrieve')) return 'Pick';
  if (lower.includes('place') || lower.includes('insert') || lower.includes('put') || lower.includes('fit') || lower.includes('attach')) return 'Place';
  if (lower.includes('align') || lower.includes('position') || lower.includes('orient')) return 'Align';
  if (lower.includes('rotate') || lower.includes('turn') || lower.includes('twist') || lower.includes('tighten')) return 'Rotate';
  if (lower.includes('press') || lower.includes('push') || lower.includes('click')) return 'Press';
  if (lower.includes('inspect') || lower.includes('check') || lower.includes('examine') || lower.includes('look')) return 'Inspect';
  if (lower.includes('verify') || lower.includes('validate') || lower.includes('measure')) return 'Verify';
  if (lower.includes('confirm') || lower.includes('acknowledge')) return 'Confirm';
  if (lower.includes('select') || lower.includes('choose')) return 'Select';
  if (lower.includes('observe') || lower.includes('watch') || lower.includes('note')) return 'Observe';
  if (lower.includes('activate') || lower.includes('trigger') || lower.includes('switch')) return 'Activate';
  if (lower.includes('complete') || lower.includes('finish')) return 'Complete';
  
  return 'Operate';
}

/**
 * Normalize asset type to 3D, UI, Animation, or Audio.
 */
function normalizeAssetType(type) {
  if (!type) return '3D';
  const lower = type.toLowerCase().trim();
  if (lower.includes('3d') || lower.includes('mesh') || lower.includes('model') || lower.includes('cad')) return '3D';
  if (lower.includes('ui') || lower.includes('hud') || lower.includes('interface') || lower.includes('button') || lower.includes('label')) return 'UI';
  if (lower.includes('anim') || lower.includes('motion') || lower.includes('movement')) return 'Animation';
  if (lower.includes('audio') || lower.includes('sound') || lower.includes('voice') || lower.includes('sfx')) return 'Audio';
  return '3D';
}

/**
 * Validate and repair the structured output to guarantee production quality.
 */
function validateAndRepair(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Model output must be a JSON object');
  }

  // 1. Title & High-level metadata
  data.title = String(data.title || 'VR Experience Manual').trim();
  data.objective = String(data.objective || 'Complete documented procedure in a virtual reality training simulation.').trim();
  data.audience = String(data.audience || 'Shop floor operators, technicians, and assembly trainees.').trim();

  // 2. Ensure all required top-level arrays exist
  for (const k of TOP_LEVEL_ARRAYS) {
    if (!Array.isArray(data[k])) {
      data[k] = data[k] ? [String(data[k])] : [];
    }
  }

  // Flatten and sanitize string arrays
  data.tools = data.tools.map(s => String(s).trim()).filter(Boolean);
  data.components = data.components.map(s => String(s).trim()).filter(Boolean);
  data.prerequisites = data.prerequisites.map(s => String(s).trim()).filter(Boolean);
  data.completion = data.completion.map(s => String(s).trim()).filter(Boolean);

  // If tools/components are empty, provide fallback
  if (!data.tools.length) data.tools = ['Tools specified in procedure'];
  if (!data.components.length) data.components = ['Workpiece / components specified in procedure'];
  if (!data.prerequisites.length) data.prerequisites = ['Standard PPE and basic VR safety orientation'];
  if (!data.completion.length) data.completion = ['Successful verification of all assembly/inspection steps'];

  // 3. Validate & repair Required VR Assets
  data.assets = data.assets.map((item, idx) => {
    if (typeof item === 'string') {
      return {
        asset: item,
        type: '3D',
        purpose: 'VR procedural object',
        source: 'Documented'
      };
    }
    const asset = String(item.asset || `Asset ${idx + 1}`).trim();
    const type = normalizeAssetType(item.type);
    const purpose = String(item.purpose || 'Interaction element in VR simulation').trim();
    let source = String(item.source || 'Documented').trim();
    if (!source) source = 'Documented';

    return { asset, type, purpose, source };
  }).filter(a => a.asset.length > 0);

  // 4. Validate & repair VR Experience Storyboard
  if (!data.storyboard.length) {
    throw new Error('Validation failed: Storyboard is empty. Source procedure could not be mapped to VR steps.');
  }

  const seenGaps = new Set();

  data.storyboard = data.storyboard.map((step, idx) => {
    const stepNum = String(step.step || (idx + 1).toFixed(1)).trim();
    const instruction = String(step.instruction || step.description || `Step ${stepNum}`).trim();
    const interaction = normalizeInteraction(step.interaction);

    // ECA Logic Verification & Automatic Repair
    let event = String(step.event || '').trim();
    let criteria = String(step.criteria || '').trim();
    let action = String(step.action || '').trim();
    let expected = String(step.expected || step.expected_result || '').trim();
    let incorrect = String(step.incorrect || step.incorrect_action || step.recovery || '').trim();

    // Repair blank ECA fields derived from step context
    if (!event) {
      event = `Learner initiates ${interaction.toLowerCase()} interaction for Step ${stepNum}`;
    }
    if (!criteria) {
      criteria = `Correct object targeted and action executed in alignment with procedure tolerance`;
    }
    if (!action) {
      action = `VR system validates position/orientation, animates interaction, and gives audio/haptic confirmation`;
    }
    if (!expected) {
      expected = `Component state advances to Step ${stepNum} completed condition`;
    }
    if (!incorrect) {
      incorrect = `Incorrect sequence, tool, or placement; VR system displays warning HUD, blocks advance, and provides corrective highlight`;
    }

    // Detect ungrounded / missing value mentions in instruction
    if (/approved torque|specified torque|torque setting|correct gauge|specified pressure/i.test(instruction) &&
        !/\d+\s*(Nm|N-m|ft-lb|in-lb|psi|bar|mm)/i.test(instruction)) {
      seenGaps.add('Specific torque/setting value for Step ' + stepNum);
    }

    return {
      step: stepNum,
      instruction,
      interaction,
      event,
      criteria,
      action,
      expected,
      incorrect
    };
  });

  // 5. Validate & repair Safety & Error Handling
  data.safety = data.safety.map((item, idx) => {
    const step = String(item.step || `Step ${idx + 1}`).trim();
    const risk = String(item.risk || item.hazard || 'Incorrect procedure execution').trim();
    const response = String(item.response || 'System highlights error on HUD and prevents invalid state').trim();
    const recovery = String(item.recovery || 'Follow visual indicator to re-attempt step correctly').trim();
    return { step, risk, response, recovery };
  });

  // If safety is empty, synthesize baseline VR safety requirements from storyboard
  if (!data.safety.length) {
    data.safety.push({
      step: 'General',
      risk: 'Attempting operation without required PPE or in incorrect sequence',
      response: 'VR system sounds warning audio cue, displays HUD alert, and locks interaction zone',
      recovery: 'Equip required PPE and follow step-by-step guidance sequence'
    });
  }

  // 6. Validate & repair Voice-over
  data.voiceover = data.voiceover.map((item, idx) => {
    const step = String(item.step || `Step ${idx + 1}`).trim();
    const text = String(item.text || item.prompt || '').trim();
    return { step, text };
  }).filter(v => v.text.length > 0);

  // If voiceover is empty, generate concise voiceover from primary storyboard steps
  if (!data.voiceover.length) {
    data.voiceover = data.storyboard.slice(0, 8).map(s => ({
      step: s.step,
      text: `${s.instruction.slice(0, 110)}.`
    }));
  }

  // 7. Validate & repair Implementation Gaps
  data.gaps = data.gaps.map(item => {
    const missing = String(item.missing || item.gap || '').trim();
    const why = String(item.why || item.purpose || 'Required for precise VR physics and criteria validation').trim();
    const impact = String(item.impact || 'Cannot strictly enforce criteria check in VR simulation without exact value').trim();
    return { missing, why, impact };
  }).filter(g => g.missing.length > 0);

  // Cross-reference any detected gaps
  for (const gapName of seenGaps) {
    if (!data.gaps.some(g => g.missing.toLowerCase().includes(gapName.toLowerCase()))) {
      data.gaps.push({
        missing: gapName,
        why: 'Required to configure exact trigger thresholds and validation criteria in VR nutrunner/tool logic',
        impact: 'VR system must use generic placeholder tolerance until verified value is provided'
      });
    }
  }

  // Cross-reference assets marked with "Gap:" into gaps table
  data.assets.forEach(a => {
    if (a.source && /gap:/i.test(a.source)) {
      const missingInfo = a.source.replace(/^gap:\s*/i, '').trim() || `${a.asset} CAD/Asset model`;
      if (!data.gaps.some(g => g.missing.toLowerCase() === missingInfo.toLowerCase())) {
        data.gaps.push({
          missing: missingInfo,
          why: `Asset needed for 3D visual rendering of ${a.asset}`,
          impact: 'Placeholder VR asset must be used until production CAD file is supplied'
        });
      }
    }
  });

  return data;
}

module.exports = {
  parseJSON,
  validateAndRepair,
  VALID_VR_INTERACTIONS,
  VALID_ASSET_TYPES
};
