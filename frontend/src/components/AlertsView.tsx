import React, { useState, useMemo } from 'react';
import { RecommendationDecision, Machine } from '../types';
import { AlertContext } from './ResonexAIDrawer';
import { MOCK_RECOMMENDATIONS, MOCK_MACHINES } from '../services/mockData';

interface AlertsViewProps {
  recommendations: RecommendationDecision[];
  machines: Machine[];
  onSelectMachine: (machineId: string) => void;
  onOpenAIWithAlert?: (alertContext: AlertContext) => void;
  onNavigateTab?: (tab: string) => void;
}

const formatAlertTime = (ts?: string) => {
  if (!ts) return 'Just now';
  try {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? 'Just now' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Just now';
  }
};

const getActionString = (actionItem: any): string => {
  if (!actionItem) return 'Inspect asset mechanical bearings & thermal sensors.';
  if (typeof actionItem === 'string') return actionItem;
  if (typeof actionItem === 'object') {
    return actionItem.action || actionItem.description || actionItem.step || JSON.stringify(actionItem);
  }
  return String(actionItem);
};

const formatCauses = (causes: any): string => {
  if (!causes) return '';
  if (Array.isArray(causes)) {
    return causes
      .map((c) => {
        if (typeof c === 'string') return c;
        if (typeof c === 'object' && c !== null) return c.cause || c.name || JSON.stringify(c);
        return String(c);
      })
      .filter(Boolean)
      .join('; ');
  }
  if (typeof causes === 'string') return causes;
  return '';
};

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

  const effectiveMachines = machines && machines.length > 0 ? machines : MOCK_MACHINES;
  const effectiveRecs = recommendations && recommendations.length > 0 ? recommendations : MOCK_RECOMMENDATIONS;

  const machineMap = useMemo(() => {
    return effectiveMachines.reduce<Record<string, Machine>>((acc, m) => {
      acc[m.machine_id] = m;
      return acc;
    }, {});
  }, [effectiveMachines]);

  // Derive real active alerts from recommendations and machine states
  const alertItems = useMemo(() => {
    return effectiveRecs
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
  }, [effectiveRecs]);

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
      action: getActionString(a.generated_explanation?.recommended_actions?.[0]),
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
              <h1 className="stitch-page-title">Safety Alerts & Warning Feed</h1>
              <div className="live-stream-badge">
                <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                <span>LIVE WARNING FEED</span>
              </div>
            </div>
            <p className="stitch-page-desc">
              Live machine problems detected by sensors with plain-English reasons and automatic repair recommendations across {machines.length} active machines.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className="stitch-btn-secondary"
              onClick={handleAcknowledgeAll}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">done_all</span>
              <span>Mark All as Checked</span>
            </button>

            <button
              className="stitch-btn-secondary"
              onClick={handleExportIncidentLog}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">file_download</span>
              <span>Download Warning List</span>
            </button>

            {onNavigateTab && (
              <button
                className="stitch-btn-primary"
                onClick={() => onNavigateTab('maintenance')}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                <span>Create Repairs for All</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 2. Quick Summary KPI Deck matching Stitch */}
      <section className="stitch-kpi-deck mb-space-base">
        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">Total Warnings</span>
            <span className="material-symbols-outlined text-[#94A3B8] text-[18px]">notifications_active</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric">{alertItems.length}</span>
            <span className="kpi-unit-label">Active Warnings</span>
          </div>
          <div className="kpi-footnote text-[#94A3B8]">
            Across {alertItems.length} machines needing review
          </div>
        </div>

        <div className="stitch-kpi-card critical-border">
          <div className="kpi-card-header">
            <span className="kpi-label-caps text-[#EF4444]">Urgent Alarms (P1)</span>
            <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val text-[#EF4444] font-numeric">{criticalCount}</span>
            <span className="kpi-unit-label text-[#EF4444] font-semibold">Fix Today</span>
          </div>
          <div className="kpi-footnote text-[#EF4444]">
            Machines estimated to fail very soon
          </div>
        </div>

        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps text-[#F59E0B]">High Priority (P2)</span>
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val text-[#F59E0B] font-numeric">{highCount}</span>
            <span className="kpi-unit-label text-[#F59E0B] font-semibold">Inspect Soon</span>
          </div>
          <div className="kpi-footnote text-[#94A3B8]">
            Rapid wear or rising heat detected
          </div>
        </div>

        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps text-[#94A3B8]">Moderate (P3)</span>
            <span className="w-2 h-2 rounded-full bg-[#94A3B8]" />
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val text-[#94A3B8] font-numeric">{mediumCount}</span>
            <span className="kpi-unit-label text-[#94A3B8] font-semibold">Watch</span>
          </div>
          <div className="kpi-footnote text-[#94A3B8]">
            Can be fixed during routine maintenance
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
            <span className="material-symbols-outlined empty-symbol text-emerald-400">task_alt</span>
            <h3 className="empty-title">No Active Warnings In This Category</h3>
            <p className="empty-desc">All monitored machines are operating safely within normal limits.</p>
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
            const action = getActionString(explanation?.recommended_actions?.[0]);
            const conditionText = typeof explanation?.condition_summary === 'string' && explanation.condition_summary.trim()
              ? explanation.condition_summary
              : typeof explanation?.reasoning === 'string' && explanation.reasoning.trim()
              ? explanation.reasoning
              : 'Safety threshold exceeded.';
            const causeText = formatCauses(explanation?.potential_causes);

            const alertContext: AlertContext = {
              machineId: alert.machine_id,
              severity: riskLevel,
              condition: conditionText,
              rulHours: rul,
              diagnostics: `Temp: ${temp != null ? temp.toFixed(1) : '--'}°C, Vib: ${vib != null ? vib.toFixed(2) : '--'} mm/s`,
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
                      Model {m?.machine_type || alert.machine_type || 'C'} · Bay {((m?.id ?? 1) % 6) + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAck && (
                      <span className="ack-status-tag">
                        <span className="material-symbols-outlined text-[14px]">check</span>
                        <span>Checked</span>
                      </span>
                    )}
                    <span className="alert-timestamp-text font-numeric">
                      {formatAlertTime(alert.timestamp)}
                    </span>
                  </div>
                </div>

                {/* Condition Summary */}
                <div className="alert-condition-box">
                  <span className="material-symbols-outlined alert-condition-icon">warning</span>
                  <div className="alert-condition-body">
                    <span className="alert-condition-title">{conditionText}</span>
                    {causeText && (
                      <p className="alert-cause-hint">
                        Likely Reason: {causeText}
                      </p>
                    )}
                  </div>
                </div>

                {/* Telemetry Strip */}
                <div className="alert-telemetry-strip">
                  <div className="telemetry-chip">
                    <span className="chip-lbl">VIBRATION:</span>
                    <span className={`chip-val font-numeric ${vib && vib > 4.5 ? 'text-[#EF4444] font-medium' : ''}`}>
                      {vib ? `${vib.toFixed(2)} mm/s` : '--'}
                    </span>
                  </div>
                  <div className="telemetry-chip">
                    <span className="chip-lbl">HEAT:</span>
                    <span className={`chip-val font-numeric ${temp && temp > 75 ? 'text-[#EF4444] font-medium' : ''}`}>
                      {temp ? `${temp.toFixed(1)} °C` : '--'}
                    </span>
                  </div>
                  <div className="telemetry-chip">
                    <span className="chip-lbl">TIME LEFT:</span>
                    <span className={`chip-val font-numeric ${rul && rul < 24 ? 'text-[#EF4444] font-medium' : ''}`}>
                      {rul != null ? `${rul.toFixed(0)} Hours` : 'Normal'}
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
                  <span className="material-symbols-outlined text-[16px] text-emerald-400">build_circle</span>
                  <span className="action-text">
                    <strong>Recommended Repair Step:</strong> {action}
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
                        title={`Ask AI Assistant about ${alert.machine_id}`}
                        type="button"
                      >
                        <span className="ai-sparkle">✦</span>
                        <span>Ask AI Assistant</span>
                      </button>
                    )}

                    {onNavigateTab && (
                      <button
                        className="stitch-btn-secondary text-xs"
                        onClick={() => onNavigateTab('maintenance')}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                        <span>Create Repair Order</span>
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
                      <span>{isAck ? 'Mark as Unchecked' : 'Mark as Checked'}</span>
                    </button>

                    <button
                      className="stitch-btn-inspect text-xs"
                      onClick={() => onSelectMachine(alert.machine_id)}
                      type="button"
                    >
                      <span>View Machine Details</span>
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
