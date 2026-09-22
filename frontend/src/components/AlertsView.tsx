import React, { useState, useMemo } from 'react';
import { RecommendationDecision, Machine } from '../types';
import { AlertContext } from './ResonexAIDrawer';

interface AlertsViewProps {
  recommendations: RecommendationDecision[];
  machines: Machine[];
  onSelectMachine: (machineId: string) => void;
  onOpenAIWithAlert?: (alertContext: AlertContext) => void;
  onNavigateTab?: (tab: string) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  recommendations,
  machines,
  onSelectMachine,
  onOpenAIWithAlert,
  onNavigateTab,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

  const machineMap = useMemo(() => {
    return machines.reduce<Record<string, Machine>>((acc, m) => {
      acc[m.machine_id] = m;
      return acc;
    }, {});
  }, [machines]);

  // Derive real active alerts from recommendations and machine states
  const alertItems = useMemo(() => {
    return recommendations
      .filter((r) => {
        const risk = r.risk_assessment?.risk_level || 'LOW';
        const health = r.current_condition?.health_state_label || 'Good';
        const hasAnomaly = r.current_condition?.anomaly_status;
        return risk === 'CRITICAL' || risk === 'HIGH' || risk === 'MEDIUM' || health === 'Critical' || hasAnomaly;
      })
      .sort((a, b) => {
        const riskOrder: Record<string, number> = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
        const rA = riskOrder[a.risk_assessment?.risk_level || 'LOW'] || 0;
        const rB = riskOrder[b.risk_assessment?.risk_level || 'LOW'] || 0;
        if (rB !== rA) return rB - rA;
        return (a.current_condition?.rul_hours ?? 999) - (b.current_condition?.rul_hours ?? 999);
      });
  }, [recommendations]);

  const criticalCount = alertItems.filter((i) => (i.risk_assessment?.risk_level || '') === 'CRITICAL').length;
  const highCount = alertItems.filter((i) => (i.risk_assessment?.risk_level || '') === 'HIGH').length;
  const mediumCount = alertItems.filter((i) => (i.risk_assessment?.risk_level || '') === 'MEDIUM').length;

