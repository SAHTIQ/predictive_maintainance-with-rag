import React from 'react';
import { FleetOverview, RecommendationDecision, Machine } from '../types';

interface ReportsViewProps {
  overview: FleetOverview | null;
  recommendations: RecommendationDecision[];
  machines: Machine[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  overview,
  recommendations,
  machines,
}) => {
  const total = overview?.total_machines || machines.length || 1;
  const good = overview?.health_states?.Good || 0;
  const warning = overview?.health_states?.Warning || 0;
  const critical = overview?.health_states?.Critical || 0;

  const lowRisk = overview?.risk_levels?.LOW || 0;
  const medRisk = overview?.risk_levels?.MEDIUM || 0;
  const highRisk = overview?.risk_levels?.HIGH || 0;
  const critRisk = overview?.risk_levels?.CRITICAL || 0;

  let totalTemp = 0;
  let totalVib = 0;
  let validSensorsCount = 0;

  recommendations.forEach((r) => {
    if (r.measured_evidence?.temperature) {
      totalTemp += r.measured_evidence.temperature;
      validSensorsCount++;
    }
    if (r.measured_evidence?.vibration_magnitude) {
      totalVib += r.measured_evidence.vibration_magnitude;
    }
  });

  const avgTemp = validSensorsCount > 0 ? (totalTemp / validSensorsCount).toFixed(1) : '--';
  const avgVib = validSensorsCount > 0 ? (totalVib / validSensorsCount).toFixed(3) : '--';

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1 className="view-title">Fleet Reliability & Risk Reports</h1>
          <p className="view-subtitle">
            Consolidated operational health analytics, risk distributions, and fleet telemetry aggregates.
          </p>
        </div>
        <button
          className="saas-btn-secondary"
          onClick={() => window.print()}
        >
          Export Report
        </button>
      </div>

      {/* Summary KPI row */}
      <div className="overview-kpi-grid">
        <div className="saas-card metric-card-v2">
          <span className="metric-title-v2">Fleet Average Health</span>
          <div className="metric-body-v2">
            <span className="metric-value-v2">
              {overview?.average_health_score !== undefined ? overview.average_health_score.toFixed(1) : '--'}
            </span>
            <span className="metric-unit-v2">/100</span>
          </div>
          <span className="metric-subtitle-v2">Across {total} monitored machines</span>
        </div>

        <div className="saas-card metric-card-v2">
          <span className="metric-title-v2">Average Remaining Life</span>
          <div className="metric-body-v2">
            <span className="metric-value-v2">
              {overview?.average_rul_hours !== undefined ? overview.average_rul_hours.toFixed(0) : '--'}
            </span>
            <span className="metric-unit-v2">hours</span>
          </div>
          <span className="metric-subtitle-v2">Fleet-wide RUL projection</span>
        </div>

        <div className="saas-card metric-card-v2">
          <span className="metric-title-v2">Fleet Mean Temperature</span>
          <div className="metric-body-v2">
            <span className="metric-value-v2">{avgTemp}</span>
            <span className="metric-unit-v2">°C</span>
          </div>
          <span className="metric-subtitle-v2">Bearing & motor housing sensor avg</span>
        </div>

        <div className="saas-card metric-card-v2">
          <span className="metric-title-v2">Fleet Mean Vibration</span>
          <div className="metric-body-v2">
            <span className="metric-value-v2">{avgVib}</span>
            <span className="metric-unit-v2">g</span>
          </div>
          <span className="metric-subtitle-v2">Tri-axial resultant RMS</span>
        </div>
      </div>

      {/* Visual Distributions */}
      <div className="reports-charts-row">
        <div className="saas-card report-distribution-card">
          <div className="card-header-clean">
            <h3>Health Condition Distribution</h3>
            <span className="card-meta">Condition State</span>
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
              <span className="dist-val">{good} ({((good / total) * 100).toFixed(0)}%)</span>
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
              <span className="dist-val">{warning} ({((warning / total) * 100).toFixed(0)}%)</span>
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
              <span className="dist-val">{critical} ({((critical / total) * 100).toFixed(0)}%)</span>
            </div>
          </div>
        </div>

        <div className="saas-card report-distribution-card">
          <div className="card-header-clean">
            <h3>Operational Risk Distribution</h3>
            <span className="card-meta">Risk Engine Assessment</span>
          </div>
          <div className="dist-bar-group">
            <div className="dist-item-row">
              <div className="dist-label-col">
                <span className="status-dot dot-green" />
                <span className="dist-name">Low Risk</span>
              </div>
              <div className="dist-progress-wrap">
                <div
                  className="dist-progress-bar bg-green"
                  style={{ width: `${(lowRisk / total) * 100}%` }}
                />
              </div>
              <span className="dist-val">{lowRisk} ({((lowRisk / total) * 100).toFixed(0)}%)</span>
            </div>

            <div className="dist-item-row">
              <div className="dist-label-col">
                <span className="status-dot dot-amber" />
                <span className="dist-name">Medium Risk</span>
              </div>
              <div className="dist-progress-wrap">
                <div
                  className="dist-progress-bar bg-amber"
                  style={{ width: `${(medRisk / total) * 100}%` }}
                />
              </div>
              <span className="dist-val">{medRisk} ({((medRisk / total) * 100).toFixed(0)}%)</span>
            </div>

            <div className="dist-item-row">
              <div className="dist-label-col">
                <span className="status-dot dot-orange" />
                <span className="dist-name">High Risk</span>
              </div>
              <div className="dist-progress-wrap">
                <div
                  className="dist-progress-bar bg-orange"
                  style={{ width: `${(highRisk / total) * 100}%` }}
                />
              </div>
              <span className="dist-val">{highRisk} ({((highRisk / total) * 100).toFixed(0)}%)</span>
            </div>

            <div className="dist-item-row">
              <div className="dist-label-col">
                <span className="status-dot dot-red" />
                <span className="dist-name">Critical Risk</span>
              </div>
              <div className="dist-progress-wrap">
                <div
                  className="dist-progress-bar bg-red"
                  style={{ width: `${(critRisk / total) * 100}%` }}
                />
              </div>
              <span className="dist-val">{critRisk} ({((critRisk / total) * 100).toFixed(0)}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
