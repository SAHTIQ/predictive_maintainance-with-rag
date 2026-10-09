import React, { useState, useMemo } from 'react';
import { Machine, RecommendationDecision } from '../types';
import { useFleet } from '../context/FleetContext';
import { MachineRegistrationWizard } from './MachineRegistrationWizard';

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
  const { registerNewMachine } = useFleet();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState<{ machineId: string; machineName: string } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'GOOD' | 'AWAITING'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'id' | 'health' | 'rul' | 'risk' | 'vib' | 'temp'>('risk');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const machineTypes = useMemo(() => {
    return Array.from(new Set(machines.map((m) => m.machine_type))).filter(Boolean);
  }, [machines]);

  // Compute counts for status chips
  const { criticalCount, warningCount, optimalCount, awaitingCount } = useMemo(() => {
    let crit = 0;
    let warn = 0;
    let opt = 0;
    let awaitData = 0;
    machines.forEach((m) => {
      const isAwaiting = m.monitoring_readiness === 'Awaiting Data' || m.total_readings === 0;
      if (isAwaiting) {
        awaitData++;
        return;
      }
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
    return { criticalCount: crit, warningCount: warn, optimalCount: opt, awaitingCount: awaitData };
  }, [machines, recsByMachine]);

  // Filter and sort machines
  const filteredMachines = useMemo(() => {
    return machines
      .filter((m) => {
        const term = searchTerm.toLowerCase();
        const matchSearch =
          m.machine_id.toLowerCase().includes(term) ||
          (m.machine_name && m.machine_name.toLowerCase().includes(term)) ||
          m.machine_type.toLowerCase().includes(term) ||
          (m.manufacturer && m.manufacturer.toLowerCase().includes(term)) ||
          (m.serial_number && m.serial_number.toLowerCase().includes(term));

        if (!matchSearch) return false;
        if (typeFilter !== 'ALL' && m.machine_type !== typeFilter) return false;

        const isAwaiting = m.monitoring_readiness === 'Awaiting Data' || m.total_readings === 0;
        const rec = recsByMachine[m.machine_id];
        const health = (rec?.current_condition?.health_state_label || 'Good').toUpperCase();
        const risk = (rec?.risk_assessment?.risk_level || 'LOW').toUpperCase();
        const priority = rec?.risk_assessment?.maintenance_priority || 'P3';

        if (priorityFilter !== 'ALL' && priority !== priorityFilter) return false;

        if (statusFilter === 'AWAITING') return isAwaiting;
        if (isAwaiting && statusFilter !== 'ALL') return false;

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
          valA = recA?.current_condition?.health_score ?? (a.total_readings === 0 ? 0 : 100);
          valB = recB?.current_condition?.health_score ?? (b.total_readings === 0 ? 0 : 100);
        } else if (sortBy === 'rul') {
          valA = recA?.current_condition?.rul_hours ?? 999;
          valB = recB?.current_condition?.rul_hours ?? 999;
        } else if (sortBy === 'risk') {
          const riskRank: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, PENDING: 0 };
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
            <h1 className="stitch-page-title">All Factory Machines</h1>
            <span className="live-sync-tag">LIVE SYNC</span>
          </div>
          <p className="stitch-page-desc">
            Real-time health, vibration, and temperature monitoring for all {machines.length} production units across factory lines.
          </p>
        </div>

        {/* Action Button & Quick KPI Badges Strip */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs tracking-wider uppercase rounded-md shadow-md shadow-cyan-950/40 border border-cyan-400/40 transition-all duration-200 cursor-pointer"
            onClick={() => setIsWizardOpen(true)}
            type="button"
            id="add-machine-btn"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span>+ Add Machine</span>
          </button>

          <div className="workspace-quick-kpi-row">
            <div className="kpi-pill-item total">
              <span className="dot-indicator bg-[#94A3B8]" />
              <span className="pill-label">All Machines</span>
              <span className="pill-val font-numeric">{machines.length}</span>
            </div>
            {awaitingCount > 0 && (
              <div className="kpi-pill-item awaiting">
                <span className="dot-indicator bg-[#38BDF8]" />
                <span className="pill-label">Awaiting Data</span>
                <span className="pill-val font-numeric">{awaitingCount}</span>
              </div>
            )}
            <div className="kpi-pill-item critical">
              <span className="dot-indicator bg-[#EF4444]" />
              <span className="pill-label">Needs Urgent Fix</span>
              <span className="pill-val font-numeric">{criticalCount}</span>
            </div>
            <div className="kpi-pill-item warning">
              <span className="dot-indicator bg-[#F59E0B]" />
              <span className="pill-label">Check Soon</span>
              <span className="pill-val font-numeric">{warningCount}</span>
            </div>
            <div className="kpi-pill-item optimal">
              <span className="dot-indicator bg-[#22C55E]" />
              <span className="pill-label">Running Fine</span>
              <span className="pill-val font-numeric">{optimalCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Success Notification Banner */}
      {successBanner && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-950/50 border border-emerald-500/40 flex items-center justify-between text-sm animate-fade-in">
          <div className="flex items-center gap-2.5 text-emerald-300">
            <span className="material-symbols-outlined text-emerald-400">check_circle</span>
            <span>
              Machine <strong>{successBanner.machineId}</strong> ({successBanner.machineName}) registered successfully into plant registry. Ready for monitoring.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded transition-colors cursor-pointer"
              onClick={() => {
                onSelectMachine(successBanner.machineId);
                setSuccessBanner(null);
              }}
              type="button"
            >
              View Machine Telemetry →
            </button>
            <button
              className="text-slate-400 hover:text-white px-2 text-xs cursor-pointer"
              onClick={() => setSuccessBanner(null)}
              type="button"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* 2. Operator Workspace Filter Toolbar */}
      <div className="stitch-card p-space-sm mb-space-base">
        <div className="workspace-toolbar-row">
          {/* Universal Search Input */}
          <div className="workspace-search-wrap">
            <span className="material-symbols-outlined search-icon">search</span>
            <input
              type="text"
              className="workspace-search-input"
              placeholder="Search machine ID, line, or model..."
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
              All Machines ({machines.length})
            </button>
            {awaitingCount > 0 && (
              <button
                className={`segment-btn ${statusFilter === 'AWAITING' ? 'active' : ''}`}
                onClick={() => setStatusFilter('AWAITING')}
              >
                Awaiting Data ({awaitingCount})
              </button>
            )}
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
            <label className="toolbar-select-label">Model:</label>
            <select
              className="toolbar-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Models</option>
              {machineTypes.map((t) => (
                <option key={t} value={t}>Model {t}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter Dropdown */}
          <div className="toolbar-select-wrap">
            <label className="toolbar-select-label">Repair Priority:</label>
            <select
              className="toolbar-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="ALL">All Priorities</option>
              <option value="P1">P1 Urgent (Today)</option>
              <option value="P2">P2 High (48h)</option>
              <option value="P3">P3 Routine</option>
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
                  Machine ID {sortBy === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="th-left">Model</th>
                <th className="th-center sortable" onClick={() => handleHeaderSort('health')}>
                  Health Score {sortBy === 'health' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="th-center sortable" onClick={() => handleHeaderSort('risk')}>
                  Risk Level {sortBy === 'risk' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="th-right sortable" onClick={() => handleHeaderSort('rul')}>
                  Hours Left (RUL) {sortBy === 'rul' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="th-right sortable" onClick={() => handleHeaderSort('temp')}>
                  Temperature {sortBy === 'temp' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="th-right sortable" onClick={() => handleHeaderSort('vib')}>
                  Shaking (Vib) {sortBy === 'vib' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="th-center">Warning?</th>
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
                  const isAwaiting = m.monitoring_readiness === 'Awaiting Data' || m.total_readings === 0;
                  const rec = recsByMachine[m.machine_id];
                  const health = isAwaiting ? 'Awaiting Data' : (rec?.current_condition?.health_state_label || 'Good');
                  const healthScore = isAwaiting ? null : (rec?.current_condition?.health_score ?? 100);
                  const riskLevel = isAwaiting ? 'PENDING' : (rec?.risk_assessment?.risk_level || 'LOW');
                  const rul = isAwaiting ? null : rec?.current_condition?.rul_hours;
                  const temp = isAwaiting ? null : rec?.measured_evidence?.temperature;
                  const vib = isAwaiting ? null : rec?.measured_evidence?.vibration_magnitude;
                  const anomaly = isAwaiting ? false : (rec?.current_condition?.anomaly_status ?? false);
                  const priority = isAwaiting ? '--' : (rec?.risk_assessment?.maintenance_priority || 'P3');
                  const isCrit = !isAwaiting && (health === 'Critical' || riskLevel === 'CRITICAL');

                  return (
                    <tr
                      key={m.machine_id}
                      className={`stitch-row ${isCrit ? 'row-critical' : ''} ${isAwaiting ? 'row-awaiting' : ''}`}
                      onClick={() => onSelectMachine(m.machine_id)}
                      role="button"
                      tabIndex={0}
                    >
                      <td className="td-left">
                        <div className="machine-cell-id">
                          <span className="cell-id-text font-numeric font-medium">{m.machine_id}</span>
                          <span className="cell-sub-text">
                            {m.machine_name || (m.production_line ? `${m.production_line} · ${m.location || 'Bay'}` : `Cell Bay · Line ${((m.id % 4) + 1)}`)}
                          </span>
                        </div>
                      </td>
                      <td className="td-left text-[#94A3B8]">
                        Model {m.machine_type}
                      </td>
                      <td className="td-center">
                        {isAwaiting ? (
                          <span className="status-chip awaiting" title="Machine registered · awaiting sensor data">
                            <span className="chip-dot" />
                            <span>Awaiting Data</span>
                          </span>
                        ) : (
                          <span className={`status-chip ${health.toLowerCase()}`}>
                            <span className="chip-dot" />
                            <span>{health === 'Critical' ? 'Critical' : health === 'Warning' ? 'Warning' : 'Healthy'} ({healthScore?.toFixed(0)})</span>
                          </span>
                        )}
                      </td>
                      <td className="td-center">
                        <span className={`risk-pill ${riskLevel.toLowerCase()}`}>
                          {riskLevel}
                        </span>
                      </td>
                      <td className="td-right font-numeric font-medium">
                        {isAwaiting ? (
                          <span className="text-[#64748B] text-xs italic">Pending</span>
                        ) : rul != null ? (
                          <span className={rul < 24 ? 'text-[#EF4444] font-medium' : 'text-[#F1F5F9]'}>
                            {rul.toFixed(0)}h
                          </span>
                        ) : (
                          <span className="text-[#64748B]">Normal</span>
                        )}
                      </td>
                      <td className="td-right font-numeric">
                        {temp != null ? (
                          <span className={temp > 75 ? 'text-[#EF4444] font-medium' : 'text-[#94A3B8]'}>
                            {temp.toFixed(1)}°C
                          </span>
                        ) : (
                          <span className="text-[#64748B]">--</span>
                        )}
                      </td>
                      <td className="td-right font-numeric">
                        {vib != null ? (
                          <span className={vib > 4.5 ? 'text-[#EF4444] font-medium' : 'text-[#94A3B8]'}>
                            {vib.toFixed(2)} mm/s
                          </span>
                        ) : (
                          <span className="text-[#64748B]">--</span>
                        )}
                      </td>
                      <td className="td-center">
                        {isAwaiting ? (
                          <span className="text-[#64748B] text-xs">No Data</span>
                        ) : anomaly ? (
                          <span className="anomaly-badge alarm" title="Unusual Shaking or Heat Detected">
                            ALARM
                          </span>
                        ) : (
                          <span className="anomaly-badge nominal">OK</span>
                        )}
                      </td>
                      <td className="td-center">
                        {isAwaiting ? (
                          <span className="text-[#64748B] text-xs">--</span>
                        ) : (
                          <span className={`priority-tag ${priority.toLowerCase()}`}>
                            {priority}
                          </span>
                        )}
                      </td>
                      <td className="td-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {onOpenAIWithMachine && (
                            <button
                              className="stitch-btn-icon-ai"
                              onClick={() => onOpenAIWithMachine(m.machine_id)}
                              title={`Ask AI Assistant about ${m.machine_id}`}
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
                            <span>View Details</span>
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

      {/* Registration Modal Wizard */}
      {isWizardOpen && (
        <MachineRegistrationWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onSuccess={(newMachine) => {
            registerNewMachine(newMachine);
            setSuccessBanner({
              machineId: newMachine.machine_id,
              machineName: newMachine.machine_name || newMachine.machine_id,
            });
            setIsWizardOpen(false);
          }}
        />
      )}
    </div>
  );
};
