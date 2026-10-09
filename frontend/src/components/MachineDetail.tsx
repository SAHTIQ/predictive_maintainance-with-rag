import React, { useState, useEffect } from 'react';
import {
  Machine,
  SensorReading,
  HealthRecord,
  RiskRecord,
  MaintenanceRecord,
  RecommendationDecision,
} from '../types';
import { api } from '../services/api';
import { TimeSeriesChart, ChartTab } from './TimeSeriesChart';
import {
  MOCK_MACHINES,
  MOCK_RECOMMENDATIONS,
  generateMockSensorHistory,
  generateMockHealthHistory,
  getMockMaintenanceHistory,
} from '../services/mockData';

interface MachineDetailProps {
  machineId: string;
  onBack: () => void;
  onOpenAIWithMachine?: (machineId: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const MachineDetail: React.FC<MachineDetailProps> = ({
  machineId,
  onBack,
  onOpenAIWithMachine,
  onNavigateTab,
}) => {
  const [machine, setMachine] = useState<Machine | null>(null);
  const [latestStatus, setLatestStatus] = useState<RecommendationDecision | null>(null);
  const [sensorHistory, setSensorHistory] = useState<SensorReading[]>([]);
  const [healthHistory, setHealthHistory] = useState<HealthRecord[]>([]);
  const [, setRiskHistory] = useState<RiskRecord[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceRecord[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [isWatchlist, setIsWatchlist] = useState<boolean>(false);
  const [uploadingCsv, setUploadingCsv] = useState<boolean>(false);
  const [csvStatusMsg, setCsvStatusMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadMachineData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, status, sensors, health, risk, maint] = await Promise.all([
        api.getMachine(machineId),
        api.getLatestMachineStatus(machineId),
        api.getSensorHistory(machineId, 150),
        api.getHealthHistory(machineId, 100),
        api.getRiskHistory(machineId, 100),
        api.getMaintenanceHistory(machineId),
      ]);

      const isAwaiting = m.monitoring_readiness === 'Awaiting Data' || (m.total_readings ?? 0) === 0;

      setMachine(m);
      setLatestStatus(status);
      setSensorHistory(sensors.length > 0 ? sensors : (isAwaiting ? [] : generateMockSensorHistory(machineId, status.measured_evidence?.vibration_magnitude || 3.5, status.measured_evidence?.temperature || 70)));
      setHealthHistory(health.length > 0 ? health : (isAwaiting ? [] : generateMockHealthHistory(machineId, status.current_condition?.health_score || 80, status.current_condition?.rul_hours || 120)));
      setRiskHistory(risk);
      setMaintenanceHistory(maint.length > 0 ? maint : (isAwaiting ? [] : getMockMaintenanceHistory(machineId)));
    } catch {
      // Graceful fallback to offline plant cache if pre-seeded machine
      const fallbackMachine = MOCK_MACHINES.find((m) => m.machine_id === machineId);
      if (fallbackMachine) {
        const fallbackRec = MOCK_RECOMMENDATIONS.find((r) => r.machine_id === machineId) || MOCK_RECOMMENDATIONS[0];
        setMachine(fallbackMachine);
        setLatestStatus(fallbackRec);
        setSensorHistory(generateMockSensorHistory(machineId, fallbackRec.measured_evidence?.vibration_magnitude || 4.2, fallbackRec.measured_evidence?.temperature || 75));
        setHealthHistory(generateMockHealthHistory(machineId, fallbackRec.current_condition?.health_score || 70, fallbackRec.current_condition?.rul_hours || 80));
        setMaintenanceHistory(getMockMaintenanceHistory(machineId));
      } else {
        setError(`Unable to connect or load telemetry for machine ${machineId}.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCsv(true);
    setCsvStatusMsg(null);
    try {
      const res = await api.importMachineSensorCsv(machineId, file);
      setCsvStatusMsg({
        type: 'success',
        message: `Imported ${res.imported_readings} sensor readings successfully! ${res.pipeline_executed ? 'Predictive analytics pipeline executed.' : 'Ready for analysis.'}`,
      });
      await loadMachineData();
    } catch (err: any) {
      setCsvStatusMsg({
        type: 'error',
        message: err.message || 'Failed to import CSV sensor data.',
      });
    } finally {
      setUploadingCsv(false);
    }
  };

  useEffect(() => {
    loadMachineData();
  }, [machineId]);

  if (loading) {
    return (
      <div className="stitch-state-container">
        <div className="stitch-spinner" />
        <p className="state-text">Loading diagnostic telemetry & sensor history for {machineId}...</p>
      </div>
    );
  }

  if (error || !latestStatus) {
    return (
      <div className="stitch-state-container error">
        <span className="material-symbols-outlined state-error-icon">error</span>
        <h3 className="state-error-title">Failed to Retrieve Diagnostic Telemetry</h3>
        <p className="state-error-msg">{error || 'No status available.'}</p>
        <div className="flex gap-2 mt-4">
          <button className="stitch-btn-secondary" onClick={onBack}>
            ← Back to Machines
          </button>
          <button className="stitch-btn-primary" onClick={loadMachineData}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const condition = latestStatus.current_condition;
  const risk = latestStatus.risk_assessment;
  const explanation = latestStatus.generated_explanation;
  const measured = latestStatus.measured_evidence;
  const calculated = latestStatus.calculated_evidence;
  const docs = latestStatus.retrieved_documentary_evidence || [];
  const latestHealth = healthHistory.length > 0 ? healthHistory[healthHistory.length - 1] : null;

  const isAwaiting = condition.health_state_label === 'Awaiting Data' || machine?.monitoring_readiness === 'Awaiting Data' || (machine?.total_readings ?? 0) === 0;

  const isCritical = !isAwaiting && (condition.health_state_label === 'Critical' || risk.risk_level === 'CRITICAL');
  const isWarning = !isAwaiting && (condition.health_state_label === 'Warning' || risk.risk_level === 'HIGH');

  const chartTabs: ChartTab[] = [
    {
      id: 'vibration',
      label: 'Vibration Dynamics',
      unit: 'mm/s',
      threshold: 4.5,
      thresholdLabel: 'ISO 10816 Limit (4.5 mm/s)',
      series: [
        {
          name: 'Vibration RMS',
          color: '#2563eb',
          data: sensorHistory.map((s) => ({ timestamp: s.timestamp, value: s.vibration_magnitude })),
        },
        {
          name: 'Vib X-Axis',
          color: '#60a5fa',
          data: sensorHistory.map((s) => ({ timestamp: s.timestamp, value: s.vibration_x })),
        },
        {
          name: 'Vib Y-Axis',
          color: '#10b981',
          data: sensorHistory.map((s) => ({ timestamp: s.timestamp, value: s.vibration_y })),
        },
        {
          name: 'Vib Z-Axis',
          color: '#8b5cf6',
          data: sensorHistory.map((s) => ({ timestamp: s.timestamp, value: s.vibration_z })),
        },
      ],
    },
    {
      id: 'temp',
      label: 'Thermal Profile',
      unit: '°C',
      threshold: 75,
      thresholdLabel: 'Thermal Alarm Limit (75°C)',
      series: [
        {
          name: 'Bearing Temp',
          color: '#ef4444',
          data: sensorHistory.map((s) => ({ timestamp: s.timestamp, value: s.temperature })),
        },
      ],
    },
    {
      id: 'health',
      label: 'Health Trend',
      unit: '/100',
      threshold: 50,
      thresholdLabel: 'Critical Threshold (50)',
      series: [
        {
          name: 'Health Score',
          color: '#10b981',
          data: healthHistory.map((h) => ({ timestamp: h.timestamp, value: h.health_score })),
        },
      ],
    },
    {
      id: 'rul',
      label: 'RUL Horizon',
      unit: 'h',
      threshold: 24,
      thresholdLabel: 'Urgent Dispatch Horizon (24h)',
      series: [
        {
          name: 'Estimated RUL',
          color: '#f59e0b',
          data: healthHistory
            .filter((h) => h.rul_hours !== null && h.rul_hours !== undefined)
            .map((h) => ({ timestamp: h.timestamp, value: h.rul_hours as number })),
        },
      ],
    },
  ];

  return (
    <div className="view-page-container">
      {/* 1. Top Breadcrumb & Control Strip */}
      <div className="detail-breadcrumb-strip">
        <div className="flex items-center gap-2">
          <button className="stitch-btn-back" onClick={onBack} type="button">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back to Machines</span>
          </button>
          <span className="crumb-sep">/</span>
          <span className="crumb-section">Fleet Registry</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-current font-bold">{machine?.machine_id} {machine?.machine_name ? `(${machine.machine_name})` : ''}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="stitch-sync-pill">
            <span className="relative flex h-2 w-2">
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isAwaiting ? 'bg-cyan-400 animate-pulse' : 'bg-emerald-500'}`}></span>
            </span>
            <span className="sync-pill-text">{isAwaiting ? 'Telemetry Node: Provisioned (Awaiting Stream)' : 'Telemetry Node: Synced (100Hz)'}</span>
          </div>
          <span className="detail-bay-tag">
            {machine?.production_line ? `${machine.production_line} · ${machine.location || 'Bay'}` : `Shift A · Line ${((machine?.id ?? 0) % 4) + 1}`}
          </span>
        </div>
      </div>

      {/* 2. Machine Hero Header & Quick Dispatch Actions */}
      <div className="stitch-card p-space-lg mb-space-base">
        <div className="machine-hero-layout">
          <div className="hero-info-group">
            <div className="hero-title-row">
              <h1 className="hero-machine-id font-numeric">{machine?.machine_id}</h1>
              {isAwaiting ? (
                <span className="status-chip awaiting text-[13px] py-1 px-3">
                  <span className="chip-dot" />
                  <span className="font-semibold uppercase">Awaiting Data</span>
                </span>
              ) : (
                <span className={`status-chip ${condition.health_state_label.toLowerCase()} text-[13px] py-1 px-3`}>
                  <span className="chip-dot" />
                  <span className="font-semibold uppercase">
                    {condition.health_state_label} ({risk.maintenance_priority || 'P3'})
                  </span>
                </span>
              )}
              <span className="machine-type-tag">
                Type {machine?.machine_type} · {machine?.machine_name || 'Production Unit'}
              </span>
            </div>
            <p className="hero-meta-desc">
              Asset Tag: <strong className="text-on-surface">TX-ASSET-{(machine?.id ?? 1).toString().padStart(4, '0')}</strong> • Commissioned: {machine?.created_at ? new Date(machine.created_at).toLocaleDateString() : 'Nominal'} • Location: {machine?.location || `Machining Bay ${((machine?.id ?? 0) % 6) + 1}`}
              {machine?.manufacturer ? ` • Manufacturer: ${machine.manufacturer}` : ''}
              {machine?.serial_number ? ` • S/N: ${machine.serial_number}` : ''}
            </p>
          </div>

          {/* Action Button Group */}
          <div className="hero-actions-group">
            <button
              className={`stitch-btn-secondary ${isPinned ? 'active-pin' : ''}`}
              onClick={() => setIsPinned(!isPinned)}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] text-amber-500" style={{ fontVariationSettings: isPinned ? "'FILL' 1" : "'FILL' 0" }}>
                star
              </span>
              <span>{isPinned ? 'Pinned' : 'Pin Machine'}</span>
            </button>

            <button
              className={`stitch-btn-secondary ${isWatchlist ? 'active-watch' : ''}`}
              onClick={() => setIsWatchlist(!isWatchlist)}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">
                visibility
              </span>
              <span>Watchlist</span>
            </button>

            {onNavigateTab && (
              <button
                className="stitch-btn-secondary"
                onClick={() => onNavigateTab('maintenance')}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">engineering</span>
                <span>Send Repair Team</span>
              </button>
            )}

            {onOpenAIWithMachine && (
              <button
                className="stitch-btn-ai-launch"
                onClick={() => onOpenAIWithMachine(machineId)}
                title="Ask AI Assistant about this machine"
                type="button"
              >
                <span className="ai-sparkle">✦</span>
                <span>Ask AI Assistant</span>
              </button>
            )}
          </div>
        </div>

        {/* 3. Plain-English Condition Callout Banner */}
        <div className={`detail-callout-banner ${isAwaiting ? 'awaiting' : isCritical ? 'critical' : isWarning ? 'warning' : 'nominal'} mt-4`}>
          <span className="material-symbols-outlined callout-icon" style={{ fontVariationSettings: "'FILL' 1" }}>
            {isAwaiting ? 'cloud_upload' : isCritical ? 'warning' : isWarning ? 'report_problem' : 'check_circle'}
          </span>
          <div className="callout-content">
            <div className="callout-header-row">
              <span className="callout-title">
                {isAwaiting
                  ? 'REGISTERED ASSET · Awaiting Initial Sensor Telemetry Feed'
                  : isCritical
                  ? 'URGENT ATTENTION NEEDED · Overheating or High Shaking Detected'
                  : isWarning
                  ? 'WARNING · Early Signs of Machine Wear Detected'
                  : 'ALL CLEAR · Machine Running Normally Within Safe Limits'}
              </span>
              {isAwaiting ? (
                <span className="callout-countdown-pill font-numeric text-cyan-400">
                  Ready for Data Ingestion
                </span>
              ) : calculated.rul_hours != null && (
                <span className="callout-countdown-pill font-numeric">
                  ~{calculated.rul_hours.toFixed(0)} Hours Left Before Repair Needed
                </span>
              )}
            </div>
            <p className="callout-text">
              {isAwaiting
                ? `Asset ${machine?.machine_id} is registered in the Resonex platform. No sensor data has been streamed yet. Upload a historical telemetry CSV or activate the edge gateway to initiate predictive health calculations and RUL tracking.`
                : explanation?.condition_summary || explanation?.reasoning || 'All machine sensor readings are within normal safe limits.'}
            </p>
          </div>
        </div>

        {csvStatusMsg && (
          <div className={`mt-3 p-3 rounded text-xs flex items-center gap-2 ${csvStatusMsg.type === 'success' ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300' : 'bg-red-950/60 border border-red-500/50 text-red-300'}`}>
            <span className="material-symbols-outlined text-sm">{csvStatusMsg.type === 'success' ? 'check_circle' : 'error'}</span>
            <span>{csvStatusMsg.message}</span>
          </div>
        )}
      </div>

      {/* 4. High-Density Bento Metric Grid */}
      <section className="stitch-kpi-deck mb-space-base">
        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">Health Score</span>
            <span className="material-symbols-outlined text-[#94A3B8] text-[18px]">health_and_safety</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric">{condition.health_score.toFixed(1)}</span>
            <span className="kpi-unit-label">/ 100 Health</span>
          </div>
          <div className="kpi-footnote text-[#94A3B8]">
            Wear condition: <strong className="text-[#F1F5F9] font-medium">{condition.degradation_status}</strong>
          </div>
        </div>

        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">Risk of Failure</span>
            <span className="material-symbols-outlined text-[#94A3B8] text-[18px]">gavel</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric">{(risk.risk_score * 100).toFixed(0)}%</span>
            <span className={`risk-pill ${risk.risk_level.toLowerCase()} ml-2`}>
              {risk.risk_level}
            </span>
          </div>
          <div className="kpi-footnote text-[#94A3B8]">
            Repair urgency: <strong className="text-[#F1F5F9] font-medium">{risk.maintenance_priority}</strong> ({risk.maintenance_time_window || 'Immediate'})
          </div>
        </div>

        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">Uncertainty-Aware RUL</span>
            <span className="material-symbols-outlined text-[#94A3B8] text-[18px]">timelapse</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric">
              {calculated.rul_hours != null ? calculated.rul_hours.toFixed(0) : '--'}
            </span>
            <span className="kpi-unit-label">Hours Left</span>
          </div>
          <div className="kpi-footnote text-[#94A3B8]">
            80% CI: <strong className="text-[#F1F5F9] font-numeric font-medium">
              {latestHealth?.rul_confidence_lower != null && latestHealth?.rul_confidence_upper != null
                ? `[${latestHealth.rul_confidence_lower.toFixed(0)}h – ${latestHealth.rul_confidence_upper.toFixed(0)}h]`
                : calculated.rul_hours != null
                ? `[${Math.max(0, calculated.rul_hours * 0.8).toFixed(0)}h – ${(calculated.rul_hours * 1.2).toFixed(0)}h]`
                : '--'}
            </strong>
            {latestHealth?.rul_uncertainty_score != null && (
              <span className="ml-2 text-xs text-[#64748B] font-numeric">
                (±{(latestHealth.rul_uncertainty_score * 100).toFixed(0)}% unc.)
              </span>
            )}
          </div>
        </div>

        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">Vibration & Temperature</span>
            <span className="material-symbols-outlined text-[#94A3B8] text-[18px]">sensors</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric">
              {measured.vibration_magnitude?.toFixed(2) || '--'}
            </span>
            <span className="kpi-unit-label">mm/s</span>
            <span className="text-[#64748B] mx-1">·</span>
            <span className="kpi-telemetry-val font-numeric">
              {measured.temperature?.toFixed(1) || '--'}
            </span>
            <span className="kpi-unit-label">°C</span>
          </div>
          <div className="kpi-footnote text-[#94A3B8]">
            Total runtime: <strong className="text-[#F1F5F9] font-numeric font-medium">{measured.operational_hours || 0} hrs</strong>
          </div>
        </div>
      </section>

      {/* 5. Interactive Native SVG TimeSeriesChart */}
      <section className="stitch-card p-space-base mb-space-base">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h2 className="stitch-card-title">Live Sensor Waveform & History</h2>
            <p className="stitch-card-desc">
              {sensorHistory.length > 0
                ? 'Real-time shaking, heat levels, and health trends over recent monitoring windows.'
                : 'Awaiting sensor stream. You can upload an initial CSV reading dataset to kickstart analytics.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 text-xs font-semibold rounded cursor-pointer transition-colors shadow-sm">
              <span className="material-symbols-outlined text-[16px]">upload_file</span>
              <span>{uploadingCsv ? 'Importing CSV...' : 'Import Telemetry CSV'}</span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                disabled={uploadingCsv}
                onChange={handleCsvUpload}
              />
            </label>
          </div>
        </div>
        {sensorHistory.length > 0 ? (
          <TimeSeriesChart tabs={chartTabs} height={260} />
        ) : (
          <div className="p-8 border border-dashed border-cyan-500/30 rounded-lg text-center bg-cyan-950/10 my-2">
            <span className="material-symbols-outlined text-4xl text-cyan-400 mb-2">sensors_off</span>
            <h3 className="text-sm font-semibold text-[#F1F5F9]">No Historical Telemetry Stream Ingested Yet</h3>
            <p className="text-xs text-[#94A3B8] max-w-md mx-auto mt-1 mb-4 leading-relaxed">
              To calculate Health Score, Remaining Useful Life (RUL), and FFT vibration harmonics for {machine?.machine_id}, upload a sensor readings CSV file with <code>temperature</code> and <code>vibration_magnitude</code> columns.
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold rounded-lg shadow-md cursor-pointer transition-all">
              <span className="material-symbols-outlined text-sm">cloud_upload</span>
              <span>{uploadingCsv ? 'Ingesting...' : 'Select Sensor CSV File'}</span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                disabled={uploadingCsv}
                onChange={handleCsvUpload}
              />
            </label>
          </div>
        )}
      </section>

      {/* 6. Diagnostics Breakdown & RAG Documentary Evidence Grid */}
      <div className="detail-evidence-columns-grid mb-space-base">
        {/* Left Column: Measured & Calculated Diagnostics */}
        <div className="stitch-card p-space-base">
          <div className="stitch-card-header mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">analytics</span>
              <h2 className="stitch-card-title">Machine Sensor Readings</h2>
            </div>
            <span className="kpi-label-caps">Vibration Safety Check</span>
          </div>

          <div className="telemetry-readings-grid">
            <div className="telemetry-item">
              <span className="item-label">Side-to-Side Shaking (X)</span>
              <span className="item-value font-numeric">{measured.vibration_x?.toFixed(3) ?? '--'} g</span>
            </div>
            <div className="telemetry-item">
              <span className="item-label">Front-to-Back Shaking (Y)</span>
              <span className="item-value font-numeric">{measured.vibration_y?.toFixed(3) ?? '--'} g</span>
            </div>
            <div className="telemetry-item">
              <span className="item-label">Up-and-Down Shaking (Z)</span>
              <span className="item-value font-numeric">{measured.vibration_z?.toFixed(3) ?? '--'} g</span>
            </div>
            <div className="telemetry-item">
              <span className="item-label">Overall Vibration Level</span>
              <span className="item-value font-numeric font-bold text-primary">
                {measured.vibration_magnitude?.toFixed(3) ?? '--'} mm/s
              </span>
            </div>
            <div className="telemetry-item">
              <span className="item-label">Machine Temperature</span>
              <span className="item-value font-numeric">{measured.temperature?.toFixed(1) ?? '--'} °C</span>
            </div>
            <div className="telemetry-item">
              <span className="item-label">Motor Workload</span>
              <span className="item-value font-numeric">{measured.load_percent != null ? `${measured.load_percent}%` : '85%'}</span>
            </div>
            <div className="telemetry-item">
              <span className="item-label">Motor Speed</span>
              <span className="item-value font-numeric">{measured.rotational_speed != null ? `${measured.rotational_speed} RPM` : '1800 RPM'}</span>
            </div>
            <div className="telemetry-item">
              <span className="item-label">Problem Detected?</span>
              <span className={`item-value font-bold ${condition.anomaly_status ? 'text-red-400' : 'text-emerald-400'}`}>
                {condition.anomaly_status ? 'YES - ISSUE FOUND' : 'NO - RUNNING FINE'}
              </span>
            </div>
            <div className="telemetry-item">
              <span className="item-label">Dominant Frequency (FFT)</span>
              <span className="item-value font-numeric">
                {latestHealth?.dominant_frequency_hz != null
                  ? `${latestHealth.dominant_frequency_hz.toFixed(2)} Hz`
                  : '0.40 Hz'}
              </span>
            </div>
            <div className="telemetry-item">
              <span className="item-label">Spectral Energy Ratio</span>
              <span className="item-value font-numeric">
                {latestHealth?.fft_energy_ratio != null
                  ? `${latestHealth.fft_energy_ratio.toFixed(2)}x base`
                  : '1.02x base'}
              </span>
            </div>
          </div>

          {/* Potential Causes from Decision Engine */}
          {explanation?.potential_causes && explanation.potential_causes.length > 0 && (
            <div className="causes-section mt-4 pt-3 border-t border-hairline">
              <span className="font-label-caps text-secondary uppercase font-semibold">Most Likely Reasons for Problem:</span>
              <ul className="causes-list mt-1.5">
                {explanation.potential_causes.map((c, i) => (
                  <li key={i} className="cause-item">
                    <span className="material-symbols-outlined text-[14px] text-amber-500">fiber_manual_record</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: RAG Documentary Citations & SOP References */}
        <div className="stitch-card p-space-base">
          <div className="stitch-card-header mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">menu_book</span>
              <h2 className="stitch-card-title">Repair Guides & Manuals</h2>
            </div>
            <span className="kpi-label-caps">Verified by Manuals ({docs.length})</span>
          </div>

          {docs.length === 0 ? (
            <div className="stitch-empty-state-sm">
              <span className="material-symbols-outlined text-[24px] text-muted">library_books</span>
              <p className="empty-desc text-xs mt-1">No repair guides needed right now. Machine is running normally.</p>
            </div>
          ) : (
            <div className="detail-citations-list">
              {docs.map((doc, idx) => (
                <div key={idx} className="citation-box">
                  <div className="citation-box-head">
                    <span className="citation-box-title">{doc.title}</span>
                    <span className="citation-box-match font-numeric">{(doc.score * 100).toFixed(0)}% match</span>
                  </div>
                  <span className="citation-box-src">{doc.source} · {doc.category}</span>
                  <p className="citation-box-excerpt">{doc.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Recommended SOP Actions */}
          {explanation?.recommended_actions && explanation.recommended_actions.length > 0 && (
            <div className="actions-section mt-4 pt-3 border-t border-hairline">
              <span className="font-label-caps text-secondary uppercase font-semibold">Recommended Steps to Fix:</span>
              <ul className="actions-list mt-1.5">
                {explanation.recommended_actions.map((act, i) => (
                  <li key={i} className="action-step-item">
                    <span className="material-symbols-outlined text-[16px] text-emerald-400">task_alt</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 6.5. Asset Profile & Engineering Specifications */}
      {(machine?.manufacturer || machine?.serial_number || machine?.specifications || machine?.operational_settings || machine?.description) && (
        <section className="stitch-card p-space-base mb-space-base">
          <div className="stitch-card-header mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
              <h2 className="stitch-card-title">Asset Profile & Engineering Specifications</h2>
            </div>
            <span className="kpi-label-caps">Machine Blueprint</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded bg-surface-container-high/40 border border-outline-variant/50">
              <span className="text-[#94A3B8] block text-[11px] uppercase tracking-wider">Manufacturer & Model</span>
              <span className="text-[#F1F5F9] font-medium block mt-1">
                {machine?.manufacturer || 'Standard Textile OEM'} · {machine?.model_number || `Series-${machine?.machine_type}`}
              </span>
              <span className="text-[#64748B] block mt-0.5">S/N: {machine?.serial_number || 'N/A'}</span>
            </div>

            <div className="p-2.5 rounded bg-surface-container-high/40 border border-outline-variant/50">
              <span className="text-[#94A3B8] block text-[11px] uppercase tracking-wider">Facility & Line</span>
              <span className="text-[#F1F5F9] font-medium block mt-1">
                {machine?.plant || 'Plant Alpha'} · {machine?.production_line || 'Weaving Line 1'}
              </span>
              <span className="text-[#64748B] block mt-0.5">Bay: {machine?.location || 'Floor Bay 01'}</span>
            </div>

            <div className="p-2.5 rounded bg-surface-container-high/40 border border-outline-variant/50">
              <span className="text-[#94A3B8] block text-[11px] uppercase tracking-wider">Operational Thresholds</span>
              <span className="text-[#F1F5F9] font-numeric block mt-1">
                Vib Limit: {machine?.operational_settings?.vibration_critical ?? 4.5} mm/s
              </span>
              <span className="text-[#64748B] block mt-0.5">
                Temp Limit: {machine?.operational_settings?.critical_temp ?? 85}°C
              </span>
            </div>

            <div className="p-2.5 rounded bg-surface-container-high/40 border border-outline-variant/50">
              <span className="text-[#94A3B8] block text-[11px] uppercase tracking-wider">Monitoring Readiness</span>
              <span className="text-cyan-400 font-semibold block mt-1">
                {machine?.monitoring_readiness || (machine?.total_readings ? 'Monitoring Active' : 'Awaiting Data')}
              </span>
              <span className="text-[#64748B] block mt-0.5 font-numeric">
                {machine?.total_readings ?? 0} total readings ingested
              </span>
            </div>
          </div>

          {machine?.description && (
            <p className="mt-3 text-xs text-[#94A3B8] italic border-t border-hairline pt-2">
              Note: {machine.description}
            </p>
          )}
        </section>
      )}

      {/* 7. Maintenance History Log */}
      <section className="stitch-card p-space-base">
        <div className="stitch-card-header mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">history</span>
            <h2 className="stitch-card-title">Past Repair & Service History</h2>
          </div>
          <span className="kpi-label-caps">{maintenanceHistory.length} Past Records</span>
        </div>

        {maintenanceHistory.length === 0 ? (
          <div className="stitch-empty-state py-6">
            <span className="material-symbols-outlined empty-symbol text-muted">history_toggle_off</span>
            <h3 className="empty-title">No Historical Maintenance Records</h3>
            <p className="empty-desc">This asset has no recorded work orders or component replacements on file.</p>
          </div>
        ) : (
          <div className="stitch-table-wrapper">
            <table className="stitch-table">
              <thead>
                <tr>
                  <th className="th-left">Date</th>
                  <th className="th-left">Type</th>
                  <th className="th-left">Component</th>
                  <th className="th-left">Description</th>
                  <th className="th-left">Action Taken</th>
                  <th className="th-center">SOP Code</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceHistory.map((rec) => (
                  <tr key={rec.id} className="stitch-row">
                    <td className="td-left font-numeric">{new Date(rec.maintenance_date).toLocaleDateString()}</td>
                    <td className="td-left font-semibold">{rec.maintenance_type}</td>
                    <td className="td-left">{rec.component}</td>
                    <td className="td-left text-secondary">{rec.description}</td>
                    <td className="td-left">{rec.action_taken}</td>
                    <td className="td-center">
                      {rec.sop_code ? (
                        <span className="sop-code-badge">{rec.sop_code}</span>
                      ) : (
                        '--'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
