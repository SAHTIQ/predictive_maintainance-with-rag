import {
  FleetOverview,
  Machine,
  RagChatResponse,
  RagDocumentHit,
  RecommendationDecision,
} from '../types';
import { MOCK_FLEET_OVERVIEW, MOCK_MACHINES, MOCK_RECOMMENDATIONS } from './mockData';

interface KnowledgeChunk {
  title: string;
  source_document: string;
  document_type: string;
  section: string;
  component: string;
  failure_type?: string;
  keywords: string[];
  content: string;
}

const KNOWLEDGE_BASE_CHUNKS: KnowledgeChunk[] = [
  {
    title: 'ISO 10816-3 Mechanical Vibration Evaluation Standard',
    source_document: 'data/knowledge_base/specifications/machine_specifications.md',
    document_type: 'specification',
    section: 'Vibration Severity & Temperature Criteria (ISO 10816-3)',
    component: 'fleet_wide',
    keywords: ['iso', '10816', 'vibration', 'threshold', 'limit', 'velocity', 'zone', 'rms', 'alarm', 'trip', 'standard', 'safe', 'tolerance', 'shaking'],
    content:
      'Per ISO 10816-3 industrial vibration standards: Zone A/B (Good Condition, Health State 0): Vibration velocity < 1.1 mm/s RMS (up to 2.3 mm/s for heavy frame spinning looms), casing temperature < 70°C. Zone C (Warning Condition, Health State 1): 1.1–1.8 mm/s RMS (2.3–4.5 mm/s alarm limit for heavy machinery), temperature 70°C–85°C — restricted long-term operation, schedule preventive servicing. Zone D (Critical Condition, Health State 2): > 1.8 mm/s RMS (> 4.5 mm/s alarm / > 7.1 mm/s trip on heavy frames) or temperature > 85°C — severe mechanical damage risk, immediate intervention mandatory.',
  },
  {
    title: 'SOP-MECH-04: Corrective Action for Severe Bearing Degradation (P1/P2)',
    source_document: 'data/knowledge_base/procedures/maintenance_procedures.md',
    document_type: 'procedure',
    section: 'Bearing Replacement Protocol SOP-MECH-04',
    component: 'bearing',
    failure_type: 'bearing_wear',
    keywords: ['sop-mech-04', 'bearing', 'replace', 'replacement', 'disassembly', 'spindle', 'spalling', 'fix', 'repair', 'puller', 'induction', 'p1', 'critical'],
    content:
      'When a machine exhibits Critical Health State or RUL < 24 hours with bearing degradation: 1. Lockout/Tagout (LOTO): Isolate motor drive electrical supply and verify zero mechanical energy. 2. Decouple machine from driver and measure cold shaft runout (< 0.025 mm TIR). 3. Remove bearing housing cap and inspect grease for metallic flakes or thermal oxidation. 4. Extract damaged bearing (e.g., SKF 6205-2RSH/C3 or 6312-2Z) using mechanical puller. 5. Clean shaft journal and micrometer-verify seat diameter. 6. Induction-heat replacement bearing uniformly to 110°C and seat squarely against shaft shoulder. 7. Pack 30%–50% cavity volume with synthetic polyurea/ISO VG 100 grease and torque retention nuts to 85 Nm. 8. Laser-align coupling (< 0.05 mm offset) before restart.',
  },
  {
    title: 'SOP-LUB-02: Bearing Lubrication & Ultrasonic Replenishment Protocol',
    source_document: 'data/knowledge_base/manuals/machine_manuals.md',
    document_type: 'procedure',
    section: 'Lubrication Interval & Thermal Runaway Prevention SOP-LUB-02',
    component: 'lubrication_system',
    failure_type: 'overheating',
    keywords: ['sop-lub-02', 'lubricat', 'grease', 'oil', 'polyurea', 'vg 100', 'replenish', 'ultrasonic', 'starvation', 'friction'],
    content:
      'Standard bearing re-greasing interval is 500 operating hours using synthetic polyurea or ISO VG 100 mineral grease (ISO VG 220/320 synthetic gear oil for TypeC helical gearboxes). Clean grease zerk fittings before injection. Pump grease slowly while monitoring ultrasonic acoustic emission; stop when acoustic dBμV drops to baseline (typically 30%–50% housing cavity fill). Caution: Over-lubrication causes hydraulic churning and rapid thermal runaway above 80°C.',
  },
  {
    title: 'Rolling Element Bearing Failure Stages & Kurtosis/Skewness Diagnostics',
    source_document: 'data/knowledge_base/failure_modes/failure_knowledge.md',
    document_type: 'failure_mode',
    section: 'Rolling Element Fatigue, Spalling & Statistical Moments',
    component: 'bearing',
    failure_type: 'bearing_wear',
    keywords: ['stage', 'kurtosis', 'skewness', 'flaking', 'pitting', 'spalling', 'sub-surface', 'raceway', 'harmonic', 'fft', 'bearing failure'],
    content:
      'Bearing degradation progresses through 4 stages: Stage 1 (Sub-surface micro-fissures): High-frequency ultrasonic stress waves (20–60 kHz); Kurtosis (> 4.0) and positive Skewness rise sharply before overall RMS vibration changes, detecting early sub-surface flaking. Stage 2 (Pitting & incipient spalling): Harmonics appear in 500 Hz–2 kHz band; vibration rises to 0.8–1.2 mm/s. Stage 3 (Discrete raceway spalling): 1X/2X sideband modulation and +10°C to +25°C temperature rise from rolling friction. Stage 4 (Cage fracture & skidding): Overall vibration spikes > 2.0–5.8 mm/s with rapid thermal binding and seizure risk within < 12 hours.',
  },
  {
    title: 'SOP-THERM-02: Motor & Bearing Overheating (> 80°C) Emergency Protocol',
    source_document: 'data/knowledge_base/failure_modes/failure_knowledge.md',
    document_type: 'procedure',
    section: 'Thermal Overload & Cooling Inspection SOP-THERM-02',
    component: 'motor_windings_and_bearings',
    failure_type: 'overheating',
    keywords: ['sop-therm-02', 'overheat', '80', '85', 'temperature', 'thermal', 'hot', 'hottest', 'cooling', 'stator', 'heat', 'seizure'],
    content:
      'When bearing housing or motor stator temperature exceeds 75°C (Warning) or 80°C–85°C (Critical Alarm): 1. Verify cooling fan cowling, air ducts, and heat-exchanger fins are clear of lint/particulate blockage. 2. Check ambient bay ventilation and motor phase current balance (< 2% phase unbalance). 3. Inspect bearing housing for oxidized/varnished grease or over-greasing churning. 4. If temperature exceeds 85°C accompanied by rising vibration (> 4.0 mm/s), initiate controlled load de-rating or P1 shutdown to prevent babbitt/raceway seizure and Class F insulation breakdown.',
  },
  {
    title: 'SOP-ALIGN-02: Precision Shaft Laser Alignment Procedure',
    source_document: 'data/knowledge_base/procedures/maintenance_procedures.md',
    document_type: 'procedure',
    section: 'Laser Alignment Protocol SOP-ALIGN-02',
    component: 'shaft_coupling',
    failure_type: 'misalignment',
    keywords: ['sop-align-02', 'align', 'alignment', 'misalignment', 'axial', 'z-axis', 'coupling', 'laser', 'shim', '2x'],
    content:
      'When elevated axial vibration (Z-axis > 50% of radial vibration) and 2X rotational frequency peaks indicate shaft misalignment: 1. Check and correct soft-foot condition (< 0.05 mm foot lift). 2. Mount dual-head laser alignment units across coupling hubs. 3. Rotate shafts through 180° and record parallel offset and angular deviation. 4. Install precision stainless shims under motor feet and torque hold-down bolts diagonally. 5. Verify final alignment is within < 0.05 mm parallel offset and < 0.03 mm/100 mm angularity.',
  },
  {
    title: 'SOP-MECH-12 & SOP-BELT-04: Dynamic Rotor Balancing & Drive Belt Tensioning',
    source_document: 'data/knowledge_base/procedures/maintenance_procedures.md',
    document_type: 'procedure',
    section: 'Rotor Balancing (SOP-MECH-12) & Belt Tensioning (SOP-BELT-04)',
    component: 'rotor',
    failure_type: 'unbalance',
    keywords: ['sop-mech-12', 'sop-belt-04', 'balance', 'balancing', 'unbalance', 'belt', 'tension', '1x', 'pulley', 'rotor', 'impeller'],
    content:
      'For dominant 1X radial vibration (unbalance) or belt drive flutter: 1. Clean rotor/impeller blades of fiber or cake accumulation. 2. Perform single- or two-plane dynamic balancing with optical tachometer and trial weights until radial vibration drops below 0.8 mm/s (SOP-MECH-12). 3. For belt-driven frames (SOP-BELT-04), measure belt natural span frequency using sonic tension meter, inspect sheaves for groove wear, and align pulleys within 0.5 mm.',
  },
  {
    title: 'SOP-SENS-01: Sensor Cabling & Acoustic Stethoscope Verification',
    source_document: 'data/knowledge_base/specifications/machine_specifications.md',
    document_type: 'procedure',
    section: 'Telemetry Sensor Verification & Acoustic Stethoscope Check SOP-SENS-01',
    component: 'sensors',
    keywords: ['cabling', 'stethoscope', 'acoustic', 'sensor', 'verify', 'cable', 'probe', 'piezo', 'accelerometer'],
    content:
      'To verify whether an elevated vibration reading is a true mechanical fault or sensor artifact: 1. Inspect triaxial piezo-accelerometer mounting stud torque (1.8 Nm) and M12 shielded cabling for oil contamination, insulation chafing, or loose connectors. 2. Place an ultrasonic/acoustic stethoscope probe directly against the drive-end and non-drive-end bearing housings. 3. Smooth hum (< 28 dBμV) confirms healthy lubrication; metallic hiss (35–45 dBμV) indicates grease starvation (apply SOP-LUB-02); rhythmic clicking/knocking (> 48 dBμV) confirms true raceway spalling requiring SOP-MECH-04 bearing replacement.',
  },
  {
    title: 'Case Log 2024-TXM-014: Spindle Bearing Thermal Runaway & Spalling',
    source_document: 'data/knowledge_base/history/historical_case_studies.md',
    document_type: 'case_study',
    section: 'Case Summary TXM-014 & TXM-028',
    component: 'bearing',
    failure_type: 'bearing_wear',
    keywords: ['txm-014', 'txm-028', 'txm-008', 'case', 'history', 'runaway', 'labyrinth', 'seal'],
    content:
      'High-load continuous operation caused outer raceway spalling and grease washout on TXM-014. Vibration climbed rapidly while casing temperature exceeded 84°C and RUL dropped below 9 hours. Emergency P1 shutdown and bearing replacement (SOP-MECH-04) with new labyrinth seal restored vibration to 0.32 mm/s.',
  },
];

