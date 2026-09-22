import React from 'react';
import { FleetOverview, RecommendationDecision, Machine } from '../types';

interface FleetDashboardProps {
  overview: FleetOverview | null;
  machines: Machine[];
  recommendations: RecommendationDecision[];
  onSelectMachine: (machineId: string) => void;
  onNavigateTab: (tab: string) => void;
  onOpenAIWithMachine?: (machineId: string) => void;
}

export const FleetDashboard: React.FC<FleetDashboardProps> = ({
  overview,
  machines,
  recommendations,
  onSelectMachine,
  onNavigateTab,
  onOpenAIWithMachine,
}) => {
  const recsByMachine = recommendations.reduce<Record<string, RecommendationDecision>>((acc, rec) => {
    acc[rec.machine_id] = rec;
    return acc;
  }, {});

  const total = overview?.total_machines || machines.length;
  const good = overview?.health_states?.Good ?? machines.filter((m) => {
    const r = recsByMachine[m.machine_id];
    return !r || r.current_condition?.health_state_label === 'Good';
  }).length;
  const warning = overview?.health_states?.Warning ?? machines.filter((m) => {
    const r = recsByMachine[m.machine_id];
    return r?.current_condition?.health_state_label === 'Warning';
  }).length;
  const critical = overview?.health_states?.Critical ?? machines.filter((m) => {
    const r = recsByMachine[m.machine_id];
    return r?.current_condition?.health_state_label === 'Critical';
  }).length;

  const avgHealth = overview?.average_health_score !== undefined
    ? overview.average_health_score
    : 85;
  const avgRul = overview?.average_rul_hours !== undefined
    ? overview.average_rul_hours
    : 142;

  // Build sorted priority attention list
  const attentionList = machines
    .map((m) => {
      const rec = recsByMachine[m.machine_id];
      const riskLevel = rec?.risk_assessment?.risk_level || 'LOW';
      const healthLabel = rec?.current_condition?.health_state_label || 'Good';
      const healthScore = rec?.current_condition?.health_score ?? 100;
      const rul = rec?.current_condition?.rul_hours ?? 999;
      const priority = rec?.risk_assessment?.maintenance_priority || 'P3';
      const temp = rec?.measured_evidence?.temperature ?? 65;
      const vib = rec?.measured_evidence?.vibration_magnitude ?? 1.2;
      const isAttention = riskLevel === 'CRITICAL' || riskLevel === 'HIGH' || healthLabel === 'Critical' || healthLabel === 'Warning';
      return {
        machine: m,
        rec,
        riskLevel,
        healthLabel,
        healthScore,
        rul,
        priority,
        temp,
        vib,
        isAttention,
      };
    })
    .filter((item) => item.isAttention)
    .sort((a, b) => {
      const rank: Record<string, number> = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
      const rA = rank[a.riskLevel] || 0;
      const rB = rank[b.riskLevel] || 0;
      if (rB !== rA) return rB - rA;
      return a.healthScore - b.healthScore;
    });

  const criticalCount = attentionList.filter((a) => a.riskLevel === 'CRITICAL' || a.healthLabel === 'Critical').length;

  return (
    <div className="view-page-container">
      {/* 1. Operational Command Greeting & Header */}
      <section className="stitch-hero-banner">
        <div className="hero-left-col">
          <div className="command-matrix-tag">
            <span className="material-symbols-outlined text-[16px] text-primary">precision_manufacturing</span>
            <span>Operational Command Matrix · Plant Alpha</span>
          </div>
          <h1 className="stitch-page-title">
            Good morning, Operator Jenkins
          </h1>
          <p className="stitch-page-desc">
            Fleet Telemetry active across all lines.
            {criticalCount > 0 ? (
              <> <span className="font-semibold text-critical">{criticalCount} units demand intervention</span> before Shift A handoff (14:00 UTC).</>
            ) : (
              <> All systems nominal with continuous vibration signature tracking.</>
            )}
          </p>
        </div>

        <div className="hero-right-actions">
          <div className="stitch-sync-pill">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="sync-pill-text">Live Sync · Auto-streaming</span>
          </div>

          <button
            className="stitch-btn-secondary"
            onClick={() => onNavigateTab('machines')}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            <span>Fleet Filters</span>
          </button>

          <button
            className="stitch-btn-primary"
            onClick={() => onNavigateTab('reports')}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Shift Handover Log</span>
          </button>
        </div>
      </section>

      {/* 2. High-Density KPI Deck (4 Bento Cards matching Stitch) */}
      <section className="stitch-kpi-deck">
        {/* KPI 1: Fleet Inventory */}
        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">Total Fleet Monitored</span>
            <div className="kpi-icon-wrap text-primary">
              <span className="material-symbols-outlined">hub</span>
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric">{total}</span>
            <span className="kpi-unit-label">Units Active</span>
          </div>
          <div className="kpi-footnote text-secondary">
            100% telemetry online across Lines 1–4
          </div>
        </div>

        {/* KPI 2: Critical Demanding Intervention */}
        <div className={`stitch-kpi-card ${criticalCount > 0 ? 'critical-border' : ''}`}>
          <div className="kpi-card-header">
            <span className="kpi-label-caps text-critical">Demanding Intervention</span>
            <div className="kpi-icon-wrap text-critical">
              <span className="material-symbols-outlined">warning</span>
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val text-critical font-numeric">{criticalCount}</span>
            <span className="kpi-unit-label text-critical font-semibold">Alarm P1</span>
          </div>
          <div className="kpi-footnote">
            {criticalCount > 0 ? (
              <span className="text-critical font-medium">Critical degradation detected</span>
            ) : (
              <span className="text-good font-medium">No critical threshold breaches</span>
            )}
          </div>
        </div>

        {/* KPI 3: Fleet Health Index */}
        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">Fleet Health Index</span>
            <div className="kpi-icon-wrap text-emerald-600">
              <span className="material-symbols-outlined">health_and_safety</span>
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric">{avgHealth.toFixed(1)}</span>
            <span className="kpi-unit-label">/ 100</span>
          </div>
          <div className="kpi-footnote text-secondary">
            Composite sensor & ML regression score
          </div>
        </div>

        {/* KPI 4: Mean Remaining Useful Life */}
        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">Mean Remaining Life</span>
            <div className="kpi-icon-wrap text-blue-600">
              <span className="material-symbols-outlined">timelapse</span>
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric">{avgRul.toFixed(0)}</span>
            <span className="kpi-unit-label">Hours RUL</span>
          </div>
          <div className="kpi-footnote text-secondary">
            Fleet maintenance horizon buffer
          </div>
        </div>
      </section>

      {/* 3. Fleet Health Distribution Bar */}
      <section className="stitch-card p-space-base">
        <div className="flex-between mb-2">
          <span className="stitch-card-title">Fleet Operational Status Breakdown</span>
          <span className="kpi-label-caps">{total} Total Registered Assets</span>
        </div>
        <div className="fleet-distribution-bar">
          <div
            className="dist-segment good"
            style={{ width: `${(good / (total || 1)) * 100}%` }}
            title={`Good / Optimal: ${good}`}
          />
          <div
            className="dist-segment warning"
            style={{ width: `${(warning / (total || 1)) * 100}%` }}
            title={`Warning: ${warning}`}
          />
          <div
            className="dist-segment critical"
            style={{ width: `${(critical / (total || 1)) * 100}%` }}
            title={`Critical: ${critical}`}
          />
        </div>
        <div className="fleet-distribution-legend">
          <div className="legend-item">
            <span className="legend-dot good" />
            <span className="legend-label">Optimal:</span>
            <strong className="font-numeric">{good}</strong>
          </div>
          <div className="legend-item">
            <span className="legend-dot warning" />
            <span className="legend-label">Warning (Triage):</span>
            <strong className="font-numeric">{warning}</strong>
          </div>
          <div className="legend-item">
            <span className="legend-dot critical" />
            <span className="legend-label">Critical (Immediate):</span>
            <strong className="font-numeric">{critical}</strong>
          </div>
        </div>
      </section>

      {/* 4. Priority Attention Machines Matrix */}
      <section className="stitch-card">
        <div className="stitch-card-header">
          <div>
            <h2 className="stitch-card-title">Priority Machines Demanding Attention</h2>
            <p className="stitch-card-desc">
              Ranked dynamically by failure probability, vibration anomalies, and remaining useful life.
            </p>
          </div>
          <button
            className="stitch-btn-secondary"
            onClick={() => onNavigateTab('alerts')}
            type="button"
          >
            <span>View All in Action Center</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>

        {attentionList.length === 0 ? (
          <div className="stitch-empty-state">
            <span className="material-symbols-outlined empty-symbol text-emerald-500">check_circle</span>
            <h3 className="empty-title">All Fleet Machines Operating Within Nominal Thresholds</h3>
            <p className="empty-desc">No active anomalies, vibration surges, or urgent maintenance tickets detected.</p>
          </div>
        ) : (
          <div className="stitch-table-wrapper">
            <table className="stitch-table">
              <thead>
                <tr>
                  <th className="th-left">Machine Asset</th>
                  <th className="th-left">Type</th>
                  <th className="th-center">Health State</th>
                  <th className="th-center">Risk Level</th>
                  <th className="th-right">RUL Horizon</th>
                  <th className="th-right">Vib RMS</th>
                  <th className="th-right">Temp</th>
                  <th className="th-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {attentionList.map(({ machine, riskLevel, healthLabel, healthScore, rul, temp, vib }) => {
                  const isCrit = riskLevel === 'CRITICAL' || healthLabel === 'Critical';
                  const isWarn = riskLevel === 'HIGH' || healthLabel === 'Warning';
                  return (
                    <tr
                      key={machine.machine_id}
                      className={`stitch-row ${isCrit ? 'row-critical' : ''}`}
                      onClick={() => onSelectMachine(machine.machine_id)}
                      role="button"
                      tabIndex={0}
                    >
                      <td className="td-left">
                        <div className="machine-cell-id">
                          <span className="cell-id-text font-numeric font-bold">{machine.machine_id}</span>
                          {machine.machine_name && (
                            <span className="cell-sub-text">{machine.machine_name}</span>
                          )}
                        </div>
                      </td>
                      <td className="td-left text-secondary">
                        Type {machine.machine_type}
                      </td>
                      <td className="td-center">
                        <span className={`status-chip ${healthLabel.toLowerCase()}`}>
                          <span className="chip-dot" />
                          <span>{healthLabel} ({healthScore.toFixed(0)})</span>
                        </span>
                      </td>
                      <td className="td-center">
                        <span className={`risk-pill ${riskLevel.toLowerCase()}`}>
                          {riskLevel}
                        </span>
                      </td>
                      <td className="td-right font-numeric font-semibold">
                        <span className={rul < 24 ? 'text-critical' : 'text-on-surface'}>
                          {rul < 999 ? `${rul.toFixed(0)} hrs` : 'Nominal'}
                        </span>
                      </td>
                      <td className="td-right font-numeric">
                        <span className={vib > 4.5 ? 'text-critical font-bold' : ''}>
                          {vib.toFixed(2)} mm/s
                        </span>
                      </td>
                      <td className="td-right font-numeric">
                        <span className={temp > 75 ? 'text-critical font-bold' : ''}>
                          {temp.toFixed(1)} °C
                        </span>
                      </td>
                      <td className="td-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {onOpenAIWithMachine && (
                            <button
                              className="stitch-btn-icon-ai"
                              onClick={() => onOpenAIWithMachine(machine.machine_id)}
                              title={`Ask Resonex AI about ${machine.machine_id}`}
                              type="button"
                            >
                              <span className="ai-sparkle">✦</span>
                            </button>
                          )}
                          <button
                            className="stitch-btn-inspect"
                            onClick={() => onSelectMachine(machine.machine_id)}
                            type="button"
                          >
                            <span>Inspect</span>
                            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
