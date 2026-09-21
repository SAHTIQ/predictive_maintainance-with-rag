import React, { useState, useEffect } from 'react';
import { FleetOverview, Machine, RecommendationDecision } from '../types';
import { api } from '../services/api';
import { MetricCard } from './MetricCard';

interface FleetDashboardProps {
  onSelectMachine: (machineId: string) => void;
}

export const FleetDashboard: React.FC<FleetDashboardProps> = ({ onSelectMachine }) => {
  const [overview, setOverview] = useState<FleetOverview | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationDecision[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewData, machinesData, recsData] = await Promise.all([
        api.getFleetOverview(),
        api.getMachines(),
        api.getFleetRecommendations().catch(() => []),
      ]);
      setOverview(overviewData);
      setMachines(machinesData);
      setRecommendations(recsData);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to backend service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Map recommendation data by machine_id for quick table lookup
  const recsByMachine = recommendations.reduce<Record<string, RecommendationDecision>>((acc, rec) => {
    acc[rec.machine_id] = rec;
    return acc;
  }, {});

  // Filtered machines
  const filteredMachines = machines.filter((m) => {
    const matchesSearch =
      m.machine_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.machine_name && m.machine_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      m.machine_type.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;

    const rec = recsByMachine[m.machine_id];
    if (statusFilter === 'CRITICAL' && rec?.risk_assessment?.risk_level === 'CRITICAL') return true;
    if (statusFilter === 'HIGH' && rec?.risk_assessment?.risk_level === 'HIGH') return true;
    if (statusFilter === 'WARNING' && rec?.current_condition?.health_state_label === 'Warning') return true;
    if (statusFilter === 'GOOD' && rec?.current_condition?.health_state_label === 'Good') return true;

    return false;
  });

  if (loading) {
    return (
      <div className="state-container">
        <div className="spinner"></div>
        <p className="state-text">Loading fleet telemetry and diagnostics from FastAPI backend...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="state-container error">
        <div className="error-icon">⚠️</div>
        <h3>Backend Communication Failure</h3>
        <p className="error-message">{error}</p>
        <button className="btn-primary" onClick={loadDashboardData}>
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="fleet-dashboard">
      {/* Fleet KPIs Overview */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>Fleet Operational Overview</h2>
          <span className="section-badge">Live PostgreSQL Persisted</span>
        </div>

        <div className="metrics-grid">
          <MetricCard
            title="Total Machines"
            value={overview?.total_machines ?? 0}
            subtitle="Monitored in system"
            status="info"
          />
          <MetricCard
            title="Good Condition"
            value={overview?.health_states?.Good ?? 0}
            subtitle="Operating normally"
            status="normal"
          />
          <MetricCard
            title="Warning Condition"
            value={overview?.health_states?.Warning ?? 0}
            subtitle="Moderate degradation"
            status="warning"
          />
          <MetricCard
            title="Critical Condition"
            value={overview?.health_states?.Critical ?? 0}
            subtitle="Immediate review required"
            status="critical"
          />
          <MetricCard
            title="High-Risk Alerts"
            value={overview?.machines_requiring_maintenance_count ?? 0}
            subtitle="P0 & P1 operational risks"
            status="critical"
          />
          <MetricCard
            title="Avg Health Score"
            value={overview?.average_health_score !== undefined ? overview.average_health_score.toFixed(1) : '--'}
            unit="/100"
            subtitle="Fleet composite average"
            status="info"
          />
          <MetricCard
            title="Avg Remaining Life"
            value={overview?.average_rul_hours !== undefined ? overview.average_rul_hours.toFixed(1) : '--'}
            unit="h"
            subtitle="Estimated RUL average"
            status="info"
          />
        </div>
      </section>

      {/* Fleet Distribution Visualizations */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>Risk & Health Distribution</h2>
        </div>

        <div className="distribution-grid">
          {/* Health Distribution Card */}
          <div className="distribution-card">
            <h3>Health State Breakdown</h3>
            <div className="distribution-bars">
              <div className="dist-row">
                <span className="dist-label">Good</span>
                <div className="dist-track">
                  <div
                    className="dist-fill good"
                    style={{
                      width: `${((overview?.health_states?.Good || 0) / (overview?.total_machines || 1)) * 100}%`,
                    }}
                  />
                </div>
                <span className="dist-count">{overview?.health_states?.Good || 0}</span>
              </div>
              <div className="dist-row">
                <span className="dist-label">Warning</span>
                <div className="dist-track">
                  <div
                    className="dist-fill warning"
                    style={{
                      width: `${((overview?.health_states?.Warning || 0) / (overview?.total_machines || 1)) * 100}%`,
                    }}
                  />
                </div>
                <span className="dist-count">{overview?.health_states?.Warning || 0}</span>
              </div>
              <div className="dist-row">
                <span className="dist-label">Critical</span>
                <div className="dist-track">
                  <div
                    className="dist-fill critical"
                    style={{
                      width: `${((overview?.health_states?.Critical || 0) / (overview?.total_machines || 1)) * 100}%`,
                    }}
                  />
                </div>
                <span className="dist-count">{overview?.health_states?.Critical || 0}</span>
              </div>
            </div>
          </div>

          {/* Risk Level Card */}
          <div className="distribution-card">
            <h3>Maintenance Risk Levels</h3>
            <div className="distribution-bars">
              <div className="dist-row">
                <span className="dist-label">Low Risk</span>
                <div className="dist-track">
                  <div
                    className="dist-fill low"
                    style={{
                      width: `${((overview?.risk_levels?.LOW || 0) / (overview?.total_machines || 1)) * 100}%`,
                    }}
                  />
                </div>
                <span className="dist-count">{overview?.risk_levels?.LOW || 0}</span>
              </div>
              <div className="dist-row">
                <span className="dist-label">Medium Risk</span>
                <div className="dist-track">
                  <div
                    className="dist-fill medium"
                    style={{
                      width: `${((overview?.risk_levels?.MEDIUM || 0) / (overview?.total_machines || 1)) * 100}%`,
                    }}
                  />
                </div>
                <span className="dist-count">{overview?.risk_levels?.MEDIUM || 0}</span>
              </div>
              <div className="dist-row">
                <span className="dist-label">High Risk</span>
                <div className="dist-track">
                  <div
                    className="dist-fill high"
                    style={{
                      width: `${((overview?.risk_levels?.HIGH || 0) / (overview?.total_machines || 1)) * 100}%`,
                    }}
                  />
                </div>
                <span className="dist-count">{overview?.risk_levels?.HIGH || 0}</span>
              </div>
              <div className="dist-row">
                <span className="dist-label">Critical Risk</span>
                <div className="dist-track">
                  <div
                    className="dist-fill critical-risk"
                    style={{
                      width: `${((overview?.risk_levels?.CRITICAL || 0) / (overview?.total_machines || 1)) * 100}%`,
                    }}
                  />
                </div>
                <span className="dist-count">{overview?.risk_levels?.CRITICAL || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Machine Table Section */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>Monitored Assets ({filteredMachines.length})</h2>
          <div className="table-controls">
            <input
              type="text"
              placeholder="Search by Machine ID or Type..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="CRITICAL">Critical Risk</option>
              <option value="HIGH">High Risk</option>
              <option value="WARNING">Warning Condition</option>
              <option value="GOOD">Good Condition</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="machine-table">
            <thead>
              <tr>
                <th>Machine ID</th>
                <th>Type</th>
                <th>Health Score</th>
                <th>Health State</th>
                <th>Est. RUL</th>
                <th>Risk Score</th>
                <th>Risk Level</th>
                <th>Priority</th>
                <th>Maintenance Window</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredMachines.length === 0 ? (
                <tr>
                  <td colSpan={10} className="empty-table-cell">
                    No matching machines found.
                  </td>
                </tr>
              ) : (
                filteredMachines.map((m) => {
                  const rec = recsByMachine[m.machine_id];
                  const healthScore = rec?.current_condition?.health_score;
                  const healthLabel = rec?.current_condition?.health_state_label || 'Good';
                  const rul = rec?.current_condition?.rul_hours;
                  const riskScore = rec?.risk_assessment?.risk_score;
                  const riskLevel = rec?.risk_assessment?.risk_level || 'LOW';
                  const priority = rec?.risk_assessment?.maintenance_priority || 'P3 - ROUTINE';
                  const windowText = rec?.risk_assessment?.maintenance_time_window || 'Normal Operations';

                  return (
                    <tr
                      key={m.machine_id}
                      onClick={() => onSelectMachine(m.machine_id)}
                      className="clickable-row"
                    >
                      <td className="font-mono font-semibold">{m.machine_id}</td>
                      <td>{m.machine_type}</td>
                      <td>
                        {healthScore !== undefined ? (
                          <span className={`score-badge ${healthScore < 50 ? 'bad' : healthScore < 75 ? 'med' : 'good'}`}>
                            {healthScore.toFixed(1)}
                          </span>
                        ) : (
                          '--'
                        )}
                      </td>
                      <td>
                        <span className={`status-pill ${healthLabel.toLowerCase()}`}>
                          {healthLabel}
                        </span>
                      </td>
                      <td className="font-mono">
                        {rul !== null && rul !== undefined ? `${rul.toFixed(1)} h` : '--'}
                      </td>
                      <td>
                        {riskScore !== undefined ? (
                          <span className={`score-badge ${riskScore > 70 ? 'bad' : riskScore > 40 ? 'med' : 'good'}`}>
                            {riskScore.toFixed(1)}
                          </span>
                        ) : (
                          '--'
                        )}
                      </td>
                      <td>
                        <span className={`risk-pill ${riskLevel.toLowerCase()}`}>
                          {riskLevel}
                        </span>
                      </td>
                      <td>
                        <span className="priority-tag">{priority}</span>
                      </td>
                      <td className="text-sm text-muted">{windowText}</td>
                      <td>
                        <button
                          className="btn-select"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectMachine(m.machine_id);
                          }}
                        >
                          Diagnostics →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
