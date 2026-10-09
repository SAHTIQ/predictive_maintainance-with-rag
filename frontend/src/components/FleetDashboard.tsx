import React from 'react';
import { FleetOverview, RecommendationDecision, Machine } from '../types';
import { FleetHealthMatrix } from './FleetHealthMatrix';

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
            <span>Factory Command Center · Plant 1</span>
          </div>
          <h1 className="stitch-page-title">
            Good morning, Operator Jenkins
          </h1>
          <p className="stitch-page-desc">
            Continuous real-time monitoring active across all production lines.
            {criticalCount > 0 ? (
              <> <span className="font-bold text-critical">{criticalCount} machines need urgent attention</span> before the current shift ends (14:00 UTC).</>
            ) : (
              <> All machines are running smoothly with normal vibration and temperature levels.</>
            )}
          </p>
        </div>

        <div className="hero-right-actions">
          <div className="stitch-sync-pill">
            <span className="w-2 h-2 rounded-full bg-[#22C55E]"></span>
            <span className="sync-pill-text">Live Monitoring Active</span>
          </div>

          <button
            className="stitch-btn-secondary"
            onClick={() => onNavigateTab('machines')}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            <span>View & Filter Machines</span>
          </button>

          <button
            className="stitch-btn-primary"
            onClick={() => onNavigateTab('reports')}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Download Shift Report</span>
          </button>
        </div>
      </section>

      {/* 2. High-Density KPI Deck (4 Bento Cards matching Stitch) */}
      <section className="stitch-kpi-deck">
        {/* KPI 1: Fleet Inventory */}
        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">Total Monitored Machines</span>
            <div className="kpi-icon-wrap text-[#94A3B8]">
              <span className="material-symbols-outlined">hub</span>
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric">{total}</span>
            <span className="kpi-unit-label">Active Machines</span>
          </div>
          <div className="kpi-footnote text-[#94A3B8]">
            All factory lines reporting live sensor signals
          </div>
        </div>

        {/* KPI 2: Critical Demanding Intervention */}
        <div className={`stitch-kpi-card ${criticalCount > 0 ? 'critical-border' : ''}`}>
          <div className="kpi-card-header">
            <span className="kpi-label-caps text-[#EF4444]">Urgent Attention Needed</span>
            <div className="kpi-icon-wrap text-[#EF4444]">
              <span className="material-symbols-outlined">warning</span>
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val text-[#EF4444] font-numeric">{criticalCount}</span>
            <span className="kpi-unit-label text-[#EF4444] font-semibold">Critical</span>
          </div>
          <div className="kpi-footnote">
            {criticalCount > 0 ? (
              <span className="text-[#EF4444] font-medium">Severe vibration or overheating detected</span>
            ) : (
              <span className="text-[#22C55E] font-medium">All machines operating safely</span>
            )}
          </div>
        </div>

        {/* KPI 3: Fleet Health Index */}
        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">Overall Machine Health</span>
            <div className="kpi-icon-wrap text-[#94A3B8]">
              <span className="material-symbols-outlined">health_and_safety</span>
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric">{avgHealth.toFixed(1)}</span>
            <span className="kpi-unit-label">/ 100 Health</span>
          </div>
          <div className="kpi-footnote text-[#94A3B8]">
            Based on live vibration & heat data
          </div>
        </div>

        {/* KPI 4: Mean Remaining Useful Life */}
        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">Estimated Time Until Failure</span>
            <div className="kpi-icon-wrap text-[#94A3B8]">
              <span className="material-symbols-outlined">timelapse</span>
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric">{avgRul.toFixed(0)}</span>
            <span className="kpi-unit-label">Hours Left</span>
          </div>
          <div className="kpi-footnote text-[#94A3B8]">
            Average time before repairs are needed
          </div>
        </div>
      </section>

      {/* 3. Fleet Health Matrix & Condition Overview (All 1 to 50+ machines graph/heatmap) */}
      <FleetHealthMatrix
        machines={machines}
        recsByMachine={recsByMachine}
        onSelectMachine={onSelectMachine}
        onOpenAIWithMachine={onOpenAIWithMachine}
      />

      {/* 4. Priority Attention Machines Matrix */}
      <section className="stitch-card">
        <div className="stitch-card-header">
          <div>
            <h2 className="stitch-card-title">Machines Needing Attention</h2>
            <p className="stitch-card-desc">
              Sorted by urgency: machines with high vibration, overheating, or estimated to fail soon.
            </p>
          </div>
          <button
            className="stitch-btn-secondary"
            onClick={() => onNavigateTab('alerts')}
            type="button"
          >
            <span>View All Alarms</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>

        {attentionList.length === 0 ? (
          <div className="stitch-empty-state">
            <span className="material-symbols-outlined empty-symbol text-emerald-400">check_circle</span>
            <h3 className="empty-title">All Factory Machines Are Running Normally</h3>
            <p className="empty-desc">No active machine warnings, unusual shaking, or urgent repairs required.</p>
          </div>
        ) : (
          <div className="stitch-table-wrapper">
            <table className="stitch-table">
              <thead>
                <tr>
                  <th className="th-left">Machine ID</th>
                  <th className="th-left">Model</th>
                  <th className="th-center">Condition</th>
                  <th className="th-center">Risk Level</th>
                  <th className="th-right">Hours Left (RUL)</th>
                  <th className="th-right">Shaking (Vibration)</th>
                  <th className="th-right">Temperature</th>
                  <th className="th-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {attentionList.map(({ machine, riskLevel, healthLabel, healthScore, rul, temp, vib }) => {
                  const isCrit = riskLevel === 'CRITICAL' || healthLabel === 'Critical';
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
                          <span className="cell-id-text font-numeric font-medium">{machine.machine_id}</span>
                          {machine.machine_name && (
                            <span className="cell-sub-text">{machine.machine_name}</span>
                          )}
                        </div>
                      </td>
                      <td className="td-left text-[#94A3B8]">
                        Type {machine.machine_type}
                      </td>
                      <td className="td-center">
                        <span className={`status-chip ${healthLabel.toLowerCase()}`}>
                          <span className="chip-dot" />
                          <span>{healthLabel === 'Critical' ? 'Critical' : healthLabel === 'Warning' ? 'Warning' : 'Healthy'} ({healthScore.toFixed(0)})</span>
                        </span>
                      </td>
                      <td className="td-center">
                        <span className={`risk-pill ${riskLevel.toLowerCase()}`}>
                          {riskLevel}
                        </span>
                      </td>
                      <td className="td-right font-numeric font-medium">
                        <span className={rul < 24 ? 'text-[#EF4444] font-medium' : 'text-[#F1F5F9]'}>
                          {rul < 999 ? `${rul.toFixed(0)} hrs` : 'Normal'}
                        </span>
                      </td>
                      <td className="td-right font-numeric">
                        <span className={vib > 4.5 ? 'text-[#EF4444] font-medium' : 'text-[#94A3B8]'}>
                          {vib.toFixed(2)} mm/s
                        </span>
                      </td>
                      <td className="td-right font-numeric">
                        <span className={temp > 75 ? 'text-[#EF4444] font-medium' : 'text-[#94A3B8]'}>
                          {temp.toFixed(1)} °C
                        </span>
                      </td>
                      <td className="td-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {onOpenAIWithMachine && (
                            <button
                              className="stitch-btn-icon-ai"
                              onClick={() => onOpenAIWithMachine(machine.machine_id)}
                              title={`Ask AI Assistant about ${machine.machine_id}`}
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
                            <span>View Details</span>
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