function retrieveRelevantDocs(query: string, topK: number = 3): RagDocumentHit[] {
  const qLower = query.toLowerCase();
  const tokens = qLower.split(/[^a-z0-9-]+/).filter((t) => t.length > 2);

  const scored = KNOWLEDGE_BASE_CHUNKS.map((chunk) => {
    let score = 0;
    for (const kw of chunk.keywords) {
      if (qLower.includes(kw)) {
        score += 0.28;
      }
    }
    const hay = `${chunk.title} ${chunk.section} ${chunk.content}`.toLowerCase();
    for (const tok of tokens) {
      if (hay.includes(tok)) {
        score += 0.08;
      }
    }
    const normalized = Math.min(0.98, Math.round(score * 100) / 100);
    return { chunk, score: normalized };
  })
    .filter((item) => item.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  if (scored.length === 0) {
    // Default to ISO 10816 and SOP-MECH-04
    return KNOWLEDGE_BASE_CHUNKS.slice(0, 2).map((c, idx) => ({
      title: c.title,
      source_document: c.source_document,
      document_type: c.document_type,
      section: c.section,
      content: c.content,
      relevance_score: idx === 0 ? 0.88 : 0.82,
      component: c.component,
      failure_type: c.failure_type,
    }));
  }

  return scored.map(({ chunk, score }) => ({
    title: chunk.title,
    source_document: chunk.source_document,
    document_type: chunk.document_type,
    section: chunk.section,
    content: chunk.content,
    relevance_score: Math.max(0.76, score),
    component: chunk.component,
    failure_type: chunk.failure_type,
  }));
}

export interface LocalRagOptions {
  query: string;
  selectedMachineId?: string | null;
  machines?: Machine[];
  recommendations?: RecommendationDecision[];
  overview?: FleetOverview;
}

export function generateLocalRagResponse(opts: LocalRagOptions): RagChatResponse {
  const rawQuery = opts.query.trim();
  const qLower = rawQuery.toLowerCase();

  const machines = opts.machines && opts.machines.length > 0 ? opts.machines : MOCK_MACHINES;
  const recommendations =
    opts.recommendations && opts.recommendations.length > 0 ? opts.recommendations : MOCK_RECOMMENDATIONS;
  const overview = opts.overview && opts.overview.total_machines > 0 ? opts.overview : MOCK_FLEET_OVERVIEW;

  // Detect if query explicitly names a machine like TXM-014
  const machineMatch = rawQuery.match(/\b(TXM-\d{2,4}|M-\d{2,4})\b/i);
  const mentionedMachineId = machineMatch ? machineMatch[1].toUpperCase() : null;
  const activeMachineId = (mentionedMachineId || opts.selectedMachineId || '').trim() || undefined;

  // Look up active machine recommendation and metadata
  const machineRec = activeMachineId
    ? recommendations.find((r) => r.machine_id.toUpperCase() === activeMachineId.toUpperCase())
    : undefined;
  const machineMeta = activeMachineId
    ? machines.find((m) => m.machine_id.toUpperCase() === activeMachineId.toUpperCase())
    : undefined;

  const machineContext =
    activeMachineId && (machineRec || machineMeta)
      ? {
          machine_id: activeMachineId,
          machine_type: machineRec?.machine_type || machineMeta?.machine_type || 'TypeA',
          machine_name: machineMeta?.machine_name || `Industrial Unit ${activeMachineId}`,
          health_score: machineRec?.current_condition?.health_score ?? 84.0,
          health_state: machineRec?.current_condition?.health_state_label ?? 'Good',
          rul_hours: machineRec?.current_condition?.rul_hours ?? 140.0,
          risk_level: machineRec?.risk_assessment?.risk_level ?? 'LOW',
          priority: machineRec?.risk_assessment?.maintenance_priority ?? 'P3',
          temperature: machineRec?.measured_evidence?.temperature ?? 62.0,
          vibration_magnitude: machineRec?.measured_evidence?.vibration_magnitude ?? 1.85,
        }
      : undefined;

  // Sort recommendations by risk/priority for fleet queries
  const sortedByRisk = [...recommendations].sort(
    (a, b) => (b.risk_assessment?.risk_score ?? 0) - (a.risk_assessment?.risk_score ?? 0)
  );
  const criticalAndHigh = sortedByRisk.filter((r) =>
    ['CRITICAL', 'HIGH'].includes(r.risk_assessment?.risk_level || '')
  );
  const citedDocs = retrieveRelevantDocs(rawQuery, 3);

  // 1. GREETING / HELP / INTRODUCTION
  const isGreeting =
    /^(hi|hello|hey|good morning|good afternoon|good evening|greetings|help|start|who are you|what can you do)\b/i.test(
      qLower
    ) || qLower === 'hi' || qLower === 'hello';

  if (isGreeting) {
    const topCrit = criticalAndHigh[0];
    const critCount = criticalAndHigh.length;
    const machineNote = machineContext
      ? `\n- **Focused Asset (${machineContext.machine_id}):** Health **${machineContext.health_score.toFixed(1)}/100** (${machineContext.health_state}) · Risk **${machineContext.risk_level}** · Vibration **${machineContext.vibration_magnitude.toFixed(2)} mm/s** · Temp **${machineContext.temperature.toFixed(1)}°C** · RUL **~${machineContext.rul_hours.toFixed(0)}h**.`
      : '';

    const response =
      `### Hello! Resonex AI Maintenance Copilot Ready\n\n` +
      `I am connected to your plant telemetry, remaining useful life (RUL) predictions, and ISO 10816 / SOP repair manuals.\n\n` +
      `**Current Plant Snapshot (${overview.total_machines} Monitored Units):**\n` +
      `- **Urgent Attention Required:** **${critCount} machines** (${overview.health_states?.Critical ?? 2} Critical P1, ${overview.health_states?.Warning ?? 6} Warning P2/P3).\n` +
      (topCrit
        ? `- **Top Priority Asset:** **${topCrit.machine_id}** — Risk **${topCrit.risk_assessment.risk_level} (${topCrit.risk_assessment.maintenance_priority})**, Health **${topCrit.current_condition.health_score.toFixed(1)}/100**, RUL **~${(topCrit.current_condition.rul_hours ?? 9).toFixed(0)}h**, Vibration **${(topCrit.measured_evidence.vibration_magnitude ?? 5.82).toFixed(2)} mm/s**, Temp **${(topCrit.measured_evidence.temperature ?? 86.4).toFixed(1)}°C**.\n`
        : '') +
      machineNote +
      `\n\n**How can I help you right now?**\n` +
      `- Ask ***"Which machines need attention first?"*** for the shift dispatch plan.\n` +
      `- Ask ***"Summarize the current factory health"*** for fleet KPIs and RUL averages.\n` +
      `- Ask about **ISO 10816 vibration thresholds**, **bearing replacement (SOP-MECH-04)**, **lubrication (SOP-LUB-02)**, or **motor overheating (SOP-THERM-02)**.`;

    return {
      query: rawQuery,
      response,
      machine_id: activeMachineId,
      machine_context: machineContext,
      cited_documents: citedDocs.slice(0, 2),
      suggested_actions: [
        'Which machines need attention first?',
        'Summarize the current factory health.',
        'What are the vibration velocity thresholds under ISO 10816?',
      ],
      confidence: 0.96,
      source: 'Resonex RAG Core',
    };
  }

  // 2. SENSOR CABLING / ACOUSTIC STETHOSCOPE CHECK
  if (
    qLower.includes('cabling') ||
    qLower.includes('stethoscope') ||
    qLower.includes('acoustic') ||
    qLower.includes('verify sensor')
  ) {
    const targetLabel = activeMachineId ? ` for **${activeMachineId}**` : '';
    const response =
      `### Sensor Cabling & Acoustic Stethoscope Verification (${activeMachineId || 'SOP-SENS-01'})\n\n` +
      `Before initiating mechanical teardown${targetLabel}, perform this 3-minute field verification to confirm telemetry integrity and pinpoint bearing wear:\n\n` +
      `1. **Triaxial Accelerometer & Cabling Check:**\n` +
      `   - Verify accelerometer mounting stud torque (**1.8 Nm**) on the bearing housing X/Y/Z pads.\n` +
      `   - Inspect the M12 shielded coaxial connector for coolant/oil ingress, loose locking rings, or cable shield ground loops.\n` +
      `2. **Ultrasonic / Acoustic Stethoscope Probe Test:**\n` +
      `   - Touch the stethoscope probe tip directly to the **Drive-End (DE)** and **Non-Drive-End (NDE)** bearing load zones:\n` +
      `   - **Smooth continuous hum (< 28 dBμV):** Normal grease film — no mechanical fault.\n` +
      `   - **High-frequency metallic hiss (35–45 dBμV):** Early lubrication starvation — replenish synthetic polyurea grease per **SOP-LUB-02**.\n` +
      `   - **Rhythmic clicking / knocking (> 48 dBμV):** Confirmed inner/outer raceway spalling (Stage 3–4) — proceed immediately with **SOP-MECH-04** bearing replacement.`;

    return {
      query: rawQuery,
      response,
      machine_id: activeMachineId,
      machine_context: machineContext,
      cited_documents: retrieveRelevantDocs('sensor cabling acoustic stethoscope SOP-SENS-01 SOP-MECH-04', 2),
      suggested_actions: [
        'How do I replace spindle bearings (SOP-MECH-04)?',
        'What are the steps to lubricate spindle bearings (SOP-LUB-02)?',
        'Which machines need attention first?',
      ],
      confidence: 0.95,
      source: 'Resonex RAG Core',
    };
  }

  // 3. BEARING FAILURE STAGES / KURTOSIS & SKEWNESS
  if (
    qLower.includes('kurtosis') ||
    qLower.includes('skewness') ||
    qLower.includes('failure stage') ||
    qLower.includes('bearing stage') ||
    qLower.includes('flaking')
  ) {
    const response =
      `### Bearing Degradation Stages & Statistical Signal Indicators\n\n` +
      `**How Skewness & Kurtosis Detect Early Sub-Surface Flaking:**\n` +
      `- **Kurtosis** measures the impulsiveness ("peakedness") of the vibration waveform. A healthy Gaussian bearing signal has **Kurtosis ≈ 3.0**. When sub-surface micro-cracks or incipient spalling begin (Stage 1–2), rolling elements strike microscopic pits, generating sharp impulse spikes that push **Kurtosis > 4.5–8.0+** *before* overall RMS vibration velocity rises.\n` +
      `- **Skewness** measures waveform asymmetry. Positive skewness shift indicates unidirectional impact pulses on the loaded raceway.\n\n` +
      `**The 4 Stages of Rolling Element Bearing Failure:**\n` +
      `1. **Stage 1 (Sub-Surface Fatigue):** Ultrasonic stress waves (20–60 kHz) and rising Kurtosis; overall vibration RMS remains normal (< 1.1 mm/s). *Action: Monitor trend & verify lubrication (**SOP-LUB-02**).*\n` +
      `2. **Stage 2 (Micro-Pitting):** Resonance frequencies appear in the **500 Hz–2 kHz** FFT band; RMS vibration reaches **1.1–1.8 mm/s**. *Action: Schedule planned bearing service.*\n` +
      `3. **Stage 3 (Discrete Raceway Spalling):** Audible noise, 1X/2X sidebands, temperature climbs **+10°C to +25°C**. *Action: Execute **SOP-MECH-04** bearing replacement within < 24h.*\n` +
      `4. **Stage 4 (Cage Fracture & Thermal Binding):** Vibration spikes **> 4.5 mm/s**, temperature **> 85°C**, RUL **< 12 hours**. *Action: Immediate P1 Lockout/Tagout shutdown.*`;

    return {
      query: rawQuery,
      response,
      machine_id: activeMachineId,
      machine_context: machineContext,
      cited_documents: retrieveRelevantDocs('bearing failure stages kurtosis skewness spalling SOP-MECH-04', 2),
      suggested_actions: [
        'How do I replace spindle bearings (SOP-MECH-04)?',
        'What are the vibration velocity thresholds under ISO 10816?',
        'Which machines need attention first?',
      ],
      confidence: 0.96,
      source: 'Resonex RAG Core',
    };
  }

  // 4. MOTOR / STATOR OVERHEATING (> 80°C) / THERMAL LIMITS
  if (
    qLower.includes('overheat') ||
    qLower.includes('80°c') ||
    qLower.includes('80c') ||
    qLower.includes('thermal') ||
    qLower.includes('hottest') ||
    qLower.includes('stator') ||
    (qLower.includes('temperature') && !activeMachineId)
  ) {
    const hottest = [...recommendations]
      .sort((a, b) => (b.measured_evidence?.temperature ?? 0) - (a.measured_evidence?.temperature ?? 0))
      .slice(0, 3);
    const hottestLines = hottest
      .map(
        (r, i) =>
          `${i + 1}. **${r.machine_id}** — **${(r.measured_evidence.temperature ?? 0).toFixed(1)}°C** (Vib: **${(r.measured_evidence.vibration_magnitude ?? 0).toFixed(2)} mm/s**, Risk: **${r.risk_assessment.risk_level}**)`
      )
      .join('\n');

    const response =
      `### SOP-THERM-02: Motor & Bearing Overheating Protocol (> 80°C)\n\n` +
      `**Thermal Threshold Criteria:**\n` +
      `- **Nominal Operation:** **55°C – 70°C**\n` +
      `- **Warning Band:** **70°C – 80°C** (Check lubrication viscosity & cooling airflow)\n` +
      `- **Critical Alarm / Trip:** **> 80°C – 85°C** (Immediate risk of grease oxidation, babbitt softening, and bearing seizure)\n\n` +
      `**Step-by-Step Technician Action Plan (SOP-THERM-02):**\n` +
      `1. **Immediate Load & Airflow Check:** Inspect motor fan cowling, cooling ducts, and heat sinks for lint or dust accumulation.\n` +
      `2. **Lubrication Inspection:** Check bearing housing for burnt/oxidized grease or over-greasing churning (relubricate per **SOP-LUB-02**).\n` +
      `3. **Electrical Balance:** Verify 3-phase stator current balance (< 2% deviation) and insulation resistance.\n` +
      `4. **Emergency Shutdown:** If temperature exceeds **85°C** with vibration **> 4.5 mm/s**, execute **P1 Lockout/Tagout** and replace damaged bearings per **SOP-MECH-04**.\n\n` +
      `**Current Hottest Fleet Units:**\n${hottestLines}`;

    return {
      query: rawQuery,
      response,
      machine_id: activeMachineId,
      machine_context: machineContext,
      cited_documents: retrieveRelevantDocs('overheating 80C temperature thermal SOP-THERM-02', 2),
      suggested_actions: [
        `Why is ${hottest[0]?.machine_id || 'TXM-014'} classified as critical?`,
        'How do I replace spindle bearings (SOP-MECH-04)?',
        'What are the steps to lubricate spindle bearings (SOP-LUB-02)?',
      ],
      confidence: 0.95,
      source: 'Resonex RAG Core',
    };
  }

  // 5. ISO 10816 VIBRATION THRESHOLDS / SAFE LIMITS / ANOMALY SENSITIVITY
  if (
    qLower.includes('iso 10816') ||
    qLower.includes('iso-10816') ||
    qLower.includes('vibration threshold') ||
    qLower.includes('vibration limit') ||
    qLower.includes('safe vibration') ||
    qLower.includes('velocity threshold') ||
    qLower.includes('within safe vibration') ||
    qLower.includes('anomaly sensitivity')
  ) {
    const overLimit = recommendations.filter((r) => (r.measured_evidence?.vibration_magnitude ?? 0) >= 3.5);
    const response =
      `### ISO 10816-3 Industrial Vibration Severity Thresholds\n\n` +
      `| Zone | Condition State | Precision Rotors (mm/s RMS) | Heavy Industrial Frames (mm/s RMS) | Operational Action |\n` +
      `| :--- | :--- | :--- | :--- | :--- |\n` +
      `| **Zone A** | Newly Commissioned | **< 0.8 mm/s** | **< 1.8 mm/s** | Unrestricted continuous operation |\n` +
      `| **Zone B** | Good / Acceptable | **0.8 – 1.1 mm/s** | **1.8 – 2.8 mm/s** | Continuous operation permitted |\n` +
      `| **Zone C** | Warning / Alert | **1.1 – 1.8 mm/s** | **2.8 – 4.5 mm/s** | Remedial maintenance required before shift end |\n` +
      `| **Zone D** | Critical / Danger | **> 1.8 mm/s** | **> 4.5 mm/s (7.1 Trip)** | High risk of bearing/shaft damage — P1 intervention |\n\n` +
      `**Current Fleet Compliance:**\n` +
      `- **${machines.length - overLimit.length} of ${machines.length} machines** are operating safely within Zone A/B.\n` +
      `- **${overLimit.length} machines** exceed safe baseline limits (led by **TXM-014** & **TXM-028** at **5.82 mm/s** in Zone D, and **TXM-008** at **4.12 mm/s** in Zone C).`;

    return {
      query: rawQuery,
      response,
      machine_id: activeMachineId,
      machine_context: machineContext,
      cited_documents: retrieveRelevantDocs('ISO 10816 vibration velocity thresholds specification', 2),
      suggested_actions: [
        'Which machines need attention first?',
        'Compare machine vibration levels',
        'How do I replace spindle bearings (SOP-MECH-04)?',
      ],
      confidence: 0.97,
      source: 'Resonex RAG Core',
    };
  }

  // 6. SPECIFIC REPAIR PROCEDURES (BEARING REPLACEMENT, LUBRICATION, ALIGNMENT, BALANCING, BELT)
  if (
    (qLower.includes('sop-mech-04') ||
      qLower.includes('replace') ||
      qLower.includes('disassembly') ||
      qLower.includes('bearing replacement') ||
      qLower.includes('lubricat') ||
      qLower.includes('sop-lub-02') ||
      qLower.includes('grease') ||
      qLower.includes('align') ||
      qLower.includes('sop-align-02') ||
      qLower.includes('balanc') ||
      qLower.includes('belt')) &&
    !qLower.includes('why is')
  ) {
    if (qLower.includes('lubricat') || qLower.includes('sop-lub-02') || qLower.includes('grease')) {
      const response =
        `### SOP-LUB-02: Spindle & Drive Bearing Lubrication Procedure\n\n` +
        `1. **Preparation:** Wipe purge plugs and grease zerk fittings clean with lint-free solvent to prevent particulate contamination.\n` +
        `2. **Lubricant Selection:** Use approved **synthetic polyurea grease** (high-speed spindles) or **ISO VG 100 mineral grease** (TypeA pumps).\n` +
        `3. **Ultrasonic Guided Injection:** Attach ultrasonic grease gun sensor to bearing housing. Pump 2–3 shots slowly while machine runs at nominal RPM.\n` +
        `4. **Fill Volume Limit:** Fill housing cavity **30% to 50% maximum**. Stop immediately once ultrasonic friction levels drop to baseline (< 28 dBμV).\n` +
        `5. **Post-Check:** Monitor bearing temperature for 30 minutes; a temporary +2°C rise is normal during grease purge, but temperatures > 75°C indicate over-packing.`;
      return {
        query: rawQuery,
        response,
        machine_id: activeMachineId,
        machine_context: machineContext,
        cited_documents: retrieveRelevantDocs('SOP-LUB-02 bearing lubrication grease replenishment', 2),
        suggested_actions: [
          'How do I replace spindle bearings (SOP-MECH-04)?',
          'What is the SOP for motor overheating above 80°C?',
          'Which machines need attention first?',
        ],
        confidence: 0.96,
        source: 'Resonex RAG Core',
      };
    }

    if (qLower.includes('align') || qLower.includes('sop-align-02') || qLower.includes('belt') || qLower.includes('balanc')) {
      const response =
        `### Precision Alignment (SOP-ALIGN-02), Rotor Balancing (SOP-MECH-12) & Belt Tensioning (SOP-BELT-04)\n\n` +
        `**1. Shaft Laser Alignment (SOP-ALIGN-02 — for high axial/2X vibration):**\n` +
        `- Check and eliminate soft foot (< 0.05 mm lift).\n` +
        `- Mount dual-head laser transducers across coupling hubs and rotate shafts 180°.\n` +
        `- Shim motor base until parallel offset is **< 0.05 mm** and angularity is **< 0.03 mm/100 mm**.\n\n` +
        `**2. Dynamic In-Situ Rotor Balancing (SOP-MECH-12 — for high 1X radial vibration):**\n` +
        `- Clean rotor/impeller surfaces and attach optical phase reference.\n` +
        `- Perform trial-weight run and bolt permanent correction weights until vibration velocity is **< 0.8 mm/s**.\n\n` +
        `**3. Drive Belt Tensioning (SOP-BELT-04):**\n` +
        `- Verify sheave alignment with laser straightedge (< 0.5 mm) and set belt span harmonic tension with sonic meter.`;
      return {
        query: rawQuery,
        response,
        machine_id: activeMachineId,
        machine_context: machineContext,
        cited_documents: retrieveRelevantDocs('SOP-ALIGN-02 laser alignment SOP-MECH-12 rotor balancing belt', 2),
        suggested_actions: [
          'How do I replace spindle bearings (SOP-MECH-04)?',
          'What are the vibration velocity thresholds under ISO 10816?',
          'Which machines need attention first?',
        ],
        confidence: 0.95,
        source: 'Resonex RAG Core',
      };
    }

    // Default to SOP-MECH-04 Bearing Replacement
    const response =
      `### SOP-MECH-04: Spindle & Drive Bearing Replacement Procedure\n\n` +
      `Execute this procedure when a machine is in **Critical State (Health < 50)**, **RUL < 24 hours**, or **Vibration > 4.5 mm/s**:\n\n` +
      `1. **Lockout/Tagout (LOTO):** Isolate main breaker, lock disconnect switch, and verify zero rotational and pneumatic energy.\n` +
      `2. **Baseline Runout Check:** Decouple drive assembly and record cold shaft runout with dial indicator (must be **< 0.025 mm TIR**).\n` +
      `3. **Bearing Extraction:** Remove housing cap, inspect old grease for metallic spall flakes, and extract damaged bearing using a hydraulic/mechanical puller.\n` +
      `4. **Journal Inspection:** Clean shaft journal with solvent and micrometer-check seat diameter for fretting wear.\n` +
      `5. **Induction Mounting:** Heat replacement bearing (**SKF 6205-2RSH/C3** or **6312-2Z**) uniformly to **110°C** on an induction heater and seat flush against shaft shoulder.\n` +
      `6. **Lubrication & Torque:** Pack **30%–50% cavity volume** with synthetic polyurea grease, install new labyrinth seals, and torque locknuts to **85 Nm**.\n` +
      `7. **Commissioning Run:** Re-align coupling (**SOP-ALIGN-02**) and verify post-restart vibration is **< 1.1 mm/s RMS**.`;

    return {
      query: rawQuery,
      response,
      machine_id: activeMachineId,
      machine_context: machineContext,
      cited_documents: retrieveRelevantDocs('SOP-MECH-04 bearing replacement disassembly procedure', 2),
      suggested_actions: [
        'What are the steps to lubricate spindle bearings (SOP-LUB-02)?',
        'Verify sensor cabling and run acoustic stethoscope check',
        'Which machines need attention first?',
      ],
      confidence: 0.97,
      source: 'Resonex RAG Core',
    };
  }

  // 7. MACHINE-SPECIFIC DIAGNOSTICS (when a machine is selected or mentioned)
  if (machineContext && machineRec) {
    const mid = machineContext.machine_id;
    const cond = machineRec.current_condition;
    const risk = machineRec.risk_assessment;
    const meas = machineRec.measured_evidence;
    const expl = machineRec.generated_explanation;
    const causes = expl?.potential_causes?.length
      ? expl.potential_causes.map((c: any) => (typeof c === 'string' ? c : c.cause)).join(', ')
      : 'Inner raceway fatigue spalling and boundary lubrication thinning';
    const actionsList = expl?.recommended_actions?.length
      ? expl.recommended_actions
          .map((a: any, i: number) => `${i + 1}. ${typeof a === 'string' ? a : a.action}`)
          .join('\n')
      : `1. Inspect bearing housing and verify lubrication per **SOP-LUB-02**.\n2. Execute bearing replacement per **SOP-MECH-04** if vibration exceeds threshold.`;

    if (qLower.includes('vibration') || qLower.includes('shaking') || qLower.includes('trend')) {
      const zone =
        (meas.vibration_magnitude ?? 0) >= 4.5
          ? 'Zone D (Critical Damage Risk)'
          : (meas.vibration_magnitude ?? 0) >= 2.8
          ? 'Zone C (Restricted / Warning)'
          : 'Zone A/B (Nominal Operation)';
      const response =
        `### Vibration & Spectral Analysis for ${mid} (${machineContext.machine_name})\n\n` +
        `- **Overall Vibration Magnitude:** **${(meas.vibration_magnitude ?? 0).toFixed(2)} mm/s RMS** — **ISO 10816-3 ${zone}**\n` +
        `- **Triaxial Breakdown:** X-Axis (Horizontal): **${(meas.vibration_x ?? 0).toFixed(2)} mm/s** · Y-Axis (Vertical): **${(meas.vibration_y ?? 0).toFixed(2)} mm/s** · Z-Axis (Axial): **${(meas.vibration_z ?? 0).toFixed(2)} mm/s**\n` +
        `- **Degradation Trajectory:** **${cond.degradation_status}** (Slope: **${(cond.degradation_rate ?? 0.01).toFixed(3)}/hr**)\n` +
        `- **Coincident Bearing Temp:** **${(meas.temperature ?? 0).toFixed(1)}°C** at **${meas.rotational_speed ?? 1480} RPM** (${meas.load_percent ?? 85}% load)\n\n` +
        `**Engineering Assessment:**\n` +
        `${expl?.condition_summary || ' Telemetry tracked continuously against baseline.'}\n\n` +
        `**Recommended Actions:**\n${actionsList}`;

      return {
        query: rawQuery,
        response,
        machine_id: mid,
        machine_context: machineContext,
        cited_documents: citedDocs,
        suggested_actions: [
          `Why is ${mid} classified as ${risk.risk_level.toLowerCase()}?`,
          `How many hours left for ${mid}?`,
          'How do I replace spindle bearings (SOP-MECH-04)?',
        ],
        confidence: 0.96,
        source: 'Resonex RAG Core',
      };
    }

    if (qLower.includes('hour') || qLower.includes('rul') || qLower.includes('time left')) {
      const response =
        `### Remaining Useful Life (RUL) Projection for ${mid}\n\n` +
        `- **Estimated Hours Left (RUL):** **~${(cond.rul_hours ?? 0).toFixed(1)} operating hours**\n` +
        `- **Maintenance Window:** **${risk.maintenance_time_window || '< 24 Hours'}** (Priority **${risk.maintenance_priority}**)\n` +
        `- **Current Health Score:** **${cond.health_score.toFixed(1)} / 100** (${cond.health_state_label})\n` +
        `- **Degradation Rate:** **${cond.degradation_status}** (${(cond.degradation_rate ?? 0.01).toFixed(3)} health pts/hr)\n\n` +
        `**Scheduling Guidance:**\n` +
        `${
          (cond.rul_hours ?? 100) < 24
            ? `**Urgent:** ${mid} has less than 24 hours of safe operating life remaining. Schedule P1 shutdown before end of current shift per **SOP-MECH-04**.`
            : `${mid} has sufficient RUL margin (${(cond.rul_hours ?? 100).toFixed(0)}h) for planned preventive servicing at the next scheduled maintenance window.`
        }`;

      return {
        query: rawQuery,
        response,
        machine_id: mid,
        machine_context: machineContext,
        cited_documents: citedDocs,
        suggested_actions: [
          `What evidence supports the warning on ${mid}?`,
          `Explain ${mid}'s vibration trend`,
          'How do I replace spindle bearings (SOP-MECH-04)?',
        ],
        confidence: 0.95,
        source: 'Resonex RAG Core',
      };
    }

    // General / "Why is this machine critical?" / "What evidence supports this warning?" / "How do I fix?"
    const response =
      `### Grounded Diagnostic Assessment: ${mid} (${machineContext.machine_name})\n\n` +
      `**1. Condition & Risk Classification:**\n` +
      `- **Status:** **${cond.health_state_label.toUpperCase()}** (Health Score: **${cond.health_score.toFixed(1)} / 100**)\n` +
      `- **Operational Risk:** **${risk.risk_level}** (Score: **${risk.risk_score.toFixed(1)}/100**, Priority: **${risk.maintenance_priority}**, Window: **${risk.maintenance_time_window}**)\n` +
      `- **Remaining Useful Life (RUL):** **~${(cond.rul_hours ?? 0).toFixed(1)} hours**\n\n` +
      `**2. Supporting Sensor & ML Evidence:**\n` +
      `- **Vibration Velocity:** **${(meas.vibration_magnitude ?? 0).toFixed(2)} mm/s RMS** (X: ${(meas.vibration_x ?? 0).toFixed(2)}, Y: ${(meas.vibration_y ?? 0).toFixed(2)}, Z: ${(meas.vibration_z ?? 0).toFixed(2)} mm/s)\n` +
      `- **Bearing Temperature:** **${(meas.temperature ?? 0).toFixed(1)}°C** | **Load:** **${meas.load_percent ?? 85}%** at **${meas.rotational_speed ?? 1480} RPM**\n` +
      `- **Primary Summary:** ${expl?.condition_summary}\n` +
      `- **Identified Root Causes:** ${causes}\n\n` +
      `**3. Recommended Maintenance Actions (${ (expl as any)?.sop_references?.join(', ') || 'SOP-MECH-04'}):**\n` +
      `${actionsList}`;

    return {
      query: rawQuery,
      response,
      machine_id: mid,
      machine_context: machineContext,
      cited_documents: citedDocs,
      suggested_actions: [
        `Explain ${mid}'s vibration trend`,
        `How many hours left for ${mid}?`,
        'How do I replace spindle bearings (SOP-MECH-04)?',
      ],
      confidence: 0.96,
      source: 'Resonex RAG Core',
    };
  }

  // 8. FLEET-WIDE QUERIES: LOWEST HEALTH / SHORTEST RUL / WEARING OUT FASTEST
  if (
    qLower.includes('lowest health') ||
    qLower.includes('shortest time') ||
    qLower.includes('wearing out') ||
    qLower.includes('average hours') ||
    qLower.includes('hours left across')
  ) {
    const byHealth = [...recommendations]
      .sort((a, b) => (a.current_condition?.health_score ?? 100) - (b.current_condition?.health_score ?? 100))
      .slice(0, 5);
    const listStr = byHealth
      .map(
        (r, i) =>
          `${i + 1}. **${r.machine_id}** (Type ${r.machine_type}) — Health: **${r.current_condition.health_score.toFixed(1)}/100** | RUL: **~${(r.current_condition.rul_hours ?? 0).toFixed(1)}h** | Risk: **${r.risk_assessment.risk_level} (${r.risk_assessment.maintenance_priority})** | Vib: **${(r.measured_evidence.vibration_magnitude ?? 0).toFixed(2)} mm/s** · Temp: **${(r.measured_evidence.temperature ?? 0).toFixed(1)}°C**`
      )
      .join('\n');

    const response =
      `### Fleet Health & Remaining Useful Life (RUL) Ranking\n\n` +
      `- **Fleet Average RUL:** **${overview.average_rul_hours.toFixed(1)} hours**\n` +
      `- **Fleet Average Health Score:** **${overview.average_health_score.toFixed(1)} / 100**\n\n` +
      `**5 Machines with Lowest Health Scores & Shortest RUL:**\n${listStr}\n\n` +
      `**Recommendation:** Prioritize **${byHealth[0]?.machine_id || 'TXM-014'}** and **${byHealth[1]?.machine_id || 'TXM-028'}** immediately (both have **< 10 hours RUL** and require spindle bearing replacement per **SOP-MECH-04**).`;

    return {
      query: rawQuery,
      response,
      cited_documents: citedDocs.slice(0, 2),
      suggested_actions: [
        `Why is ${byHealth[0]?.machine_id || 'TXM-014'} classified as critical?`,
        'How do I replace spindle bearings (SOP-MECH-04)?',
        'Summarize the current factory health.',
      ],
      confidence: 0.96,
      source: 'Resonex RAG Core',
    };
  }

  // 9. FLEET VIBRATION COMPARISON / OVERALL VIBRATION LEVELS
  if (
    qLower.includes('compare machine vibration') ||
    qLower.includes('overall vibration') ||
    qLower.includes('vibration level') ||
    qLower.includes('highest shaking')
  ) {
    const byVib = [...recommendations]
      .sort(
        (a, b) =>
          (b.measured_evidence?.vibration_magnitude ?? 0) - (a.measured_evidence?.vibration_magnitude ?? 0)
      )
      .slice(0, 5);
    const lines = byVib
      .map(
        (r, i) =>
          `${i + 1}. **${r.machine_id}** — **${(r.measured_evidence.vibration_magnitude ?? 0).toFixed(2)} mm/s RMS** (Temp: **${(r.measured_evidence.temperature ?? 0).toFixed(1)}°C**, Health: **${r.current_condition.health_score.toFixed(1)}/100**, Risk: **${r.risk_assessment.risk_level}**)`
      )
      .join('\n');

    const response =
      `### Fleet Vibration Comparison (ISO 10816-3 Assessment)\n\n` +
      `**Top 5 Highest Vibration Assets Across Plant:**\n${lines}\n\n` +
      `**Key Observations:**\n` +
      `- **Zone D Critical (> 4.5 mm/s):** **TXM-014** (**5.82 mm/s**) and **TXM-028** (**5.82 mm/s**) exceed the 4.5 mm/s alarm threshold due to inner raceway bearing spalling.\n` +
      `- **Zone C Warning (2.8–4.5 mm/s):** **TXM-008**, **TXM-022**, and **TXM-040** (**4.12 mm/s**) show elevated friction and require lubrication servicing (**SOP-LUB-02**).\n` +
      `- **Remaining 42 Healthy Units:** Operating in Zone A/B (**1.85–2.65 mm/s**).`;

    return {
      query: rawQuery,
      response,
      cited_documents: retrieveRelevantDocs('ISO 10816 vibration velocity thresholds', 2),
      suggested_actions: [
        `Why is ${byVib[0]?.machine_id || 'TXM-014'} classified as critical?`,
        'What are the vibration velocity thresholds under ISO 10816?',
        'How do I replace spindle bearings (SOP-MECH-04)?',
      ],
      confidence: 0.96,
      source: 'Resonex RAG Core',
    };
  }

  // 10. FACTORY HEALTH SUMMARY / SHIFT REPORT
  if (
    qLower.includes('summarize') ||
    qLower.includes('factory health') ||
    qLower.includes('shift') ||
    qLower.includes('overview') ||
    qLower.includes('current machine risks')
  ) {
    const crit = overview.health_states?.Critical ?? 2;
    const warn = overview.health_states?.Warning ?? 6;
    const good = overview.health_states?.Good ?? 42;
    const response =
      `### Shift Executive Factory Health Summary\n\n` +
      `- **Total Monitored Fleet:** **${overview.total_machines} Industrial Machines**\n` +
      `- **Condition Breakdown:** **${good} Operational (Good)** · **${warn} Warning** · **${crit} Critical**\n` +
      `- **Fleet Average Health Index:** **${overview.average_health_score.toFixed(1)} / 100**\n` +
      `- **Fleet Average RUL:** **${overview.average_rul_hours.toFixed(1)} hours**\n` +
      `- **Units Requiring Maintenance This Shift:** **${overview.machines_requiring_maintenance_count} machines**\n\n` +
      `**Critical Shift Handover Priorities:**\n` +
      `1. **TXM-014 & TXM-028 (P1 Critical — < 12h Window):** Both at **34.2/100 health**, **~9h RUL**, **5.82 mm/s vibration**, and **86.4°C**. Execute spindle bearing replacement (**SOP-MECH-04**).\n` +
      `2. **TXM-008, TXM-022, TXM-040 (P2 High — < 24h Window):** At **58.6/100 health**, **~21h RUL**, **4.12 mm/s vibration**, and **78.2°C**. Perform ultrasonic grease replenishment (**SOP-LUB-02**) and FFT spectral checks.`;

    return {
      query: rawQuery,
      response,
      cited_documents: citedDocs.slice(0, 2),
      suggested_actions: [
        'Which machines need attention first?',
        'Why is TXM-014 classified as critical?',
        'How do I replace spindle bearings (SOP-MECH-04)?',
      ],
      confidence: 0.97,
      source: 'Resonex RAG Core',
    };
  }

  // 11. WHICH MACHINES NEED ATTENTION FIRST / URGENT / CRITICAL / ALERTS / DISPATCH
  if (
    qLower.includes('attention') ||
    qLower.includes('which machine') ||
    qLower.includes('first') ||
    qLower.includes('urgent') ||
    qLower.includes('critical') ||
    qLower.includes('alert') ||
    qLower.includes('priorit') ||
    qLower.includes('repair') ||
    qLower.includes('why is') ||
    qLower.includes('evidence') ||
    qLower.includes('dispatch')
  ) {
    const topUnits = criticalAndHigh.slice(0, 5);
    const unitLines = topUnits
      .map(
        (r, i) =>
          `${i + 1}. **${r.machine_id}** — **${r.risk_assessment.risk_level} (${r.risk_assessment.maintenance_priority})** · Window: **${r.risk_assessment.maintenance_time_window}**\n` +
          `   - **Health:** **${r.current_condition.health_score.toFixed(1)}/100** | **RUL:** **~${(r.current_condition.rul_hours ?? 0).toFixed(1)} hours**\n` +
          `   - **Telemetry:** Vibration **${(r.measured_evidence.vibration_magnitude ?? 0).toFixed(2)} mm/s** · Temp **${(r.measured_evidence.temperature ?? 0).toFixed(1)}°C**\n` +
          `   - **Diagnosis:** ${r.generated_explanation?.condition_summary}`
      )
      .join('\n\n');

    const response =
      `### Priority Maintenance Dispatch Queue (${criticalAndHigh.length} Flagged Assets)\n\n` +
      `${unitLines}\n\n` +
      `**Immediate Shift Action Plan:**\n` +
      `1. **Dispatch P1 Crew to ${topUnits[0]?.machine_id || 'TXM-014'} & ${topUnits[1]?.machine_id || 'TXM-028'}:** Perform Lockout/Tagout and replace drive-end spindle bearings per **SOP-MECH-04**.\n` +
      `2. **Service P2 Warning Units (${topUnits[2]?.machine_id || 'TXM-008'}):** Flush degraded lubricant and replenish polyurea grease per **SOP-LUB-02**.`;

    return {
      query: rawQuery,
      response,
      cited_documents: retrieveRelevantDocs('SOP-MECH-04 bearing replacement ISO 10816 critical', 2),
      suggested_actions: [
        `Why is ${topUnits[0]?.machine_id || 'TXM-014'} classified as critical?`,
        'How do I replace spindle bearings (SOP-MECH-04)?',
        'Summarize the current factory health.',
      ],
      confidence: 0.97,
      source: 'Resonex RAG Core',
    };
  }

  // 12. GENERAL KNOWLEDGE BASE MATCH (Synthesize directly from top retrieved SOP/manual chunks)
  const topDoc = citedDocs[0];
  const secondDoc = citedDocs[1];
  const response =
    `### ${topDoc.title}\n\n` +
    `**Reference:** \`${topDoc.source_document}\` — *${topDoc.section}*\n\n` +
    `${topDoc.content}\n\n` +
    (secondDoc
      ? `**Related Plant Standard (${secondDoc.title}):**\n${secondDoc.content}\n\n`
      : '') +
    `**Live Plant Context:** **${criticalAndHigh.length} of ${overview.total_machines} machines** currently require maintenance attention (top priority: **${criticalAndHigh[0]?.machine_id || 'TXM-014'}** at **${(criticalAndHigh[0]?.measured_evidence?.vibration_magnitude ?? 5.82).toFixed(2)} mm/s**, **${(criticalAndHigh[0]?.measured_evidence?.temperature ?? 86.4).toFixed(1)}°C**).`;

  return {
    query: rawQuery,
    response,
    machine_id: activeMachineId,
    machine_context: machineContext,
    cited_documents: citedDocs,
    suggested_actions: [
      'Which machines need attention first?',
      'Summarize the current factory health.',
      'How do I replace spindle bearings (SOP-MECH-04)?',
    ],
    confidence: 0.92,
    source: 'Resonex RAG Core',
  };
}
