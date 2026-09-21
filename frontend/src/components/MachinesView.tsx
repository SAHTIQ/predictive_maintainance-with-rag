import React, { useState } from 'react';
import { Machine, RecommendationDecision } from '../types';
import { StatusBadge } from './StatusBadge';

interface MachinesViewProps {
  machines: Machine[];
  recsByMachine: Record<string, RecommendationDecision>;
  onSelectMachine: (machineId: string) => void;
}

export const MachinesView: React.FC<MachinesViewProps> = ({
  machines,
  recsByMachine,
  onSelectMachine,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');

  const machineTypes = Array.from(new Set(machines.map((m) => m.machine_type))).filter(Boolean);

  const filtered = machines.filter((m) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      m.machine_id.toLowerCase().includes(term) ||
      (m.machine_name && m.machine_name.toLowerCase().includes(term)) ||
      m.machine_type.toLowerCase().includes(term);

    if (!matchSearch) return false;
    if (typeFilter !== 'ALL' && m.machine_type !== typeFilter) return false;

    const rec = recsByMachine[m.machine_id];
    const healthLabel = (rec?.current_condition?.health_state_label || 'Good').toUpperCase();
    const riskLevel = (rec?.risk_assessment?.risk_level || 'LOW').toUpperCase();

    if (statusFilter !== 'ALL' && healthLabel !== statusFilter) return false;
    if (riskFilter !== 'ALL' && riskLevel !== riskFilter) return false;

    return true;
  });

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1 className="view-title">Machine Assets</h1>
          <p className="view-subtitle">
            Manage and inspect all {machines.length} monitored textile machines across your plant.
          </p>
        </div>
        <div className="view-header-stats">
          <span className="pill-counter">Showing {filtered.length} of {machines.length}</span>
        </div>
      </div>

      <div className="saas-card filter-toolbar">
        <div className="search-box-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="saas-input"
            placeholder="Search by Machine ID or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-btn" onClick={() => setSearchTerm('')}>×</button>
          )}
        </div>

        <div className="filter-selects-row">
          <div className="filter-item">
            <label className="filter-label">Machine Type</label>
            <select
              className="saas-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Types</option>
              {machineTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label className="filter-label">Health Condition</label>
            <select
              className="saas-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Health States</option>
              <option value="GOOD">Good</option>
              <option value="WARNING">Warning</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div className="filter-item">
            <label className="filter-label">Risk Level</label>
            <select
              className="saas-select"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
            >
              <option value="ALL">All Risk Levels</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
        </div>
      </div>

      <div className="saas-card table-card">
        <div className="table-responsive">
          <table className="saas-table">
            <thead>
              <tr>
                <th>Machine</th>
                <th>Type</th>
                <th>Health Score</th>
                <th>Status</th>
                <th>Remaining Life</th>
                <th>Risk Level</th>
                <th>Priority</th>
                <th>Maintenance Window</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-table-state">
                    No machines match the selected filters.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const rec = recsByMachine[m.machine_id];
                  const healthScore = rec?.current_condition?.health_score;
                  const healthLabel = rec?.current_condition?.health_state_label || 'Good';
                  const rul = rec?.current_condition?.rul_hours;
                  const riskLevel = rec?.risk_assessment?.risk_level || 'LOW';
                  const priority = rec?.risk_assessment?.maintenance_priority || 'P3 - ROUTINE';
                  const windowText = rec?.risk_assessment?.maintenance_time_window || 'Normal Operations';

                  return (
                    <tr
                      key={m.machine_id}
                      className="table-row-hover"
                      onClick={() => onSelectMachine(m.machine_id)}
                    >
                      <td>
                        <div className="machine-cell">
                          <span className="machine-id-text">{m.machine_id}</span>
                          {m.machine_name && (
                            <span className="machine-subname">{m.machine_name}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="type-tag">{m.machine_type}</span>
                      </td>
                      <td>
                        <div className="score-cell">
                          <span className="score-number">
                            {healthScore !== undefined ? healthScore.toFixed(0) : '--'}
                          </span>
                          <span className="score-max">/100</span>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={healthLabel} />
                      </td>
                      <td>
                        <span className="font-numeric">
                          {rul !== null && rul !== undefined ? `${rul.toFixed(1)} h` : '--'}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={riskLevel} />
                      </td>
                      <td>
                        <span className="priority-pill">{priority}</span>
                      </td>
                      <td className="text-muted text-sm">{windowText}</td>
                      <td className="text-right">
                        <button
                          className="saas-btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectMachine(m.machine_id);
                          }}
                        >
                          View →
                        </button>
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