  const filteredAlerts = useMemo(() => {
    return alertItems.filter((alert) => {
      const risk = (alert.risk_assessment?.risk_level || '').toUpperCase();
      if (severityFilter !== 'ALL' && risk !== severityFilter) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const mid = alert.machine_id.toLowerCase();
        const m = machineMap[alert.machine_id];
        const mName = (m?.machine_name || '').toLowerCase();
        const cond = (alert.generated_explanation?.condition_summary || '').toLowerCase();
        return mid.includes(term) || mName.includes(term) || cond.includes(term);
      }
      return true;
    });
  }, [alertItems, severityFilter, searchTerm, machineMap]);

  const handleToggleAcknowledge = (machineId: string) => {
    setAcknowledgedIds((prev) => {
      const next = new Set(prev);
      if (next.has(machineId)) {
        next.delete(machineId);
      } else {
        next.add(machineId);
      }
      return next;
    });
  };

  const handleAcknowledgeAll = () => {
    const all = new Set(alertItems.map((a) => a.machine_id));
    setAcknowledgedIds(all);
  };

  const handleExportIncidentLog = () => {
    const rows = alertItems.map((a) => ({
      machine_id: a.machine_id,
      risk_level: a.risk_assessment?.risk_level,
      priority: a.risk_assessment?.maintenance_priority,
      health_score: a.current_condition?.health_score,
      rul_hours: a.current_condition?.rul_hours,
      temperature: a.measured_evidence?.temperature,
      vibration: a.measured_evidence?.vibration_magnitude,
      action: a.generated_explanation?.recommended_actions?.[0] || 'Inspect machine',
    }));
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resonex_incident_log_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  };

  return (
    <div className="view-page-container">
      {/* 1. Header & Quick Action Utilities matching Stitch */}
      <section className="stitch-card p-space-lg mb-space-base">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-base">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="stitch-page-title">Alerts & Action Center</h1>
              <div className="live-stream-badge">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
                </span>
                <span>LIVE ANOMALY STREAM</span>
              </div>
            </div>
            <p className="stitch-page-desc">
              Real-time anomaly triage, multi-sensor divergence alerts, and immediate mitigation dispatch across {machines.length} active assets.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className="stitch-btn-secondary"
              onClick={handleAcknowledgeAll}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">done_all</span>
              <span>Acknowledge All</span>
            </button>

            <button
              className="stitch-btn-secondary"
              onClick={handleExportIncidentLog}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">file_download</span>
              <span>Export Incident Log</span>
            </button>

            {onNavigateTab && (
              <button
                className="stitch-btn-primary"
                onClick={() => onNavigateTab('maintenance')}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                <span>Batch Maintenance Dispatch</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 2. Quick Summary KPI Deck matching Stitch */}
      <section className="stitch-kpi-deck mb-space-base">
        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">Total Alerts</span>
            <span className="material-symbols-outlined text-secondary text-[18px]">notifications_active</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric">{alertItems.length}</span>
            <span className="kpi-unit-label">Fleetwide</span>
          </div>
          <div className="kpi-footnote text-secondary">
            Across {alertItems.length} flagged machinery units
          </div>
        </div>

        <div className="stitch-kpi-card critical-border">
          <div className="kpi-card-header">
            <span className="kpi-label-caps text-critical">Critical (P1)</span>
            <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val text-critical font-numeric">{criticalCount}</span>
            <span className="kpi-unit-label text-critical font-semibold">Immediate</span>
          </div>
          <div className="kpi-footnote text-critical">
            Assets with imminent failure horizon
          </div>
        </div>

        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps text-[#ea580c]">High Risk (P2)</span>
            <span className="w-2 h-2 rounded-full bg-[#ea580c]" />
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val text-[#ea580c] font-numeric">{highCount}</span>
            <span className="kpi-unit-label text-[#ea580c] font-semibold">Triage</span>
          </div>
          <div className="kpi-footnote text-secondary">
            Degradation accelerating above baseline
          </div>
        </div>

        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps text-[#d97706]">Warning (P3)</span>
            <span className="w-2 h-2 rounded-full bg-[#d97706]" />
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val text-[#d97706] font-numeric">{mediumCount}</span>
            <span className="kpi-unit-label text-[#d97706] font-semibold">Watch</span>
          </div>
          <div className="kpi-footnote text-secondary">
            Early sensor drift under inspection
          </div>
        </div>
      </section>

      {/* 3. Filter Bar & Search */}
      <div className="stitch-card p-space-sm mb-space-base">
        <div className="workspace-toolbar-row">
          <div className="workspace-search-wrap">
            <span className="material-symbols-outlined search-icon">search</span>
            <input
              type="text"
              className="workspace-search-input"
              placeholder="Search alert by machine ID, reason, or condition..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="search-clear-btn" onClick={() => setSearchTerm('')}>×</button>
            )}
          </div>

          <div className="status-segmented-control">
            <button
              className={`segment-btn ${severityFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setSeverityFilter('ALL')}
            >
              All ({alertItems.length})
            </button>
            <button
              className={`segment-btn ${severityFilter === 'CRITICAL' ? 'active' : ''}`}
              onClick={() => setSeverityFilter('CRITICAL')}
            >
              Critical ({criticalCount})
            </button>
            <button
              className={`segment-btn ${severityFilter === 'HIGH' ? 'active' : ''}`}
              onClick={() => setSeverityFilter('HIGH')}
            >
              High ({highCount})
            </button>
            <button
              className={`segment-btn ${severityFilter === 'MEDIUM' ? 'active' : ''}`}
              onClick={() => setSeverityFilter('MEDIUM')}
            >
              Warning ({mediumCount})
            </button>
          </div>
        </div>
      </div>

      {/* 4. Actionable Alert Cards List */}
      {filteredAlerts.length === 0 ? (
        <div className="stitch-card p-12 text-center">
          <div className="stitch-empty-state">
            <span className="material-symbols-outlined empty-symbol text-emerald-500">task_alt</span>
            <h3 className="empty-title">No Active Alerts In This Category</h3>
            <p className="empty-desc">All monitored assets are operating within acceptable thresholds.</p>
          </div>
        </div>
      ) : (
        <div className="alerts-stream-list">
          {filteredAlerts.map((alert) => {
            const m = machineMap[alert.machine_id];
            const riskLevel = alert.risk_assessment?.risk_level || 'LOW';
            const priority = alert.risk_assessment?.maintenance_priority || 'P3';
            const isCritical = riskLevel === 'CRITICAL';
            const isAck = acknowledgedIds.has(alert.machine_id);
            const rul = alert.current_condition?.rul_hours;
            const temp = alert.measured_evidence?.temperature;
            const vib = alert.measured_evidence?.vibration_magnitude;
            const explanation = alert.generated_explanation;
            const action = explanation?.recommended_actions?.[0] || 'Inspect asset mechanical bearings & thermal sensors.';
            const conditionText = explanation?.condition_summary || explanation?.reasoning || 'Telemetry threshold exceeded.';

            const alertContext: AlertContext = {
              machineId: alert.machine_id,
              severity: riskLevel,
              condition: conditionText,
              rulHours: rul,
              diagnostics: `Temp: ${temp?.toFixed(1)}°C, Vib: ${vib?.toFixed(2)} mm/s`,
            };

            return (
              <div
                key={alert.machine_id}
                className={`alert-incident-card ${isCritical ? 'critical-border' : ''} ${isAck ? 'acknowledged' : ''}`}
              >
                {/* Alert Card Header */}
                <div className="alert-card-top-row">
                  <div className="flex items-center gap-3">
                    <span className="alert-machine-id font-numeric font-bold">{alert.machine_id}</span>
                    <span className={`risk-pill ${riskLevel.toLowerCase()} text-xs font-bold`}>
                      {riskLevel} ({priority})
                    </span>
                    <span className="alert-machine-meta">
                      Type {m?.machine_type || alert.machine_type || 'C'} · Bay {((m?.id ?? 1) % 6) + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAck && (
                      <span className="ack-status-tag">
                        <span className="material-symbols-outlined text-[14px]">check</span>
                        <span>Acknowledged</span>
                      </span>
                    )}
                    <span className="alert-timestamp-text font-numeric">
                      {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Condition Summary */}
                <div className="alert-condition-box">
                  <span className="material-symbols-outlined alert-condition-icon">warning</span>
                  <div className="alert-condition-body">
                    <span className="alert-condition-title">{conditionText}</span>
                    {explanation?.potential_causes && explanation.potential_causes.length > 0 && (
                      <p className="alert-cause-hint">
                        Potential Cause: {explanation.potential_causes.join('; ')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Telemetry Strip */}
                <div className="alert-telemetry-strip">
                  <div className="telemetry-chip">
                    <span className="chip-lbl">VIB RMS:</span>
                    <span className={`chip-val font-numeric ${vib && vib > 4.5 ? 'text-critical font-bold' : ''}`}>
                      {vib ? `${vib.toFixed(2)} mm/s` : '--'}
                    </span>
                  </div>
                  <div className="telemetry-chip">
                    <span className="chip-lbl">TEMP:</span>
                    <span className={`chip-val font-numeric ${temp && temp > 75 ? 'text-critical font-bold' : ''}`}>
                      {temp ? `${temp.toFixed(1)} °C` : '--'}
                    </span>
                  </div>
                  <div className="telemetry-chip">
                    <span className="chip-lbl">EST. RUL:</span>
                    <span className={`chip-val font-numeric ${rul && rul < 24 ? 'text-critical font-bold' : ''}`}>
                      {rul != null ? `${rul.toFixed(0)} Hours` : 'Nominal'}
                    </span>
                  </div>
                  <div className="telemetry-chip">
                    <span className="chip-lbl">HEALTH:</span>
                    <span className="chip-val font-numeric">
                      {alert.current_condition?.health_score?.toFixed(0)}/100
                    </span>
                  </div>
                </div>

                {/* Recommended Mitigation Action */}
                <div className="alert-prescribed-action">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600">build_circle</span>
                  <span className="action-text">
                    <strong>Recommended SOP:</strong> {action}
                  </span>
                </div>

                {/* Card Actions Footer */}
                <div className="alert-card-actions">
                  <div className="flex items-center gap-2">
                    {/* Priority AI Entry Point */}
                    {onOpenAIWithAlert && (
                      <button
                        className="stitch-btn-ai-launch"
                        onClick={() => onOpenAIWithAlert(alertContext)}
                        title={`Triage alert on ${alert.machine_id} with Resonex AI`}
                        type="button"
                      >
                        <span className="ai-sparkle">✦</span>
                        <span>Ask Resonex AI</span>
                      </button>
                    )}

                    {onNavigateTab && (
                      <button
                        className="stitch-btn-secondary text-xs"
                        onClick={() => onNavigateTab('maintenance')}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                        <span>Dispatch Work Order</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="stitch-btn-secondary text-xs"
                      onClick={() => handleToggleAcknowledge(alert.machine_id)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {isAck ? 'undo' : 'done'}
                      </span>
                      <span>{isAck ? 'Un-Acknowledge' : 'Acknowledge'}</span>
                    </button>

                    <button
                      className="stitch-btn-inspect text-xs"
                      onClick={() => onSelectMachine(alert.machine_id)}
                      type="button"
                    >
                      <span>Inspect Machine</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
