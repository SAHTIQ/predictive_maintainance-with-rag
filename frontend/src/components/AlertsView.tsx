import React, { useState } from 'react';
import { RecommendationDecision, Machine } from '../types';
import { StatusBadge } from './StatusBadge';

interface AlertsViewProps {
  recommendations: RecommendationDecision[];
  machines: Machine[];
  onSelectMachine: (machineId: string) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  recommendations,
  machines,
  onSelectMachine,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'>('ALL');

  const machineMap = machines.reduce<Record<string, Machine>>((acc, m) => {
    acc[m.machine_id] = m;
    return acc;
  }, {});

  const alertItems = recommendations.filter((r) => {
    const risk = r.risk_assessment?.risk_level || 'LOW';
    const health = r.current_condition?.health_state_label || 'Good';
    const hasAnomaly = r.current_condition?.anomaly_status;
    return risk === 'CRITICAL' || risk === 'HIGH' || risk === 'MEDIUM' || health === 'Critical' || hasAnomaly;
  });

  const sortedAlerts = [...alertItems].sort((a, b) => {
    const riskOrder: Record<string, number> = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
    const rA = riskOrder[a.risk_assessment?.risk_level || 'LOW'] || 0;
    const rB = riskOrder[b.risk_assessment?.risk_level || 'LOW'] || 0;
    return rB - rA;
  });

  const filteredAlerts = sortedAlerts.filter((item) => {
    if (severityFilter === 'ALL') return true;
    return (item.risk_assessment?.risk_level || '').toUpperCase() === severityFilter;
  });

  const criticalCount = alertItems.filter((i) => (i.risk_assessment?.risk_level || '') === 'CRITICAL').length;
  const highCount = alertItems.filter((i) => (i.risk_assessment?.risk_level || '') === 'HIGH').length;
  const mediumCount = alertItems.filter((i) => (i.risk_assessment?.risk_level || '') === 'MEDIUM').length;

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1 className="view-title">Active Alerts</h1>
          <p className="view-subtitle">
            Actionable equipment alerts requiring maintenance attention and inspection.
          </p>
        </div>
        <div className="alert-counts-summary">
          <button
            className={`alert-filter-chip ${severityFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setSeverityFilter('ALL')}
          >
            All Alerts ({alertItems.length})
          </button>
          <button
            className={`alert-filter-chip chip-critical ${severityFilter === 'CRITICAL' ? 'active' : ''}`}
            onClick={() => setSeverityFilter('CRITICAL')}
          >
            Critical ({criticalCount})
          </button>
          <button
            className={`alert-filter-chip chip-high ${severityFilter === 'HIGH' ? 'active' : ''}`}
            onClick={() => setSeverityFilter('HIGH')}
          >
            High ({highCount})
          </button>
          <button
            className={`alert-filter-chip chip-medium ${severityFilter === 'MEDIUM' ? 'active' : ''}`}
            onClick={() => setSeverityFilter('MEDIUM')}
          >
            Medium ({mediumCount})
          </button>
        </div>
      </div>

      <div className="alerts-list">
        {filteredAlerts.length === 0 ? (
          <div className="saas-card empty-state-box">
            <span className="empty-icon">✅</span>
            <h3>No Active Alerts Found</h3>
            <p>All monitored textile machines are operating within safe parameters for this filter.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const m = machineMap[alert.machine_id];
            const riskLevel = alert.risk_assessment?.risk_level || 'LOW';
            const priority = alert.risk_assessment?.maintenance_priority || 'P3';
            const actionWindow = alert.risk_assessment?.maintenance_time_window || 'Immediate';
            const healthScore = alert.current_condition?.health_score;
            const rul = alert.current_condition?.rul_hours;
            const exp = alert.generated_explanation;
            const firstAction = exp?.recommended_actions?.[0] || 'Perform routine inspection.';

            return (
              <div
                key={alert.machine_id}
                className={`saas-card alert-card-item alert-border-${riskLevel.toLowerCase()}`}
              >
                <div className="alert-card-header">
                  <div className="alert-machine-details">
                    <div className="alert-title-row">
                      <span className="alert-machine-id">{alert.machine_id}</span>
                      <span className="alert-machine-type">
                        {alert.machine_type || m?.machine_type || 'Machinery'}
                      </span>
                      {m?.machine_name && <span className="alert-machine-subname">({m.machine_name})</span>}
                    </div>
                    <div className="alert-badges-row">
                      <StatusBadge status={riskLevel} />
                      <StatusBadge status={priority} />
                      <span className="window-tag">Window: {actionWindow}</span>
                    </div>
                  </div>

                  <div className="alert-action-side">
                    <button
                      className="saas-btn-primary btn-sm"
                      onClick={() => onSelectMachine(alert.machine_id)}
                    >
                      View Machine Details →
                    </button>
                  </div>
                </div>

                <div className="alert-card-body">
                  <div className="alert-summary-box">
                    <span className="alert-summary-label">Condition Summary:</span>
                    <p className="alert-summary-text">
                      {exp?.condition_summary || 'Degradation and sensor vibration variance detected.'}
                    </p>
                  </div>

                  <div className="alert-recommended-box">
                    <span className="alert-rec-label">Primary Recommended Action:</span>
                    <p className="alert-rec-text">
                      <span className="action-bullet">→</span> {firstAction}
                    </p>
                  </div>

                  <div className="alert-metrics-strip">
                    <div className="alert-metric-unit">
                      <span className="amu-label">Health Score</span>
                      <span className="amu-val font-numeric">
                        {healthScore !== undefined ? healthScore.toFixed(1) : '--'}
                        <span className="amu-dim">/100</span>
                      </span>
                    </div>
                    <div className="alert-metric-unit">
                      <span className="amu-label">Remaining Life</span>
                      <span className="amu-val font-numeric">
                        {rul !== null && rul !== undefined ? `${rul.toFixed(1)} h` : '--'}
                      </span>
                    </div>
                    <div className="alert-metric-unit">
                      <span className="amu-label">Vibration Magnitude</span>
                      <span className="amu-val font-numeric">
                        {alert.measured_evidence?.vibration_magnitude?.toFixed(3) ?? '--'} g
                      </span>
                    </div>
                    <div className="alert-metric-unit">
                      <span className="amu-label">Bearing Temp</span>
                      <span className="amu-val font-numeric">
                        {alert.measured_evidence?.temperature?.toFixed(1) ?? '--'} °C
                      </span>
                    </div>
                    {exp?.sop_references && exp.sop_references.length > 0 && (
                      <div className="alert-metric-unit alert-sop-tag">
                        <span className="amu-label">SOP Standard</span>
                        <span className="amu-val-sop">{exp.sop_references.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
