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
import { MetricCard } from './MetricCard';
import { TimeSeriesChart, ChartTab } from './TimeSeriesChart';
import { StatusBadge } from './StatusBadge';

interface MachineDetailProps {
  machineId: string;
  onBack: () => void;
}

export const MachineDetail: React.FC<MachineDetailProps> = ({ machineId, onBack }) => {
  const [machine, setMachine] = useState<Machine | null>(null);
  const [latestStatus, setLatestStatus] = useState<RecommendationDecision | null>(null);
  const [sensorHistory, setSensorHistory] = useState<SensorReading[]>([]);
  const [healthHistory, setHealthHistory] = useState<HealthRecord[]>([]);
  const [riskHistory, setRiskHistory] = useState<RiskRecord[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceRecord[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

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
      setError(err.message || `Failed to retrieve data for machine ${machineId}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMachineData();
  }, [machineId]);

  if (loading) {
    return (
      <div className="state-container">
        <div className="spinner"></div>
        <p className="state-text">Loading diagnostic telemetry for {machineId}...</p>
      </div>
    );
  }

  if (error || !latestStatus) {
    return (
      <div className="state-container error">
        <div className="error-icon">⚠️</div>
        <h3>Failed to Load Machine Details</h3>
        <p className="error-message">{error || 'No status available.'}</p>
        <div className="button-group">
          <button className="saas-btn-secondary" onClick={onBack}>
            ← Back
          </button>
          <button className="saas-btn-primary" onClick={loadMachineData}>
            Retry
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

  const chartTabs: ChartTab[] = [
    {
      id: 'temp',
      label: 'Temperature',
      unit: '°C',
      threshold: 70,
      thresholdLabel: 'Warning Limit',
      series: [
        {
          name: 'Bearing Temp',
          color: '#ef4444',
          data: sensorHistory.map((s) => ({ timestamp: s.timestamp, value: s.temperature })),
        },
      ],
    },
    {
      id: 'vibration',
      label: 'Vibration',
      unit: 'g',
      threshold: 1.5,
      thresholdLabel: 'ISO 10816 Limit',
      series: [
        {
          name: 'Vibration Magnitude',
          color: '#2563eb',
          data: sensorHistory.map((s) => ({ timestamp: s.timestamp, value: s.vibration_magnitude })),
        },
        {
          name: 'Vib X',
          color: '#60a5fa',
          data: sensorHistory.map((s) => ({ timestamp: s.timestamp, value: s.vibration_x })),
        },
        {
          name: 'Vib Y',
          color: '#10b981',
          data: sensorHistory.map((s) => ({ timestamp: s.timestamp, value: s.vibration_y })),
        },
        {
          name: 'Vib Z',
          color: '#8b5cf6',
          data: sensorHistory.map((s) => ({ timestamp: s.timestamp, value: s.vibration_z })),
        },
      ],
    },
    {
      id: 'health',
      label: 'Health Trend',
      unit: '/100',
      threshold: 50,
      thresholdLabel: 'Critical Threshold',
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
      label: 'Remaining Life (RUL)',
      unit: 'h',
      threshold: 24,
      thresholdLabel: 'Urgent Horizon',
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

  const isAttention =
    condition.health_state_label === 'Critical' ||
    condition.health_state_label === 'Warning' ||
    risk.risk_level === 'CRITICAL' ||
    risk.risk_level === 'HIGH';

  return (
    <div className="view-content machine-detail-view">
      <div className="detail-top-nav">
        <button className="back-link-btn" onClick={onBack}>
          <span className="back-arrow">←</span> Back
        </button>

        <div className="detail-header-row">
          <div className="detail-title-group">
            <div className="detail-title-main">
              <h1 className="detail-machine-id">{machine?.machine_id}</h1>
              <span className="detail-type-badge">{machine?.machine_type}</span>
              {machine?.machine_name && (
                <span className="detail-name-text">({machine.machine_name})</span>
              )}
            </div>
            <p className="detail-meta-text">
              Commissioned: {machine?.created_at ? new Date(machine.created_at).toLocaleDateString() : 'Active'} • Monitored via tri-axial vibration and thermal sensors
            </p>
          </div>

          <div className="detail-status-group">
            <StatusBadge status={condition.health_state_label} />
            <StatusBadge status={risk.risk_level} />
            <StatusBadge status={risk.maintenance_priority} />
          </div>
        </div>
      </div>

      <div className={`saas-card condition-banner ${isAttention ? 'banner-warning' : 'banner-good'}`}>
        <div className="banner-icon">{isAttention ? '⚠️' : '✅'}</div>
        <div className="banner-content">
          <h3 className="banner-title">
            {isAttention ? 'Maintenance Attention Recommended' : 'Operating Under Nominal Conditions'}
          </h3>
          <p className="banner-text">
            {explanation.condition_summary ||
              'Machine parameters are operating within established ISO vibration and thermal thresholds.'}
          </p>
        </div>
      </div>

      <div className="overview-kpi-grid">
        <MetricCard
          title="Health Score"
          value={condition.health_score.toFixed(0)}
          unit="/100"
          subtitle={`State: ${condition.health_state_label}`}
          icon={<span className="metric-icon-svg">❤️</span>}
        />
        <MetricCard
          title="Remaining Life (RUL)"
          value={condition.rul_hours !== null ? condition.rul_hours.toFixed(1) : '--'}
          unit="hours"
          subtitle="Estimated operating horizon"
          icon={<span className="metric-icon-svg">⏳</span>}
        />
        <MetricCard
          title="Operational Risk"
          value={risk.risk_score.toFixed(0)}
          unit="/100"
          subtitle={`Level: ${risk.risk_level}`}
          icon={<span className="metric-icon-svg">⚡</span>}
        />
        <MetricCard
          title="Bearing Temperature"
          value={measured.temperature !== null ? measured.temperature.toFixed(1) : '--'}
          unit="°C"
          subtitle="Latest reading"
          icon={<span className="metric-icon-svg">🌡️</span>}
        />
        <MetricCard
          title="Vibration Magnitude"
          value={measured.vibration_magnitude !== null ? measured.vibration_magnitude.toFixed(3) : '--'}
          unit="g"
          subtitle="Tri-axial resultant"
          icon={<span className="metric-icon-svg">〰️</span>}
        />
      </div>

      <div className="detail-chart-section">
        <TimeSeriesChart
          title="Chronological Telemetry & Diagnostic Trends"
          tabs={chartTabs}
          height={280}
        />
      </div>

      <div className="saas-card rec-action-card">
        <div className="card-header-clean">
          <div>
            <h2 className="rec-card-title">Recommended Maintenance Action</h2>
            <p className="card-subtitle-sm">
              Grounded action plan based on current telemetry, risk assessment, and standard operating procedures.
            </p>
          </div>
          <div className="rec-badge-group">
            <span className="confidence-pill">
              Confidence: {(explanation.confidence * 100).toFixed(0)}%
            </span>
            {explanation.sop_references && explanation.sop_references.length > 0 && (
              <span className="sop-pill">
                Source: {explanation.sop_references.join(', ')}
              </span>
            )}
          </div>
        </div>

        <div className="rec-action-body">
          <div className="action-steps-block">
            <h4>Recommended Actions</h4>
            <ul className="rec-steps-list">
              {explanation.recommended_actions.map((act, i) => (
                <li key={i} className="rec-step-item">
                  <span className="step-check">✓</span>
                  <span className="step-text">{act}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rec-why-block">
            <h4>Why is this action needed?</h4>
            <p className="reasoning-text">{explanation.reasoning}</p>

            {explanation.potential_causes && explanation.potential_causes.length > 0 && (
              <div className="potential-causes-group">
                <span className="causes-title">Potential Root Causes:</span>
                <ul className="causes-list">
                  {explanation.potential_causes.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="evidence-grid-row">
        <div className="saas-card evidence-col-card">
          <div className="card-header-clean">
            <h3>Measured Sensor Telemetry</h3>
            <span className="card-meta">Sensor Snapshot</span>
          </div>
          <div className="evidence-keyvals">
            <div className="ek-row">
              <span className="ek-label">Temperature</span>
              <span className="ek-val">{measured.temperature !== null ? `${measured.temperature.toFixed(1)} °C` : '--'}</span>
            </div>
            <div className="ek-row">
              <span className="ek-label">Vibration Magnitude</span>
              <span className="ek-val">{measured.vibration_magnitude !== null ? `${measured.vibration_magnitude.toFixed(3)} g` : '--'}</span>
            </div>
            <div className="ek-row">
              <span className="ek-label">Vibration X / Y / Z</span>
              <span className="ek-val font-numeric">
                {measured.vibration_x?.toFixed(2) ?? '--'} / {measured.vibration_y?.toFixed(2) ?? '--'} / {measured.vibration_z?.toFixed(2) ?? '--'} g
              </span>
            </div>
            <div className="ek-row">
              <span className="ek-label">Total Operating Hours</span>
              <span className="ek-val">{measured.operational_hours !== null ? `${measured.operational_hours.toFixed(1)} h` : '--'}</span>
            </div>
          </div>
        </div>

        <div className="saas-card evidence-col-card">
          <div className="card-header-clean">
            <h3>Calculated Diagnostics</h3>
            <span className="card-meta">Engine Outputs</span>
          </div>
          <div className="evidence-keyvals">
            <div className="ek-row">
              <span className="ek-label">Health Score</span>
              <span className="ek-val">{calculated.health_score.toFixed(1)} / 100 ({calculated.health_state_label})</span>
            </div>
            <div className="ek-row">
              <span className="ek-label">Anomaly Status</span>
              <span className="ek-val">{calculated.anomaly_detected ? 'Anomaly Detected' : 'Nominal'}</span>
            </div>
            <div className="ek-row">
              <span className="ek-label">Degradation Rate</span>
              <span className="ek-val">{calculated.degradation_status}</span>
            </div>
            <div className="ek-row">
              <span className="ek-label">Target Maintenance Window</span>
              <span className="ek-val font-semibold">{calculated.estimated_maintenance_time_window}</span>
            </div>
          </div>
        </div>

        <div className="saas-card evidence-col-card">
          <div className="card-header-clean">
            <h3>Cited Manuals & Standards</h3>
            <span className="card-meta">Context-Aware RAG</span>
          </div>
          <div className="rag-docs-compact">
            {latestStatus.retrieved_documentary_evidence && latestStatus.retrieved_documentary_evidence.length > 0 ? (
              latestStatus.retrieved_documentary_evidence.slice(0, 2).map((doc, idx) => (
                <div key={idx} className="rag-compact-item">
                  <div className="rag-compact-header">
                    <span className="rag-doc-title">{doc.title}</span>
                    <span className="rag-doc-tag">[{doc.source}]</span>
                  </div>
                  <p className="rag-compact-snippet">{doc.content}</p>
                </div>
              ))
            ) : (
              <p className="text-muted text-sm">Operating within nominal guidelines; no repair manual escalation required.</p>
            )}
          </div>
        </div>
      </div>

      <div className="saas-card table-card">
        <div className="card-header-clean">
          <div>
            <h3>Maintenance Service History</h3>
            <p className="card-subtitle-sm">Historical service and maintenance records for {machineId}.</p>
          </div>
          <span className="pill-counter">{maintenanceHistory.length} records</span>
        </div>

        <div className="table-responsive">
          <table className="saas-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Component</th>
                <th>Description</th>
                <th>Action Taken</th>
                <th>SOP Code</th>
              </tr>
            </thead>
            <tbody>
              {maintenanceHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-table-state">
                    No logged maintenance interventions recorded for this asset.
                  </td>
                </tr>
              ) : (
                maintenanceHistory.map((rec) => (
                  <tr key={rec.id}>
                    <td className="text-sm font-numeric">
                      {new Date(rec.maintenance_date).toLocaleDateString()}
                    </td>
                    <td>
                      <span className="type-tag">{rec.maintenance_type}</span>
                    </td>
                    <td className="font-semibold">{rec.component}</td>
                    <td>{rec.description}</td>
                    <td>{rec.action_taken}</td>
                    <td>
                      <span className="sop-code-badge">{rec.sop_code || '--'}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="technical-details-toggle-wrapper">
        <button
          className="saas-btn-secondary btn-sm"
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
        >
          {showTechnicalDetails ? '▲ Hide Technical Details' : '▼ View Technical Details'}
        </button>

        {showTechnicalDetails && (
          <div className="saas-card technical-details-box">
            <h4 className="tech-title">Underlying Intelligence Diagnostics</h4>
            <div className="tech-grid">
              <div className="tech-item">
                <span className="tech-label">Anomaly Detector Score:</span>
                <span className="tech-val">{condition.anomaly_score !== null ? condition.anomaly_score.toFixed(4) : 'N/A'}</span>
              </div>
              <div className="tech-item">
                <span className="tech-label">Degradation Slope Rate:</span>
                <span className="tech-val">{calculated.degradation_slope !== null ? `${(calculated.degradation_slope * 100).toFixed(4)} %/h` : 'N/A'}</span>
              </div>
              <div className="tech-item">
                <span className="tech-label">Risk Evaluation Factors:</span>
                <span className="tech-val">
                  {risk.risk_factors ? Object.entries(risk.risk_factors).map(([k, v]) => `${k}: ${v}`).join(', ') : 'Nominal'}
                </span>
              </div>
              <div className="tech-item">
                <span className="tech-label">Recommendation Engine Backend:</span>
                <span className="tech-val">{explanation.source}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
