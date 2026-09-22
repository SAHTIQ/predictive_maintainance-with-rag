import { FleetOverview, Machine, RecommendationDecision, SensorReading, HealthRecord, MaintenanceRecord } from '../types';

// Generate 50 realistic machines (TXM-001 through TXM-050) matching real plant textile machines
export const MOCK_MACHINES: Machine[] = Array.from({ length: 50 }, (_, i) => {
  const num = (i + 1).toString().padStart(3, '0');
  const type = i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C';
  const typeNames = { A: 'Ring Spinning Frame', B: 'Rotor Spinning Unit', C: 'High-Speed Winder' };
  return {
    id: i + 1,
    machine_id: `TXM-${num}`,
    machine_type: type,
    machine_name: `${typeNames[type]} ${num}`,
    status: i === 13 || i === 27 ? 'CRITICAL' : i === 7 || i === 21 || i === 39 ? 'WARNING' : 'OPERATIONAL',
    created_at: new Date(Date.now() - (180 - i) * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  };
});

// Generate realistic recommendations for machines
export const MOCK_RECOMMENDATIONS: RecommendationDecision[] = MOCK_MACHINES.map((m, idx) => {
  const isTXM014 = m.machine_id === 'TXM-014';
  const isCritical = isTXM014 || idx === 27;
  const isHigh = idx === 7 || idx === 21 || idx === 39;
  const isMedium = idx === 3 || idx === 11 || idx === 34;

  const riskLevel = isCritical ? 'CRITICAL' : isHigh ? 'HIGH' : isMedium ? 'MEDIUM' : 'LOW';
  const priority = isCritical ? 'P1' : isHigh ? 'P2' : isMedium ? 'P3' : 'P3';
  const healthLabel = isCritical ? 'Critical' : isHigh || isMedium ? 'Warning' : 'Good';
  const healthScore = isCritical ? 34.2 : isHigh ? 58.6 : isMedium ? 73.1 : 88.4 + (idx % 11);
  const rulHours = isCritical ? 8.5 : isHigh ? 21.0 : isMedium ? 64.0 : 210.0 + (idx * 5);

  const vib = isCritical ? 5.82 : isHigh ? 4.12 : isMedium ? 3.45 : 1.85 + (idx % 10) * 0.1;
  const temp = isCritical ? 86.4 : isHigh ? 78.2 : isMedium ? 71.0 : 58.0 + (idx % 15);

  const conditionSummary = isCritical
    ? 'Critical inner raceway spalling and harmonic vibration surge on spindle drive bearing.'
    : isHigh
    ? 'Accelerating thermal escalation and high-frequency friction detected.'
    : isMedium
    ? 'Moderate mechanical unbalance with slight temperature elevation.'
    : 'All telemetry metrics within ISO 10816 Zone A/B nominal boundaries.';

  const recommendedActions = isCritical
    ? [
        'Perform emergency spindle bearing replacement (SKF 6205-2RSH/C3).',
        'Verify shaft concentricity and check dynamic unbalance with portable stroboscope.',
        'Replenish synthetic polyurea grease and verify seal integrity.',
      ]
    : isHigh
    ? [
        'Inspect lubrication flow and flush old lubricant.',
        'Schedule vibration FFT spectral analysis within 24 hours.',
      ]
    : [
        'Continue continuous baseline telemetry tracking.',
        'Standard preventive inspection at next scheduled shift turnover.',
      ];

  const sopReferences = isCritical
    ? ['SOP-MECH-04', 'SOP-VIB-014', 'ISO-10816-3-CAT2']
    : isHigh
    ? ['SOP-LUB-02', 'SOP-TH-08']
    : ['SOP-GEN-01'];

  return {
    machine_id: m.machine_id,
    machine_type: m.machine_type,
    timestamp: new Date(Date.now() - (idx * 180000)).toISOString(),
    current_condition: {
      health_score: healthScore,
      health_state: isCritical ? 2 : isHigh || isMedium ? 1 : 0,
      health_state_label: healthLabel,
      anomaly_status: isCritical || isHigh,
      anomaly_score: isCritical ? 0.94 : isHigh ? 0.72 : 0.12,
      degradation_status: isCritical ? 'ACCELERATING' : isHigh ? 'STEADY' : 'NORMAL',
      degradation_rate: isCritical ? 0.084 : isHigh ? 0.032 : 0.005,
      rul_hours: rulHours,
    },
    risk_assessment: {
      risk_score: isCritical ? 92.0 : isHigh ? 74.5 : isMedium ? 48.0 : 18.0,
      risk_level: riskLevel,
      maintenance_priority: priority,
      maintenance_time_window: isCritical ? '< 12 Hours' : isHigh ? '< 24 Hours' : 'Next Scheduled',
      risk_factors: {
        vibration_severity: isCritical ? 'CRITICAL' : 'NORMAL',
        temperature_margin: isCritical ? 'EXCEEDED' : 'NOMINAL',
        rul_depletion: isCritical ? 'URGENT' : 'STABLE',
      },
    },
    measured_evidence: {
      vibration_magnitude: vib,
      vibration_x: vib * 0.58,
      vibration_y: vib * 0.62,
      vibration_z: vib * 0.52,
      temperature: temp,
      load_percent: 85 + (idx % 12),
      rotational_speed: 1480 + (idx % 40),
      operational_hours: 4200 + idx * 75,
    },
    calculated_evidence: {
      health_score: healthScore,
      health_state_label: healthLabel,
      anomaly_detected: isCritical || isHigh,
      anomaly_score: isCritical ? 0.94 : 0.1,
      degradation_status: isCritical ? 'ACCELERATING' : 'NORMAL',
      degradation_slope: isCritical ? 0.084 : 0.012,
      rul_hours: rulHours,
      risk_score: isCritical ? 92.0 : 18.0,
      risk_level: riskLevel,
      maintenance_priority: priority,
      estimated_maintenance_time_window: isCritical ? '< 12 Hours' : '< 24 Hours',
    },
    retrieved_documentary_evidence: [
      {
        title: 'ISO 10816-3 Industrial Vibration Standards',
        source: 'docs/iso_10816_vibration_standards.md',
        category: 'standard',
        score: 0.98,
        content:
          'Category II machinery with rigid foundation: Vibration velocity > 4.5 mm/s RMS indicates Zone C (Unrestricted long-term operation restricted). Values > 7.1 mm/s RMS indicate Zone D (Damage occurs). Immediate intervention mandatory when approaching trip threshold.',
      },
      {
        title: 'SOP-MECH-04: Spindle Bearing Disassembly & Replacement',
        source: 'docs/sop_mech_04_bearing_replacement.md',
        category: 'procedure',
        score: 0.95,
        content:
          '1. Lockout/Tagout (LOTO) main drive supply. 2. Remove drive pulley and inspect taper lock bushing. 3. Use mechanical puller for inner race extraction. 4. Induction heat replacement bearing to 110°C before shaft mounting. 5. Torque retention nuts to 85 Nm.',
      },
      {
        title: 'Spindle Bearing Failure Troubleshooting Matrix',
        source: 'docs/troubleshooting_spindle_bearings.md',
        category: 'troubleshooting',
        score: 0.91,
        content:
          'High frequency acceleration peaks accompanied by 1X/2X harmonics indicate severe inner raceway fatigue spalling or inadequate grease film thickness under high radial loads.',
      },
    ],
    generated_explanation: {
      condition_summary: conditionSummary,
      recommended_actions: recommendedActions,
      reasoning: `Machine ${m.machine_id} exhibits composite risk level ${riskLevel} based on measured vibration magnitude (${vib.toFixed(2)} mm/s) and bearing temperature (${temp.toFixed(1)}°C). Estimated remaining useful life is ${rulHours.toFixed(0)} hours.`,
      urgency_level: isCritical ? 'IMMEDIATE' : isHigh ? 'URGENT' : 'ROUTINE',
      sop_references: sopReferences,
      potential_causes: isCritical
        ? ['Inner raceway fatigue spalling', 'Synthetic polyurea grease depletion', 'Dynamic unbalance']
        : ['Lubrication viscosity thinning', 'Belt tension drift'],
      confidence: 0.94,
      source: 'Deterministic ML/RAG engine',
    },
    source_traceability: {
      machine_id: m.machine_id,
      primary_manual_referenced: 'ISO 10816-3',
      applicable_standards: ['ISO 10816-3', 'SOP-MECH-04'],
      evidence_counts: {
        measured_points: 6,
        calculated_metrics: 4,
        retrieved_documents: 3,
      },
    },
  };
});

export const MOCK_FLEET_OVERVIEW: FleetOverview = {
  total_machines: 50,
  health_states: {
    Good: 42,
    Warning: 6,
    Critical: 2,
  },
  risk_levels: {
    LOW: 40,
    MEDIUM: 4,
    HIGH: 4,
    CRITICAL: 2,
  },
  maintenance_priorities: {
    P1: 2,
    P2: 4,
    P3: 44,
  },
  average_health_score: 84.6,
  average_rul_hours: 148.2,
  machines_requiring_maintenance_count: 6,
};

// Generate realistic 24-point telemetry history for SVG chart
export function generateMockSensorHistory(machineId: string, currentVib: number, currentTemp: number): SensorReading[] {
  const points: SensorReading[] = [];
  const now = Date.now();
  const stepMs = 3600000; // 1 hour steps
  const count = 24;

  for (let i = count - 1; i >= 0; i--) {
    const factor = (count - i) / count;
    // progressive climb for abnormal machines, stable ripple for normal
    const isElevated = currentVib > 4.0;
    const baseVib = isElevated ? 2.2 + factor * (currentVib - 2.2) : 1.8 + Math.sin(i) * 0.3;
    const baseTemp = isElevated ? 62 + factor * (currentTemp - 62) : 58 + Math.cos(i) * 3;

    points.push({
      id: i + 1,
      machine_id: machineId,
      timestamp: new Date(now - i * stepMs).toISOString(),
      temperature: Math.round(baseTemp * 10) / 10,
      vibration_magnitude: Math.round(baseVib * 100) / 100,
      vibration_x: Math.round(baseVib * 0.58 * 100) / 100,
      vibration_y: Math.round(baseVib * 0.62 * 100) / 100,
      vibration_z: Math.round(baseVib * 0.52 * 100) / 100,
      load_percent: 85,
      rotational_speed: 1500,
      operating_hours: 4200 + (24 - i),
    });
  }
  return points;
}

export function generateMockHealthHistory(machineId: string, currentScore: number, currentRul: number): HealthRecord[] {
  const records: HealthRecord[] = [];
  const now = Date.now();
  const count = 24;

  for (let i = count - 1; i >= 0; i--) {
    const factor = (count - i) / count;
    const score = 88 - factor * (88 - currentScore);
    const rul = 220 - factor * (220 - currentRul);

    records.push({
      id: i + 1,
      machine_id: machineId,
      timestamp: new Date(now - i * 3600000).toISOString(),
      health_score: Math.round(score * 10) / 10,
      health_state: score < 50 ? 2 : score < 75 ? 1 : 0,
      health_state_label: score < 50 ? 'Critical' : score < 75 ? 'Warning' : 'Good',
      anomaly_status: score < 60,
      anomaly_score: score < 60 ? 0.85 : 0.1,
      degradation_status: score < 50 ? 'ACCELERATING' : 'STEADY',
      degradation_rate: score < 50 ? 0.08 : 0.01,
      rul_hours: Math.round(rul),
    });
  }
  return records;
}

export function getMockMaintenanceHistory(machineId: string): MaintenanceRecord[] {
  return [
    {
      id: 1,
      machine_id: machineId,
      maintenance_date: new Date(Date.now() - 45 * 86400000).toISOString(),
      maintenance_type: 'PREVENTIVE',
      component: 'Bearing Assembly',
      description: 'Periodic ultrasonic acoustic inspection & regreasing.',
      action_taken: 'Injected 15g Kluberplex BEM 41-132 synthetic grease. Vibration nominal.',
      sop_code: 'SOP-LUB-02',
      technician_notes: 'Grease purged clean, acoustic readings steady at 18 dB.',
    },
    {
      id: 2,
      machine_id: machineId,
      maintenance_date: new Date(Date.now() - 110 * 86400000).toISOString(),
      maintenance_type: 'CORRECTIVE',
      component: 'Drive Pulley Belt',
      description: 'High-frequency vibration spike due to tension relaxation.',
      action_taken: 'Retensioned timing belt to 450 N spec using sonic tension gauge.',
      sop_code: 'SOP-MECH-01',
      technician_notes: 'Harmonic peak eliminated after tensioning.',
    },
  ];
}
