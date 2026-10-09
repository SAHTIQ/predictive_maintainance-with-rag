import React, { useState, useMemo } from 'react';
import { Machine, RecommendationDecision } from '../types';

interface FleetHealthMatrixProps {
  machines: Machine[];
  recsByMachine: Record<string, RecommendationDecision>;
  onSelectMachine: (machineId: string) => void;
  onOpenAIWithMachine?: (machineId: string) => void;
}

type ViewMode = 'bars' | 'heatmap';
type SortMode = 'id' | 'health-asc' | 'health-desc' | 'risk';

export const FleetHealthMatrix: React.FC<FleetHealthMatrixProps> = ({
  machines,
  recsByMachine,
  onSelectMachine,
  onOpenAIWithMachine,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('bars');
  const [sortMode, setSortMode] = useState<SortMode>('id');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'GOOD'>('ALL');
  const [hoveredMachineId, setHoveredMachineId] = useState<string | null>(null);

  // Compute stats and enrich machine list
  const enrichedMachines = useMemo(() => {
    return machines.map((m) => {
      const rec = recsByMachine[m.machine_id];
      const healthScore = rec?.current_condition?.health_score ?? (m.status === 'CRITICAL' ? 35 : m.status === 'WARNING' ? 62 : 92);
      const riskLevel = rec?.risk_assessment?.risk_level ?? (m.status === 'CRITICAL' ? 'CRITICAL' : m.status === 'WARNING' ? 'HIGH' : 'LOW');
      const healthState = rec?.current_condition?.health_state_label ?? (m.status === 'CRITICAL' ? 'Critical' : m.status === 'WARNING' ? 'Warning' : 'Good');
      const rulHours = rec?.current_condition?.rul_hours ?? (m.status === 'CRITICAL' ? 12 : m.status === 'WARNING' ? 48 : 280);
      const temp = rec?.measured_evidence?.temperature ?? 65;
      const vib = rec?.measured_evidence?.vibration_magnitude ?? 1.8;

      // Extract numeric suffix for natural 1..50 sorting
      const numericId = parseInt(m.machine_id.replace(/\D/g, ''), 10) || m.id;

      return {
        machine: m,
        numericId,
        healthScore: Math.max(0, Math.min(100, healthScore)),
        riskLevel,
        healthState,
        rulHours,
        temp,
        vib,
      };
    });
  }, [machines, recsByMachine]);

  // Filter & sort
  const displayMachines = useMemo(() => {
    let list = [...enrichedMachines];

    if (filterStatus !== 'ALL') {
      list = list.filter((item) => {
        if (filterStatus === 'CRITICAL') return item.riskLevel === 'CRITICAL' || item.healthState === 'Critical';
        if (filterStatus === 'WARNING') return item.riskLevel === 'HIGH' || item.healthState === 'Warning';
        if (filterStatus === 'GOOD') return item.healthState === 'Good' && item.riskLevel !== 'CRITICAL' && item.riskLevel !== 'HIGH';
        return true;
      });
    }

    list.sort((a, b) => {
      if (sortMode === 'id') return a.numericId - b.numericId;
      if (sortMode === 'health-asc') return a.healthScore - b.healthScore;
      if (sortMode === 'health-desc') return b.healthScore - a.healthScore;
      if (sortMode === 'risk') {
        const rank: Record<string, number> = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
        return (rank[b.riskLevel] || 0) - (rank[a.riskLevel] || 0) || a.healthScore - b.healthScore;
      }
      return 0;
    });

    return list;
  }, [enrichedMachines, filterStatus, sortMode]);

  // Summary counts
  const totalCount = enrichedMachines.length;
  const criticalCount = enrichedMachines.filter((m) => m.healthScore < 50 || m.riskLevel === 'CRITICAL').length;
  const warningCount = enrichedMachines.filter((m) => (m.healthScore >= 50 && m.healthScore < 75) || m.riskLevel === 'HIGH').length;
  const healthyCount = enrichedMachines.filter((m) => m.healthScore >= 75 && m.riskLevel !== 'CRITICAL' && m.riskLevel !== 'HIGH').length;
  const avgHealth = enrichedMachines.length > 0 
    ? enrichedMachines.reduce((acc, m) => acc + m.healthScore, 0) / enrichedMachines.length 
    : 0;

  // Color mapper helper based on score
  const getScoreColor = (score: number) => {
    if (score < 50) return '#EF4444'; // Red - Critical
    if (score < 75) return '#F59E0B'; // Amber - Warning
    return '#10B981'; // Green - Healthy
  };

  const hoveredData = useMemo(() => {
    if (!hoveredMachineId) return null;
    return enrichedMachines.find((m) => m.machine.machine_id === hoveredMachineId);
  }, [hoveredMachineId, enrichedMachines]);

  return (
    <section className="stitch-card p-4 flex flex-col gap-3.5">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-light)] pb-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h2 className="stitch-card-title flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--accent-blue)] text-[20px]">equalizer</span>
              Fleet Condition & Health Distribution
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-[var(--border-light)] text-[var(--text-secondary)] font-mono text-xs font-semibold">
              {totalCount} Machines
            </span>
          </div>
          <p className="stitch-card-desc text-xs">
            Comparative live health index across all {totalCount} assets (0–100 scale). Bar height and color indicate real-time operating condition.
          </p>
        </div>

        {/* View Mode & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Quick Filter Pills */}
          <div className="flex items-center gap-1 bg-[var(--border-light)] p-1 rounded-md text-xs font-medium">
            <button
              type="button"
              onClick={() => setFilterStatus('ALL')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterStatus === 'ALL'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('CRITICAL')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                filterStatus === 'CRITICAL'
                  ? 'bg-[#EF4444] text-white font-semibold shadow-sm'
                  : 'text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              Critical ({criticalCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('WARNING')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                filterStatus === 'WARNING'
                  ? 'bg-[#F59E0B] text-white font-semibold shadow-sm'
                  : 'text-[#F59E0B] hover:bg-[rgba(245,158,11,0.1)]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              Warning ({warningCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('GOOD')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                filterStatus === 'GOOD'
                  ? 'bg-[#10B981] text-white font-semibold shadow-sm'
                  : 'text-[#10B981] hover:bg-[rgba(16,185,129,0.1)]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              Healthy ({healthyCount})
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 text-xs">
            <label htmlFor="fleet-sort" className="text-[var(--text-muted)] font-medium hidden sm:inline">Sort:</label>
            <select
              id="fleet-sort"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs rounded px-2 py-1 outline-none font-medium cursor-pointer"
            >
              <option value="id">Machine ID (1 → {totalCount})</option>
              <option value="health-asc">Health: Lowest First (Urgent)</option>
              <option value="health-desc">Health: Highest First</option>
              <option value="risk">Risk Priority (P1 → P3)</option>
            </select>
          </div>

          {/* Visualization Toggle */}
          <div className="flex items-center bg-[var(--border-light)] p-0.5 rounded border border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => setViewMode('bars')}
              className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                viewMode === 'bars'
                  ? 'bg-[var(--bg-card)] text-[var(--accent-blue)] font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="Bar Chart Overview (Height proportional to score)"
            >
              <span className="material-symbols-outlined text-[16px]">bar_chart</span>
              <span className="hidden md:inline">Bars</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('heatmap')}
              className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                viewMode === 'heatmap'
                  ? 'bg-[var(--bg-card)] text-[var(--accent-blue)] font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="Dense Heatmap Matrix (Cell color by health)"
            >
              <span className="material-symbols-outlined text-[16px]">grid_view</span>
              <span className="hidden md:inline">Heatmap</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      {viewMode === 'bars' ? (
        <div className="relative w-full flex flex-col gap-1 select-none">
          {/* Reference Axis Limits */}
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] px-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981]" /> Safe Zone (75–100)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#F59E0B]" /> Advisory Watch (50–74)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#EF4444]" /> Critical Hazard (&lt;50)
              </span>
            </div>
            <span className="font-semibold text-[var(--text-secondary)]">
              Fleet Average: <strong className="font-mono text-[var(--text-primary)]">{avgHealth.toFixed(1)}/100</strong>
            </span>
          </div>

          {/* SVG / Flex Bar Chart Canvas */}
          <div className="relative w-full h-[190px] bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg p-2.5 pt-6 pb-6 flex items-end justify-between gap-1 overflow-x-auto">
            {/* Horizontal Baseline Guidelines */}
            <div className="absolute inset-x-2 top-6 border-b border-dashed border-[var(--border-color)] pointer-events-none opacity-60 flex items-center justify-between px-1">
              <span className="text-[9px] font-mono text-[var(--text-muted)] -mt-3.5">100 (Optimal)</span>
            </div>
            <div className="absolute inset-x-2 top-1/2 border-b border-dashed border-[var(--border-color)] pointer-events-none opacity-60 flex items-center justify-between px-1">
              <span className="text-[9px] font-mono text-[var(--text-muted)] -mt-3.5">50 (Threshold)</span>
            </div>

            {/* Bars for every machine (1 to 50+) */}
            {displayMachines.map((item) => {
              const heightPercent = Math.max(8, item.healthScore);
              const color = getScoreColor(item.healthScore);
              const isHovered = hoveredMachineId === item.machine.machine_id;

              return (
                <div
                  key={item.machine.machine_id}
                  onClick={() => onSelectMachine(item.machine.machine_id)}
                  onMouseEnter={() => setHoveredMachineId(item.machine.machine_id)}
                  onMouseLeave={() => setHoveredMachineId(null)}
                  className="flex-1 min-w-[12px] max-w-[28px] h-full flex flex-col items-center justify-end group cursor-pointer relative"
                >
                  {/* The bar element */}
                  <div
                    className="w-full rounded-t transition-all duration-150 relative"
                    style={{
                      height: `${heightPercent}%`,
                      backgroundColor: color,
                      opacity: hoveredMachineId && !isHovered ? 0.4 : isHovered ? 1 : 0.88,
                      transform: isHovered ? 'scaleY(1.04)' : 'none',
                      transformOrigin: 'bottom',
                      boxShadow: isHovered ? `0 0 8px ${color}` : 'none',
                    }}
                  >
                    {item.healthScore < 50 && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-ping" />
                    )}
                  </div>

                  {/* Machine ID Label under bar */}
                  <span
                    className={`mt-1 font-mono text-[9px] transition-colors whitespace-nowrap ${
                      isHovered
                        ? 'text-[var(--text-primary)] font-bold'
                        : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {item.numericId}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] px-1">
            <span>Machine #1 ({displayMachines[0]?.machine.machine_id || 'Start'})</span>
            <span>Click any machine bar for full diagnostic telemetry</span>
            <span>Machine #{displayMachines[displayMachines.length - 1]?.numericId} ({displayMachines[displayMachines.length - 1]?.machine.machine_id || 'End'})</span>
          </div>
        </div>
      ) : (
        /* Heatmap Grid Matrix */
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-10 lg:grid-cols-25 gap-1.5 p-2.5 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg">
            {displayMachines.map((item) => {
              const color = getScoreColor(item.healthScore);
              const isHovered = hoveredMachineId === item.machine.machine_id;

              return (
                <button
                  key={item.machine.machine_id}
                  type="button"
                  onClick={() => onSelectMachine(item.machine.machine_id)}
                  onMouseEnter={() => setHoveredMachineId(item.machine.machine_id)}
                  onMouseLeave={() => setHoveredMachineId(null)}
                  style={{
                    backgroundColor: item.healthScore < 50 
                      ? 'rgba(239, 68, 68, 0.2)' 
                      : item.healthScore < 75 
                      ? 'rgba(245, 158, 11, 0.2)' 
                      : 'rgba(16, 185, 129, 0.18)',
                    borderColor: color,
                  }}
                  className={`p-1.5 rounded border transition-all text-left flex flex-col justify-between h-[46px] relative group ${
                    isHovered ? 'ring-2 ring-[var(--accent-blue)] scale-105 z-10' : ''
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono text-[10px] font-bold text-[var(--text-primary)]">
                      #{item.numericId}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                  <div className="flex items-baseline justify-between w-full">
                    <span className="font-mono text-[11px] font-extrabold" style={{ color }}>
                      {item.healthScore.toFixed(0)}
                    </span>
                    <span className="text-[8px] font-mono text-[var(--text-muted)]">
                      {item.machine.machine_type}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] px-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[rgba(16,185,129,0.3)] border border-[#10B981]" /> Optimal (75–100)</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[rgba(245,158,11,0.3)] border border-[#F59E0B]" /> Warning (50–74)</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[rgba(239,68,68,0.3)] border border-[#EF4444]" /> Critical (&lt;50)</span>
            </div>
            <span>Showing {displayMachines.length} of {totalCount} monitored units</span>
          </div>
        </div>
      )}

      {/* Interactive Tooltip Inspector Callout (Pinned when hovering any machine) */}
      {hoveredData && (
        <div className="flex items-center justify-between p-2.5 bg-[var(--border-light)] border border-[var(--border-color)] rounded-md text-xs animate-fadeIn">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[var(--text-primary)] text-sm font-mono">
                {hoveredData.machine.machine_id}
              </span>
              <span className="text-[var(--text-muted)]">
                ({hoveredData.machine.machine_name || `Type ${hoveredData.machine.machine_type}`})
              </span>
            </div>

            <div className="flex items-center gap-2 border-l border-[var(--border-color)] pl-3">
              <span className="text-[var(--text-muted)]">Health Score:</span>
              <strong className="font-mono text-sm" style={{ color: getScoreColor(hoveredData.healthScore) }}>
                {hoveredData.healthScore.toFixed(1)} / 100
              </strong>
            </div>

            <div className="flex items-center gap-2 border-l border-[var(--border-color)] pl-3">
              <span className="text-[var(--text-muted)]">Vibration:</span>
              <strong className="font-mono text-[var(--text-primary)]">
                {hoveredData.vib.toFixed(2)} mm/s
              </strong>
            </div>

            <div className="flex items-center gap-2 border-l border-[var(--border-color)] pl-3">
              <span className="text-[var(--text-muted)]">Temperature:</span>
              <strong className="font-mono text-[var(--text-primary)]">
                {hoveredData.temp.toFixed(1)} °C
              </strong>
            </div>

            <div className="flex items-center gap-2 border-l border-[var(--border-color)] pl-3">
              <span className="text-[var(--text-muted)]">RUL:</span>
              <strong className="font-mono text-[var(--text-primary)]">
                {hoveredData.rulHours < 999 ? `${hoveredData.rulHours.toFixed(0)} hrs` : '> 30 days'}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAIWithMachine && (
              <button
                type="button"
                onClick={() => onOpenAIWithMachine(hoveredData.machine.machine_id)}
                className="stitch-btn-secondary px-2.5 py-1 text-xs"
                title={`Ask Resonex AI about ${hoveredData.machine.machine_id}`}
              >
                <span>✦ Ask AI</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onSelectMachine(hoveredData.machine.machine_id)}
              className="stitch-btn-primary px-3 py-1 text-xs"
            >
              <span>View Diagnostics →</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
