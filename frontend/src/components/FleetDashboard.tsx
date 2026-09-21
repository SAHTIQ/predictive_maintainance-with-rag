import React from 'react';
import { FleetOverview, RecommendationDecision, Machine } from '../types';
import { MetricCard } from './MetricCard';
import { StatusBadge } from './StatusBadge';

interface FleetDashboardProps {
  overview: FleetOverview | null;
  machines: Machine[];
  recommendations: RecommendationDecision[];
  onSelectMachine: (machineId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const FleetDashboard: React.FC<FleetDashboardProps> = ({
  overview,
  machines,
  recommendations,
  onSelectMachine,
  onNavigateTab,
}) => {
  const recsByMachine = recommendations.reduce<Record<string, RecommendationDecision>>((acc, rec) => {
    acc[rec.machine_id] = rec;
    return acc;
  }, {});

  const attentionList = machines
    .map((m) => {
      const rec = recsByMachine[m.machine_id];
      const riskLevel = rec?.risk_assessment?.risk_level || 'LOW';
      const healthLabel = rec?.current_condition?.health_state_label || 'Good';
      const healthScore = rec?.current_condition?.health_score ?? 100;
      const rul = rec?.current_condition?.rul_hours ?? 999;
      const priority = rec?.risk_assessment?.maintenance_priority || 'P3';
      const isAttention = riskLevel === 'CRITICAL' || riskLevel === 'HIGH' || healthLabel === 'Critical' || healthLabel === 'Warning';
      return {
        machine: m,
        rec,
        riskLevel,
        healthLabel,
        healthScore,
        rul,
        priority,
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

  const total = overview?.total_machines || machines.length;
  const good = overview?.health_states?.Good || 0;
  const warning = overview?.health_states?.Warning || 0;
  const critical = overview?.health_states?.Critical || 0;
  const needAttention = overview?.machines_requiring_maintenance_count ?? attentionList.length;

  return (
    <div className="view-content">
      <div className="fleet-greeting-header">
        <div>
          <h1 className="greeting-title">Good morning</h1>
          <p className="greeting-subtitle">
            Here's the current operational condition of your textile machine fleet.
          </p>
        </div>
        <div className="system-pill-status">
          <span className="live-status-dot" />
          <span className="live-status-text">Fleet Telemetry Active</span>
        </div>
      </div>

      <div className="overview-kpi-grid">
        <MetricCard
          title="Total Machines"
          value={total}
          subtitle="Monitored in system"
          icon={<span className="metric-icon-svg">🏭</span>}
        />
        <MetricCard
          title="Average Health"
          value={overview?.average_health_score !== undefined ? overview.average_health_score.toFixed(0) : '--'}
          unit="/100"
          subtitle="Fleet-wide composite index"
          trend={{ text: 'Stable operation', isPositive: true }}
          icon={<span className="metric-icon-svg">❤️</span>}
        />
        <MetricCard
          title="Avg Remaining Life"
          value={overview?.average_rul_hours !== undefined ? overview.average_rul_hours.toFixed(0) : '--'}
          unit="hours"
          subtitle="Fleet average horizon"
          icon={<span className="metric-icon-svg">⏳</span>}
        />
        <MetricCard
          title="Needs Attention"
          value={needAttention}
          subtitle={needAttention > 0 ? 'Requires technician review' : 'All nominal'}
          trend={needAttention > 0 ? { text: `${needAttention} machine alerts`, isWarning: true } : undefined}
          icon={<span className="metric-icon-svg">⚠️</span>}
        />
      </div>

      <div className="dashboard-columns-grid">
        <div className="saas-card priority-table-card">
          <div className="card-header-clean">
            <div>
              <h3>Machines Needing Attention</h3>
              <p className="card-subtitle-sm">
                Prioritized by maintenance risk engine and degradation severity.
              </p>
            </div>
            {attentionList.length > 5 && (
              <button
                className="saas-btn-text"
                onClick={() => onNavigateTab('alerts')}
              >
                View all ({attentionList.length}) →
              </button>
            )}
          </div>

          <div className="table-responsive">
            <table className="saas-table">
              <thead>
                <tr>
                  <th>Machine</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Health</th>
                  <th>Est. RUL</th>
                  <th>Priority</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {attentionList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-table-state">
                      ✨ Great news! No machines currently require urgent attention.
                    </td>
                  </tr>
                ) : (
                  attentionList.slice(0, 6).map((item) => (
                    <tr
                      key={item.machine.machine_id}
                      className="table-row-hover"
                      onClick={() => onSelectMachine(item.machine.machine_id)}
                    >
                      <td>
                        <div className="machine-cell">
                          <span className="machine-id-text">{item.machine.machine_id}</span>
                          {item.machine.machine_name && (
                            <span className="machine-subname">{item.machine.machine_name}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="type-tag">{item.machine.machine_type}</span>
                      </td>
                      <td>
                        <StatusBadge status={item.healthLabel} size="sm" />
                      </td>
                      <td>
                        <span className="font-numeric font-semibold">
                          {item.healthScore.toFixed(0)}%
                        </span>
                      </td>
                      <td>
                        <span className="font-numeric text-muted">
                          {item.rul < 900 ? `${item.rul.toFixed(1)} h` : '--'}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={item.priority} size="sm" />
                      </td>
                      <td className="text-right">
                        <button
                          className="saas-btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectMachine(item.machine.machine_id);
                          }}
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboard-side-col">
          <div className="saas-card side-distribution-card">
            <div className="card-header-clean">
              <h3>Fleet Health Condition</h3>
            </div>

            <div className="dist-bar-group">
              <div className="dist-item-row">
                <div className="dist-label-col">
                  <span className="status-dot dot-green" />
                  <span className="dist-name">Good Condition</span>
                </div>
                <div className="dist-progress-wrap">
                  <div
                    className="dist-progress-bar bg-green"
                    style={{ width: `${(good / total) * 100}%` }}
                  />
                </div>
                <span className="dist-val">{good}</span>
              </div>

              <div className="dist-item-row">
                <div className="dist-label-col">
                  <span className="status-dot dot-amber" />
                  <span className="dist-name">Warning Condition</span>
                </div>
                <div className="dist-progress-wrap">
                  <div
                    className="dist-progress-bar bg-amber"
                    style={{ width: `${(warning / total) * 100}%` }}
                  />
                </div>
                <span className="dist-val">{warning}</span>
              </div>

              <div className="dist-item-row">
                <div className="dist-label-col">
                  <span className="status-dot dot-red" />
                  <span className="dist-name">Critical Condition</span>
                </div>
                <div className="dist-progress-wrap">
                  <div
                    className="dist-progress-bar bg-red"
                    style={{ width: `${(critical / total) * 100}%` }}
                  />
                </div>
                <span className="dist-val">{critical}</span>
              </div>
            </div>

            <div className="quick-action-strip">
              <button
                className="saas-btn-secondary btn-full"
                onClick={() => onNavigateTab('machines')}
              >
                Browse All {total} Machines →
              </button>
            </div>
          </div>

          <div className="saas-card insight-callout-card">
            <div className="insight-icon">💡</div>
            <div className="insight-body">
              <h4>Predictive Maintenance Intelligence</h4>
              <p>
                Telemetry is continuously analyzed using adaptive health scoring, remaining useful life regression, and context-aware RAG documentation retrieval.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
