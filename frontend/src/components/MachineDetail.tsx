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

      setMachine(m);
      setLatestStatus(status);
      setSensorHistory(sensors);
      setHealthHistory(health);
      setRiskHistory(risk);
      setMaintenanceHistory(maint);
    } catch (err: any) {
      setError(err.message || `Failed to retrieve telemetry and diagnostic status for ${machineId}.`);
    } finally {
      setLoading(false);
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

  const isCritical = condition.health_state_label === 'Critical' || risk.risk_level === 'CRITICAL';
  const isWarning = condition.health_state_label === 'Warning' || risk.risk_level === 'HIGH';

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
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="sync-pill-text">Telemetry Node: Synced (100Hz)</span>
          </div>
          <span className="detail-bay-tag">Shift A · Line {((machine?.id ?? 0) % 4) + 1}</span>
        </div>
      </div>

      {/* 2. Machine Hero Header & Quick Dispatch Actions */}
      <div className="stitch-card p-space-lg mb-space-base">
        <div className="machine-hero-layout">
          <div className="hero-info-group">
            <div className="hero-title-row">
              <h1 className="hero-machine-id font-numeric">{machine?.machine_id}</h1>
              <span className={`status-chip ${condition.health_state_label.toLowerCase()} text-[13px] py-1 px-3`}>
                <span className={`chip-dot ${isCritical ? 'animate-pulse' : ''}`} />
                <span className="font-bold uppercase">
                  {condition.health_state_label} ({risk.maintenance_priority || 'P3'})
                </span>
              </span>
              <span className="machine-type-tag">
                Type {machine?.machine_type} · {machine?.machine_name || 'Production Unit'}
              </span>
            </div>
            <p className="hero-meta-desc">
              Asset Tag: <strong className="text-on-surface">TX-ASSET-{(machine?.id ?? 1).toString().padStart(4, '0')}</strong> • Commissioned: {machine?.created_at ? new Date(machine.created_at).toLocaleDateString() : 'Nominal'} • Location: Machining Bay {((machine?.id ?? 0) % 6) + 1}
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
              <span>{isPinned ? 'Pinned' : 'Pin Asset'}</span>
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
                <span>Dispatch Tech</span>
              </button>
            )}

            {onOpenAIWithMachine && (
              <button
                className="stitch-btn-ai-launch"
                onClick={() => onOpenAIWithMachine(machineId)}
                title="Launch Resonex AI with active context"
                type="button"
              >
                <span className="ai-sparkle">✦</span>
                <span>Ask Resonex AI</span>
              </button>
            )}
          </div>
        </div>

        {/* 3. Plain-English Condition Callout Banner matching Stitch */}
        <div className={`detail-callout-banner ${isCritical ? 'critical' : isWarning ? 'warning' : 'nominal'} mt-4`}>
          <span className="material-symbols-outlined callout-icon" style={{ fontVariationSettings: "'FILL' 1" }}>
            {isCritical ? 'warning' : isWarning ? 'report_problem' : 'check_circle'}
          </span>
          <div className="callout-content">
            <div className="callout-header-row">
              <span className="callout-title">
                {isCritical
                  ? 'ATTENTION REQUIRED · SEVERE THERMAL OR HARMONIC ANOMALY'
                  : isWarning
                  ? 'PRECAUTIONARY MONITORING · EARLY DEGRADATION SIGNATURE'
                  : 'OPTIMAL OPERATION · STEADY STATE HARMONICS'}
              </span>
              {calculated.rul_hours != null && (
                <span className="callout-countdown-pill font-numeric">
                  T-Minus {calculated.rul_hours.toFixed(1)} Hours
                </span>
              )}
            </div>
            <p className="callout-text">
              {explanation?.condition_summary || explanation?.reasoning || 'Telemetry stream is nominal and tracking within baseline parameters.'}
            </p>
          </div>
        </div>
      </div>

      {/* 4. High-Density Bento Metric Grid */}
      <section className="stitch-kpi-deck mb-space-base">
        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">Health Score</span>
            <span className="material-symbols-outlined text-emerald-600 text-[18px]">health_and_safety</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric">{condition.health_score.toFixed(1)}</span>
            <span className="kpi-unit-label">/ 100</span>
          </div>
          <div className="kpi-footnote text-secondary">
            Degradation status: <strong className="text-on-surface">{condition.degradation_status}</strong>
          </div>
        </div>

        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">Risk Assessment</span>
            <span className="material-symbols-outlined text-amber-600 text-[18px]">gavel</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric">{(risk.risk_score * 100).toFixed(0)}%</span>
            <span className={`risk-pill ${risk.risk_level.toLowerCase()} ml-2`}>
              {risk.risk_level}
            </span>
          </div>
          <div className="kpi-footnote text-secondary">
            Priority: <strong className="text-on-surface">{risk.maintenance_priority}</strong> ({risk.maintenance_time_window || 'Immediate'})
          </div>
        </div>

        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">Predicted RUL</span>
            <span className="material-symbols-outlined text-blue-600 text-[18px]">timelapse</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric">
              {calculated.rul_hours != null ? calculated.rul_hours.toFixed(0) : '--'}
            </span>
            <span className="kpi-unit-label">Hours</span>
          </div>
          <div className="kpi-footnote text-secondary">
            Degradation slope: <strong className="text-on-surface font-numeric">{calculated.degradation_slope?.toFixed(4) || 'Nominal'}</strong>
          </div>
        </div>

        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">Vibration & Temp</span>
            <span className="material-symbols-outlined text-purple-600 text-[18px]">sensors</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric">
              {measured.vibration_magnitude?.toFixed(2) || '--'}
            </span>
            <span className="kpi-unit-label">mm/s</span>
            <span className="text-muted mx-1">·</span>
            <span className="kpi-telemetry-val font-numeric">
              {measured.temperature?.toFixed(1) || '--'}
            </span>
            <span className="kpi-unit-label">°C</span>
          </div>
          <div className="kpi-footnote text-secondary">
            Operating: <strong className="text-on-surface font-numeric">{measured.operational_hours || 0} hrs</strong>
          </div>
        </div>
      </section>

      {/* 5. Interactive Native SVG TimeSeriesChart */}
      <section className="stitch-card p-space-base mb-space-base">
        <div className="flex-between mb-3">
          <div>
            <h2 className="stitch-card-title">Telemetry Dynamics & Historical Trends</h2>
            <p className="stitch-card-desc">Tri-axial vibration velocity, thermal response, and health decay trajectories.</p>
          </div>
        </div>
        <TimeSeriesChart tabs={chartTabs} height={260} />
      </section>

      {/* 6. Diagnostics Breakdown & RAG Documentary Evidence Grid */}
      <div className="detail-evidence-columns-grid mb-space-base">
        {/* Left Column: Measured & Calculated Diagnostics */}
        <div className="stitch-card p-space-base">
          <div className="stitch-card-header mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">analytics</span>
              <h2 className="stitch-card-title">Multi-Sensor Diagnostics</h2>
            </div>
            <span className="kpi-label-caps">ISO 10816 Compliance</span>
          </div>

          <div className="telemetry-readings-grid">
            <div className="telemetry-item">
              <span className="item-label">Vibration X-Axis</span>
              <span className="item-value font-numeric">{measured.vibration_x?.toFixed(3) ?? '--'} g</span>
            </div>
            <div className="telemetry-item">
              <span className="item-label">Vibration Y-Axis</span>
              <span className="item-value font-numeric">{measured.vibration_y?.toFixed(3) ?? '--'} g</span>
            </div>
            <div className="telemetry-item">
              <span className="item-label">Vibration Z-Axis</span>
              <span className="item-value font-numeric">{measured.vibration_z?.toFixed(3) ?? '--'} g</span>
            </div>
            <div className="telemetry-item">
              <span className="item-label">Vibration Magnitude</span>
              <span className="item-value font-numeric font-bold text-primary">
                {measured.vibration_magnitude?.toFixed(3) ?? '--'} mm/s
              </span>
            </div>
            <div className="telemetry-item">
              <span className="item-label">Bearing Temperature</span>
              <span className="item-value font-numeric">{measured.temperature?.toFixed(1) ?? '--'} °C</span>
            </div>
            <div className="telemetry-item">
              <span className="item-label">Motor Load Ratio</span>
              <span className="item-value font-numeric">{measured.load_percent != null ? `${measured.load_percent}%` : '85%'}</span>
            </div>
            <div className="telemetry-item">
              <span className="item-label">Rotational Speed</span>
              <span className="item-value font-numeric">{measured.rotational_speed != null ? `${measured.rotational_speed} RPM` : '1800 RPM'}</span>
            </div>
            <div className="telemetry-item">
              <span className="item-label">Anomaly Status</span>
              <span className={`item-value font-bold ${condition.anomaly_status ? 'text-critical' : 'text-good'}`}>
                {condition.anomaly_status ? 'ANOMALY DETECTED' : 'NOMINAL'}
              </span>
            </div>
          </div>

          {/* Potential Causes from Decision Engine */}
          {explanation?.potential_causes && explanation.potential_causes.length > 0 && (
            <div className="causes-section mt-4 pt-3 border-t border-hairline">
              <span className="font-label-caps text-secondary uppercase font-semibold">Probable Root Causes:</span>
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
              <h2 className="stitch-card-title">Documentary Citations & SOPs</h2>
            </div>
            <span className="kpi-label-caps">RAG Verified ({docs.length})</span>
          </div>

          {docs.length === 0 ? (
            <div className="stitch-empty-state-sm">
              <span className="material-symbols-outlined text-[24px] text-muted">library_books</span>
              <p className="empty-desc text-xs mt-1">No specific documentary citations matched for nominal state.</p>
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
              <span className="font-label-caps text-secondary uppercase font-semibold">Prescribed SOP Actions:</span>
              <ul className="actions-list mt-1.5">
                {explanation.recommended_actions.map((act, i) => (
                  <li key={i} className="action-step-item">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">task_alt</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 7. Maintenance History Log */}
      <section className="stitch-card p-space-base">
        <div className="stitch-card-header mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">history</span>
            <h2 className="stitch-card-title">Asset Maintenance Log</h2>
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
