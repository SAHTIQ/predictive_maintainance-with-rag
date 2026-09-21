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
import { TimeSeriesChart, DataSeries } from './TimeSeriesChart';

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
        <p className="state-text">Fetching historical telemetry and running intelligence engines for {machineId}...</p>
      </div>
    );
  }

  if (error || !latestStatus) {
    return (
      <div className="state-container error">
        <div className="error-icon">⚠️</div>
        <h3>Failed to Load Machine Diagnostics</h3>
        <p className="error-message">{error || 'Unknown error occurred.'}</p>
        <div className="button-group">
          <button className="btn-secondary" onClick={onBack}>
            ← Back to Fleet
          </button>
          <button className="btn-primary" onClick={loadMachineData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Prepare chart series from historical data
  const tempSeries: DataSeries[] = [
    {
      name: 'Temperature',
      color: '#ef4444',
      data: sensorHistory.map((s) => ({ timestamp: s.timestamp, value: s.temperature })),
    },
  ];

  const vibSeries: DataSeries[] = [
    {
      name: 'Vibration X',
      color: '#3b82f6',
      data: sensorHistory.map((s) => ({ timestamp: s.timestamp, value: s.vibration_x })),
    },
    {
      name: 'Vibration Y',
      color: '#10b981',
      data: sensorHistory.map((s) => ({ timestamp: s.timestamp, value: s.vibration_y })),
    },
    {
      name: 'Vibration Z',
      color: '#8b5cf6',
      data: sensorHistory.map((s) => ({ timestamp: s.timestamp, value: s.vibration_z })),
    },
  ];

  const healthSeries: DataSeries[] = [
    {
      name: 'Health Score',
      color: '#10b981',
      data: healthHistory.map((h) => ({ timestamp: h.timestamp, value: h.health_score })),
    },
  ];

  const rulSeries: DataSeries[] = [
    {
      name: 'RUL Hours',
      color: '#f59e0b',
      data: healthHistory
        .filter((h) => h.rul_hours !== null && h.rul_hours !== undefined)
        .map((h) => ({ timestamp: h.timestamp, value: h.rul_hours as number })),
    },
  ];

  const riskScoreSeries: DataSeries[] = [
    {
      name: 'Risk Score',
      color: '#ef4444',
      data: riskHistory.map((r) => ({ timestamp: r.timestamp, value: r.risk_score })),
    },
  ];

  const condition = latestStatus.current_condition;
  const risk = latestStatus.risk_assessment;
  const explanation = latestStatus.generated_explanation;
  const measured = latestStatus.measured_evidence;
  const calculated = latestStatus.calculated_evidence;

  return (
    <div className="machine-detail">
      {/* Top Navigation Bar */}
      <div className="detail-top-nav">
        <button className="btn-back" onClick={onBack}>
          ← Back to Fleet Overview
        </button>
        <div className="machine-header-info">
          <span className="machine-id-badge">{machine?.machine_id}</span>
          <span className="machine-type-text">{machine?.machine_type}</span>
          {machine?.machine_name && <span className="machine-name-text">({machine.machine_name})</span>}
          <span className={`status-pill ${condition.health_state_label.toLowerCase()}`}>
            {condition.health_state_label}
          </span>
          <span className={`risk-pill ${risk.risk_level.toLowerCase()}`}>
            Risk: {risk.risk_level}
          </span>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <section className="detail-section">
        <div className="metrics-grid">
          <MetricCard
            title="Health Score"
            value={condition.health_score.toFixed(1)}
            unit="/100"
            subtitle={`State: ${condition.health_state_label}`}
            status={condition.health_score < 50 ? 'critical' : condition.health_score < 75 ? 'warning' : 'normal'}
          />
          <MetricCard
            title="Remaining Life (RUL)"
            value={condition.rul_hours !== null ? condition.rul_hours.toFixed(1) : '--'}
            unit="h"
            subtitle="Regressed horizon"
            status={condition.rul_hours !== null && condition.rul_hours < 48 ? 'critical' : 'normal'}
          />
          <MetricCard
            title="Operational Risk"
            value={risk.risk_score.toFixed(1)}
            unit="/100"
            subtitle={`Level: ${risk.risk_level}`}
            status={risk.risk_score > 70 ? 'critical' : risk.risk_score > 40 ? 'warning' : 'normal'}
          />
          <MetricCard
            title="Maintenance Priority"
            value={risk.maintenance_priority}
            subtitle={risk.maintenance_time_window}
            status={risk.risk_level === 'CRITICAL' ? 'critical' : risk.risk_level === 'HIGH' ? 'warning' : 'info'}
          />
          <MetricCard
            title="Anomaly Status"
            value={condition.anomaly_status ? 'ANOMALY DETECTED' : 'NORMAL'}
            subtitle={condition.anomaly_score !== null ? `Score: ${condition.anomaly_score.toFixed(3)}` : 'In nominal bounds'}
            status={condition.anomaly_status ? 'critical' : 'normal'}
          />
          <MetricCard
            title="Degradation Trend"
            value={condition.degradation_status}
            subtitle={condition.degradation_rate !== null ? `Rate: ${(condition.degradation_rate * 100).toFixed(2)}%/h` : 'Nominal'}
            status={condition.degradation_status === 'CRITICAL' || condition.degradation_status === 'RAPID' ? 'critical' : 'normal'}
          />
        </div>
      </section>

      {/* Latest Sensor Telemetry Panel */}
      <section className="detail-section telemetry-panel">
        <div className="section-header">
          <h2>Latest Sensor Telemetry</h2>
          <span className="section-subtext">Persisted Telemetry Snapshot</span>
        </div>

        <div className="sensor-readings-grid">
          <div className="sensor-box">
            <span className="sensor-label">Temperature</span>
            <span className="sensor-val">{measured.temperature !== null ? `${measured.temperature.toFixed(1)} °C` : '--'}</span>
          </div>
          <div className="sensor-box">
            <span className="sensor-label">Vibration X</span>
            <span className="sensor-val">{measured.vibration_x !== null ? `${measured.vibration_x.toFixed(3)} g` : '--'}</span>
          </div>
          <div className="sensor-box">
            <span className="sensor-label">Vibration Y</span>
            <span className="sensor-val">{measured.vibration_y !== null ? `${measured.vibration_y.toFixed(3)} g` : '--'}</span>
          </div>
          <div className="sensor-box">
            <span className="sensor-label">Vibration Z</span>
            <span className="sensor-val">{measured.vibration_z !== null ? `${measured.vibration_z.toFixed(3)} g` : '--'}</span>
          </div>
          <div className="sensor-box">
            <span className="sensor-label">Vibration Magnitude</span>
            <span className="sensor-val">{measured.vibration_magnitude !== null ? `${measured.vibration_magnitude.toFixed(3)} g` : '--'}</span>
          </div>
          <div className="sensor-box">
            <span className="sensor-label">Operating Hours</span>
            <span className="sensor-val">{measured.operational_hours !== null ? `${measured.operational_hours.toFixed(1)} h` : '--'}</span>
          </div>
          <div className="sensor-box">
            <span className="sensor-label">Load</span>
            <span className="sensor-val">{measured.load_percent !== null && measured.load_percent !== undefined ? `${measured.load_percent.toFixed(1)} %` : 'N/A'}</span>
          </div>
          <div className="sensor-box">
            <span className="sensor-label">Rotational Speed</span>
            <span className="sensor-val">{measured.rotational_speed !== null && measured.rotational_speed !== undefined ? `${measured.rotational_speed.toFixed(0)} RPM` : 'N/A'}</span>
          </div>
        </div>
      </section>

      {/* Historical Telemetry & Performance Trend Charts */}
      <section className="detail-section">
        <div className="section-header">
          <h2>Chronological Performance Trends ({sensorHistory.length} Telemetry Points)</h2>
        </div>

        <div className="charts-grid">
          <TimeSeriesChart
            title="Temperature (°C)"
            series={tempSeries}
            unit=" °C"
            threshold={70}
            thresholdLabel="Warning Limit"
          />
          <TimeSeriesChart
            title="Vibration Tri-Axial Components (g)"
            series={vibSeries}
            unit=" g"
            threshold={1.5}
            thresholdLabel="ISO 10816 Limit"
          />
          <TimeSeriesChart
            title="Adaptive Health Index Evolution"
            series={healthSeries}
            unit="/100"
            threshold={50}
            thresholdLabel="Critical Threshold"
          />
          <TimeSeriesChart
            title="Remaining Useful Life (RUL)"
            series={rulSeries}
            unit=" h"
            threshold={24}
            thresholdLabel="Urgent Horizon"
          />
          <TimeSeriesChart
            title="Maintenance Risk Score Evolution"
            series={riskScoreSeries}
            unit="/100"
            threshold={70}
            thresholdLabel="High Risk Limit"
          />
        </div>
      </section>

      {/* Operational Risk Diagnostic Breakdown */}
      <section className="detail-section risk-breakdown-section">
        <div className="section-header">
          <h2>Maintenance Risk Diagnostics</h2>
          <span className={`priority-badge ${risk.maintenance_priority.toLowerCase().replace(/\s+/g, '-')}`}>
            {risk.maintenance_priority}
          </span>
        </div>

        <div className="risk-details-grid">
          <div className="risk-overview-box">
            <div className="risk-stat">
              <span className="risk-stat-label">Evaluated Operational Risk</span>
              <span className="risk-stat-val">{risk.risk_score.toFixed(1)} / 100</span>
            </div>
            <div className="risk-stat">
              <span className="risk-stat-label">Priority Level</span>
              <span className="risk-stat-val">{risk.maintenance_priority}</span>
            </div>
            <div className="risk-stat">
              <span className="risk-stat-label">Action Window</span>
              <span className="risk-stat-val">{risk.maintenance_time_window}</span>
            </div>
          </div>

          <div className="risk-factors-box">
            <h3>Identified Risk Contributing Factors</h3>
            {risk.risk_factors && Object.keys(risk.risk_factors).length > 0 ? (
              <ul className="factors-list">
                {Object.entries(risk.risk_factors).map(([key, val]) => (
                  <li key={key}>
                    <strong>{key.replace(/_/g, ' ')}:</strong>{' '}
                    <span>{typeof val === 'number' ? val.toFixed(2) : String(val)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No elevated risk factors detected in this cycle.</p>
            )}
          </div>
        </div>
      </section>

      {/* 4-Tier Grounded Evidence & Explainable Decision */}
      <section className="detail-section recommendation-section">
        <div className="section-header">
          <h2>Grounded 4-Tier Maintenance Decision & RAG Evidence</h2>
          <span className="confidence-pill">
            Confidence: {(explanation.confidence * 100).toFixed(0)}%
          </span>
        </div>

        <div className="evidence-grid">
          {/* Tier 1: Measured Evidence */}
          <div className="evidence-card">
            <div className="evidence-card-header">
              <span className="tier-badge">Tier 1</span>
              <h3>Measured Evidence</h3>
            </div>
            <div className="evidence-card-body">
              <div className="evidence-item">
                <span>Vibration Magnitude:</span>
                <strong>{measured.vibration_magnitude?.toFixed(3) ?? '--'} g</strong>
              </div>
              <div className="evidence-item">
                <span>Temperature:</span>
                <strong>{measured.temperature?.toFixed(1) ?? '--'} °C</strong>
              </div>
              <div className="evidence-item">
                <span>Operating Hours:</span>
                <strong>{measured.operational_hours?.toFixed(1) ?? '--'} h</strong>
              </div>
            </div>
          </div>

          {/* Tier 2: Calculated Evidence */}
          <div className="evidence-card">
            <div className="evidence-card-header">
              <span className="tier-badge">Tier 2</span>
              <h3>Calculated Evidence</h3>
            </div>
            <div className="evidence-card-body">
              <div className="evidence-item">
                <span>Health Score / State:</span>
                <strong>{calculated.health_score.toFixed(1)} ({calculated.health_state_label})</strong>
              </div>
              <div className="evidence-item">
                <span>Anomaly Detection:</span>
                <strong>{calculated.anomaly_detected ? 'ANOMALOUS' : 'NORMAL'}</strong>
              </div>
              <div className="evidence-item">
                <span>RUL Projection:</span>
                <strong>{calculated.rul_hours !== null ? `${calculated.rul_hours.toFixed(1)} h` : '--'}</strong>
              </div>
              <div className="evidence-item">
                <span>Degradation Status:</span>
                <strong>{calculated.degradation_status}</strong>
              </div>
            </div>
          </div>

          {/* Tier 3: Retrieved Documentary Evidence */}
          <div className="evidence-card full-width">
            <div className="evidence-card-header">
              <span className="tier-badge">Tier 3</span>
              <h3>Retrieved Documentary Evidence (Context-Aware RAG)</h3>
            </div>
            <div className="evidence-card-body">
              {latestStatus.retrieved_documentary_evidence &&
              latestStatus.retrieved_documentary_evidence.length > 0 ? (
                <div className="rag-docs-list">
                  {latestStatus.retrieved_documentary_evidence.map((doc, idx) => (
                    <div key={idx} className="rag-doc-item">
                      <div className="doc-meta">
                        <span className="doc-title">{doc.title}</span>
                        <span className="doc-source">[{doc.source}]</span>
                        <span className="doc-category">{doc.category}</span>
                      </div>
                      <blockquote className="doc-content">{doc.content}</blockquote>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No documentary evidence required for this operational state.</p>
              )}
            </div>
          </div>

          {/* Tier 4: Generated Recommendation */}
          <div className="evidence-card full-width generated-recommendation-card">
            <div className="evidence-card-header">
              <span className="tier-badge generated">Tier 4</span>
              <h3>Generated Recommendation & Decision Explanation</h3>
              <span className="source-tag">Engine: {explanation.source}</span>
            </div>
            <div className="evidence-card-body">
              <div className="recommendation-summary">
                <h4>Condition Summary</h4>
                <p>{explanation.condition_summary}</p>
              </div>

              <div className="recommendation-reasoning">
                <h4>Decision Reasoning & Grounding</h4>
                <p>{explanation.reasoning}</p>
              </div>

              <div className="recommendation-columns">
                <div className="rec-col">
                  <h4>Potential Failure Causes</h4>
                  <ul>
                    {explanation.potential_causes.map((cause, idx) => (
                      <li key={idx}>{cause}</li>
                    ))}
                  </ul>
                </div>

                <div className="rec-col">
                  <h4>Recommended SOP Actions</h4>
                  <ul className="action-list">
                    {explanation.recommended_actions.map((action, idx) => (
                      <li key={idx}>
                        <span className="action-check">✓</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {explanation.sop_references && explanation.sop_references.length > 0 && (
                <div className="sop-refs">
                  <strong>Referenced SOP Codes:</strong> {explanation.sop_references.join(', ')}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Historical Maintenance Records Table */}
      <section className="detail-section">
        <div className="section-header">
          <h2>Maintenance Service History ({maintenanceHistory.length})</h2>
        </div>

        <div className="table-wrapper">
          <table className="machine-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Component</th>
                <th>Description</th>
                <th>Action Taken</th>
                <th>SOP Code</th>
                <th>Technician Notes</th>
              </tr>
            </thead>
            <tbody>
              {maintenanceHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-table-cell">
                    No logged maintenance interventions recorded for this asset.
                  </td>
                </tr>
              ) : (
                maintenanceHistory.map((rec) => (
                  <tr key={rec.id}>
                    <td className="font-mono text-sm">
                      {new Date(rec.maintenance_date).toLocaleDateString()}
                    </td>
                    <td>
                      <span className="maintenance-type-tag">{rec.maintenance_type}</span>
                    </td>
                    <td className="font-semibold">{rec.component}</td>
                    <td>{rec.description}</td>
                    <td>{rec.action_taken}</td>
                    <td className="font-mono text-sm">{rec.sop_code || '--'}</td>
                    <td className="text-muted text-sm">{rec.technician_notes || '--'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
