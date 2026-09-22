import React, { useState, useMemo } from 'react';
import { Machine, RecommendationDecision } from '../types';

interface MachinesViewProps {
  machines: Machine[];
  recsByMachine: Record<string, RecommendationDecision>;
  onSelectMachine: (machineId: string) => void;
  onOpenAIWithMachine?: (machineId: string) => void;
}

export const MachinesView: React.FC<MachinesViewProps> = ({
  machines,
  recsByMachine,
  onSelectMachine,
  onOpenAIWithMachine,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'GOOD'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'id' | 'health' | 'rul' | 'risk' | 'vib' | 'temp'>('risk');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const machineTypes = useMemo(() => {
    return Array.from(new Set(machines.map((m) => m.machine_type))).filter(Boolean);
  }, [machines]);

  // Compute counts for status chips
  const { criticalCount, warningCount, optimalCount } = useMemo(() => {
    let crit = 0;
    let warn = 0;
    let opt = 0;
    machines.forEach((m) => {
      const rec = recsByMachine[m.machine_id];
      const health = rec?.current_condition?.health_state_label || 'Good';
      const risk = rec?.risk_assessment?.risk_level || 'LOW';
      if (health === 'Critical' || risk === 'CRITICAL') {
        crit++;
      } else if (health === 'Warning' || risk === 'HIGH') {
        warn++;
      } else {
        opt++;
      }
    });
    return { criticalCount: crit, warningCount: warn, optimalCount: opt };
  }, [machines, recsByMachine]);

  // Filter and sort machines
  const filteredMachines = useMemo(() => {
    return machines
      .filter((m) => {
        const term = searchTerm.toLowerCase();
        const matchSearch =
          m.machine_id.toLowerCase().includes(term) ||
          (m.machine_name && m.machine_name.toLowerCase().includes(term)) ||
          m.machine_type.toLowerCase().includes(term);

        if (!matchSearch) return false;
        if (typeFilter !== 'ALL' && m.machine_type !== typeFilter) return false;

        const rec = recsByMachine[m.machine_id];
        const health = (rec?.current_condition?.health_state_label || 'Good').toUpperCase();
        const risk = (rec?.risk_assessment?.risk_level || 'LOW').toUpperCase();
        const priority = rec?.risk_assessment?.maintenance_priority || 'P3';

        if (priorityFilter !== 'ALL' && priority !== priorityFilter) return false;

        if (statusFilter === 'CRITICAL' && health !== 'CRITICAL' && risk !== 'CRITICAL') return false;
        if (statusFilter === 'WARNING' && health !== 'WARNING' && risk !== 'HIGH') return false;
        if (statusFilter === 'GOOD' && (health === 'CRITICAL' || health === 'WARNING' || risk === 'CRITICAL' || risk === 'HIGH')) return false;

        return true;
      })
      .sort((a, b) => {
        const recA = recsByMachine[a.machine_id];
        const recB = recsByMachine[b.machine_id];

        let valA: number = 0;
        let valB: number = 0;

        if (sortBy === 'health') {
          valA = recA?.current_condition?.health_score ?? 100;
          valB = recB?.current_condition?.health_score ?? 100;
        } else if (sortBy === 'rul') {
          valA = recA?.current_condition?.rul_hours ?? 999;
          valB = recB?.current_condition?.rul_hours ?? 999;
        } else if (sortBy === 'risk') {
          const riskRank: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          valA = riskRank[recA?.risk_assessment?.risk_level || 'LOW'] || 1;
          valB = riskRank[recB?.risk_assessment?.risk_level || 'LOW'] || 1;
        } else if (sortBy === 'vib') {
          valA = recA?.measured_evidence?.vibration_magnitude ?? 0;
          valB = recB?.measured_evidence?.vibration_magnitude ?? 0;
        } else if (sortBy === 'temp') {
          valA = recA?.measured_evidence?.temperature ?? 0;
          valB = recB?.measured_evidence?.temperature ?? 0;
        } else {
          return sortOrder === 'asc'
            ? a.machine_id.localeCompare(b.machine_id)
            : b.machine_id.localeCompare(a.machine_id);
        }

        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [machines, recsByMachine, searchTerm, statusFilter, typeFilter, priorityFilter, sortBy, sortOrder]);

  const handleHeaderSort = (key: typeof sortBy) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
  };

  return (
    <div className="view-page-container">
      {/* 1. Top Workspace Title & Quick Metric Strip */}
      <div className="workspace-header-strip">
        <div className="workspace-title-group">
          <div className="flex items-center gap-2">
            <h1 className="stitch-page-title">Machines Fleet Registry</h1>
            <span className="live-sync-tag">LIVE SYNC</span>
          </div>
          <p className="stitch-page-desc">
            Real-time telemetry, continuous vibration health, and degradation risk for all {machines.length} operational units across shop lines.
          </p>
        </div>

        {/* Quick KPI Badges Strip matching Stitch */}
        <div className="workspace-quick-kpi-row">
          <div className="kpi-pill-item total">
            <span className="dot-indicator bg-secondary" />
            <span className="pill-label">Total</span>
            <span className="pill-val font-numeric">{machines.length}</span>
          </div>
          <div className="kpi-pill-item critical">
            <span className="dot-indicator bg-error animate-pulse" />
            <span className="pill-label">Critical</span>
            <span className="pill-val font-numeric">{criticalCount}</span>
          </div>
          <div className="kpi-pill-item warning">
            <span className="dot-indicator bg-amber-500" />
            <span className="pill-label">Warning</span>
            <span className="pill-val font-numeric">{warningCount}</span>
          </div>
          <div className="kpi-pill-item optimal">
            <span className="dot-indicator bg-emerald-500" />
            <span className="pill-label">Optimal</span>
            <span className="pill-val font-numeric">{optimalCount}</span>
          </div>
        </div>
      </div>

      {/* 2. Operator Workspace Filter Toolbar */}
      <div className="stitch-card p-space-sm mb-space-base">
        <div className="workspace-toolbar-row">
          {/* Universal Search Input */}
          <div className="workspace-search-wrap">
            <span className="material-symbols-outlined search-icon">search</span>
            <input
              type="text"
              className="workspace-search-input"
              placeholder="Search machine ID, line, type, or bay..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="search-clear-btn" onClick={() => setSearchTerm('')}>×</button>
            )}
          </div>

          {/* Status Filter Segmented Buttons */}
          <div className="status-segmented-control">
            <button
              className={`segment-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              All ({machines.length})
            </button>
            <button
              className={`segment-btn ${statusFilter === 'CRITICAL' ? 'active' : ''}`}
              onClick={() => setStatusFilter('CRITICAL')}
            >
              Critical ({criticalCount})
            </button>
            <button
              className={`segment-btn ${statusFilter === 'WARNING' ? 'active' : ''}`}
              onClick={() => setStatusFilter('WARNING')}
            >
              Warning ({warningCount})
            </button>
            <button
              className={`segment-btn ${statusFilter === 'GOOD' ? 'active' : ''}`}
              onClick={() => setStatusFilter('GOOD')}
            >
              Healthy ({optimalCount})
            </button>
          </div>

          {/* Type Filter Dropdown */}
          <div className="toolbar-select-wrap">
            <label className="toolbar-select-label">Type:</label>
            <select
              className="toolbar-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Types</option>
              {machineTypes.map((t) => (
                <option key={t} value={t}>Type {t}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter Dropdown */}
          <div className="toolbar-select-wrap">
            <label className="toolbar-select-label">Priority:</label>
            <select
              className="toolbar-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="ALL">All Priorities</option>
              <option value="P1">P1 Immediate</option>
              <option value="P2">P2 High</option>
              <option value="P3">P3 Moderate</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. High-Density Machines Table */}
      <div className="stitch-card">
        <div className="stitch-table-wrapper">
          <table className="stitch-table">
            <thead>
              <tr>
                <th className="th-left sortable" onClick={() => handleHeaderSort('id')}>
                  Machine Asset {sortBy === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="th-left">Type</th>
                <th className="th-center sortable" onClick={() => handleHeaderSort('health')}>
                  Health Score {sortBy === 'health' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="th-center sortable" onClick={() => handleHeaderSort('risk')}>
                  Risk Level {sortBy === 'risk' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="th-right sortable" onClick={() => handleHeaderSort('rul')}>
                  Predicted RUL {sortBy === 'rul' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="th-right sortable" onClick={() => handleHeaderSort('temp')}>
                  Temp {sortBy === 'temp' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="th-right sortable" onClick={() => handleHeaderSort('vib')}>
                  Vib RMS {sortBy === 'vib' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="th-center">Anomaly</th>
                <th className="th-center">Priority</th>
                <th className="th-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMachines.length === 0 ? (
                <tr>
                  <td colSpan={10} className="td-empty">
                    <div className="stitch-empty-state">
                      <span className="material-symbols-outlined empty-symbol">search_off</span>
                      <h3 className="empty-title">No matching machines found</h3>
                      <p className="empty-desc">Try clearing the search query or adjusting your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMachines.map((m) => {
                  const rec = recsByMachine[m.machine_id];
                  const health = rec?.current_condition?.health_state_label || 'Good';
                  const healthScore = rec?.current_condition?.health_score ?? 100;
                  const riskLevel = rec?.risk_assessment?.risk_level || 'LOW';
                  const rul = rec?.current_condition?.rul_hours;
                  const temp = rec?.measured_evidence?.temperature;
                  const vib = rec?.measured_evidence?.vibration_magnitude;
                  const anomaly = rec?.current_condition?.anomaly_status ?? false;
                  const priority = rec?.risk_assessment?.maintenance_priority || 'P3';
                  const isCrit = health === 'Critical' || riskLevel === 'CRITICAL';

                  return (
                    <tr
                      key={m.machine_id}
                      className={`stitch-row ${isCrit ? 'row-critical' : ''}`}
                      onClick={() => onSelectMachine(m.machine_id)}
                      role="button"
                      tabIndex={0}
                    >
                      <td className="td-left">
                        <div className="machine-cell-id">
                          <span className="cell-id-text font-numeric font-bold">{m.machine_id}</span>
                          <span className="cell-sub-text">
                            {m.machine_name || `Cell Bay · Line ${((m.id % 4) + 1)}`}
                          </span>
                        </div>
                      </td>
                      <td className="td-left text-secondary">
                        Type {m.machine_type}
                      </td>
                      <td className="td-center">
                        <span className={`status-chip ${health.toLowerCase()}`}>
                          <span className="chip-dot" />
                          <span>{health} ({healthScore.toFixed(0)})</span>
                        </span>
                      </td>
                      <td className="td-center">
                        <span className={`risk-pill ${riskLevel.toLowerCase()}`}>
                          {riskLevel}
                        </span>
                      </td>
                      <td className="td-right font-numeric font-semibold">
                        {rul != null ? (
                          <span className={rul < 24 ? 'text-critical font-bold' : ''}>
                            {rul.toFixed(0)}h
                          </span>
                        ) : (
                          <span className="text-muted">Nominal</span>
                        )}
                      </td>
                      <td className="td-right font-numeric">
                        {temp != null ? (
                          <span className={temp > 75 ? 'text-critical font-bold' : ''}>
                            {temp.toFixed(1)}°C
                          </span>
                        ) : (
                          '--'
                        )}
                      </td>
                      <td className="td-right font-numeric">
                        {vib != null ? (
                          <span className={vib > 4.5 ? 'text-critical font-bold' : ''}>
                            {vib.toFixed(2)} mm/s
                          </span>
                        ) : (
                          '--'
                        )}
                      </td>
                      <td className="td-center">
                        {anomaly ? (
                          <span className="anomaly-badge alarm" title="Vibration Anomaly Detected">
                            ALARM
                          </span>
                        ) : (
                          <span className="anomaly-badge nominal">OK</span>
                        )}
                      </td>
                      <td className="td-center">
                        <span className={`priority-tag ${priority.toLowerCase()}`}>
                          {priority}
                        </span>
                      </td>
                      <td className="td-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {onOpenAIWithMachine && (
                            <button
                              className="stitch-btn-icon-ai"
                              onClick={() => onOpenAIWithMachine(m.machine_id)}
                              title={`Ask Resonex AI about ${m.machine_id}`}
                              type="button"
                            >
                              <span className="ai-sparkle">✦</span>
                            </button>
                          )}
                          <button
                            className="stitch-btn-inspect"
                            onClick={() => onSelectMachine(m.machine_id)}
                            type="button"
                          >
                            <span>Inspect</span>
                            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
