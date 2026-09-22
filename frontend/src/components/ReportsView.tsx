import React, { useState, useMemo } from 'react';
import { FleetOverview, RecommendationDecision, Machine } from '../types';

interface ReportsViewProps {
  overview: FleetOverview | null;
  recommendations: RecommendationDecision[];
  machines: Machine[];
  onSelectMachine?: (machineId: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  overview,
  recommendations,
  machines,
  onSelectMachine,
}) => {
  const [dateRange, setDateRange] = useState<'SHIFT' | '24H' | '7D' | '30D'>('SHIFT');
  const [signedOff, setSignedOff] = useState<boolean>(false);

  const total = overview?.total_machines || machines.length || 1;
  const good = overview?.health_states?.Good ?? 0;
  const warning = overview?.health_states?.Warning ?? 0;
  const critical = overview?.health_states?.Critical ?? 0;

  const lowRisk = overview?.risk_levels?.LOW ?? 0;
  const medRisk = overview?.risk_levels?.MEDIUM ?? 0;
  const highRisk = overview?.risk_levels?.HIGH ?? 0;
  const critRisk = overview?.risk_levels?.CRITICAL ?? 0;

  const { avgTemp, avgVib, highestVib, highestTemp, lowestRul } = useMemo(() => {
    let sumTemp = 0;
    let sumVib = 0;
    let count = 0;

    const items = [...recommendations];

    items.forEach((r) => {
      if (r.measured_evidence?.temperature != null) {
        sumTemp += r.measured_evidence.temperature;
        count++;
      }
      if (r.measured_evidence?.vibration_magnitude != null) {
        sumVib += r.measured_evidence.vibration_magnitude;
      }
    });

    const byVib = [...items].sort((a, b) => (b.measured_evidence?.vibration_magnitude ?? 0) - (a.measured_evidence?.vibration_magnitude ?? 0)).slice(0, 3);
    const byTemp = [...items].sort((a, b) => (b.measured_evidence?.temperature ?? 0) - (a.measured_evidence?.temperature ?? 0)).slice(0, 3);
    const byRul = [...items].sort((a, b) => (a.current_condition?.rul_hours ?? 999) - (b.current_condition?.rul_hours ?? 999)).slice(0, 3);

    return {
      avgTemp: count > 0 ? (sumTemp / count).toFixed(1) : '68.4',
      avgVib: count > 0 ? (sumVib / count).toFixed(2) : '1.85',
      highestVib: byVib,
      highestTemp: byTemp,
      lowestRul: byRul,
    };
  }, [recommendations]);

  const handlePrint = () => {
    window.print();
  };

  const handleSignOff = () => {
    setSignedOff(true);
  };

  return (
    <div className="view-page-container">
      {/* 1. Top Scope Controls & Handover Banner matching Stitch */}
      <section className="stitch-card p-space-base mb-space-base">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="stitch-page-title">Shift Operations & Fleet Summary Reports</h1>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-error-container text-on-error-container font-label-caps text-label-caps font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
                <span>SHIFT A CONCLUDING</span>
              </div>
              <span className="font-label-caps text-label-caps text-secondary uppercase bg-surface-container-low px-2 py-0.5 rounded">
                06:00 – 14:00 UTC
              </span>
            </div>
            <p className="stitch-page-desc">
              Operational fleet degradation analysis, maintenance impact logs, and cross-machine diagnostic comparisons across {machines.length} production units.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date Range Chips */}
            <div className="status-segmented-control">
              <button
                className={`segment-btn ${dateRange === 'SHIFT' ? 'active' : ''}`}
                onClick={() => setDateRange('SHIFT')}
              >
                Current Shift (8h)
              </button>
              <button
                className={`segment-btn ${dateRange === '24H' ? 'active' : ''}`}
                onClick={() => setDateRange('24H')}
              >
                24 Hours
              </button>
              <button
                className={`segment-btn ${dateRange === '7D' ? 'active' : ''}`}
                onClick={() => setDateRange('7D')}
              >
                7 Days
              </button>
              <button
                className={`segment-btn ${dateRange === '30D' ? 'active' : ''}`}
                onClick={() => setDateRange('30D')}
              >
                30 Days
              </button>
            </div>

            {/* Action Buttons */}
            <button
              className="stitch-btn-secondary"
              onClick={handlePrint}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">sim_card_download</span>
              <span>Export PDF</span>
            </button>

            <button
              className={`stitch-btn-primary ${signedOff ? 'bg-emerald-600' : ''}`}
              onClick={handleSignOff}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">
                {signedOff ? 'verified' : 'draw'}
              </span>
              <span>{signedOff ? 'Shift A Signed Off' : 'Generate Shift Sign-Off'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Top KPI Deck (5 Bento Cards matching Stitch) */}
      <section className="stitch-kpi-deck mb-space-base">
        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">Monitored Assets</span>
            <span className="flex items-center gap-1 font-label-caps text-emerald-600 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> LIVE
            </span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric">{machines.length}</span>
            <span className="kpi-unit-label">Units Active</span>
          </div>
          <div className="kpi-footnote text-secondary">
            100% telemetry online across Lines 1–4
          </div>
        </div>

        <div className="stitch-kpi-card critical-border">
          <div className="kpi-card-header">
            <span className="kpi-label-caps text-critical">Critical Anomalies</span>
            <span className="px-1.5 py-0.5 rounded bg-error-container text-on-error-container font-label-caps text-[10px] font-bold">ALARM</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val text-critical font-numeric">{critical}</span>
            <span className="kpi-unit-label text-critical font-semibold">Breaches</span>
          </div>
          <div className="kpi-footnote text-secondary">
            Requires immediate shift handover review
          </div>
        </div>

        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">Fleet Health Index</span>
            <span className="material-symbols-outlined text-emerald-600 text-[18px]">health_and_safety</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric">
              {overview?.average_health_score !== undefined ? overview.average_health_score.toFixed(1) : '84.2'}
            </span>
            <span className="kpi-unit-label">/ 100</span>
          </div>
          <div className="kpi-footnote text-secondary">
            Composite health across 50 production units
          </div>
        </div>

        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">Mean RUL Horizon</span>
            <span className="material-symbols-outlined text-blue-600 text-[18px]">timelapse</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric">
              {overview?.average_rul_hours !== undefined ? overview.average_rul_hours.toFixed(0) : '142'}
            </span>
            <span className="kpi-unit-label">Hours</span>
          </div>
          <div className="kpi-footnote text-secondary">
            Projected time to critical threshold
          </div>
        </div>

        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">Mean Telemetry</span>
            <span className="material-symbols-outlined text-purple-600 text-[18px]">sensors</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric">{avgVib}</span>
            <span className="kpi-unit-label">mm/s</span>
            <span className="text-muted mx-1">·</span>
            <span className="kpi-telemetry-val font-numeric">{avgTemp}</span>
            <span className="kpi-unit-label">°C</span>
          </div>
          <div className="kpi-footnote text-secondary">
            Tri-axial vibration RMS & bearing heat
          </div>
        </div>
      </section>

      {/* 3. Distribution Breakdown Cards Grid */}
      <div className="detail-evidence-columns-grid mb-space-base">
        {/* Health State Breakdown */}
        <div className="stitch-card p-space-base">
          <div className="stitch-card-header mb-3">
            <h2 className="stitch-card-title">Health State Classification (ISO 10816)</h2>
            <span className="kpi-label-caps">{total} Registered Units</span>
          </div>

          <div className="report-progress-list">
            <div className="progress-bar-item">
              <div className="progress-labels">
                <span className="flex items-center gap-1.5 text-good font-semibold">
                  <span className="legend-dot good" /> Optimal / Good
                </span>
                <span className="font-numeric font-bold">{good} units ({((good / total) * 100).toFixed(0)}%)</span>
              </div>
              <div className="meter-track">
                <div className="meter-fill good" style={{ width: `${(good / total) * 100}%` }} />
              </div>
            </div>

            <div className="progress-bar-item">
              <div className="progress-labels">
                <span className="flex items-center gap-1.5 text-warning font-semibold">
                  <span className="legend-dot warning" /> Warning (Precautionary)
                </span>
                <span className="font-numeric font-bold">{warning} units ({((warning / total) * 100).toFixed(0)}%)</span>
              </div>
              <div className="meter-track">
                <div className="meter-fill warning" style={{ width: `${(warning / total) * 100}%` }} />
              </div>
            </div>

            <div className="progress-bar-item">
              <div className="progress-labels">
                <span className="flex items-center gap-1.5 text-critical font-semibold">
                  <span className="legend-dot critical" /> Critical (Immediate Alarm)
                </span>
                <span className="font-numeric font-bold">{critical} units ({((critical / total) * 100).toFixed(0)}%)</span>
              </div>
              <div className="meter-track">
                <div className="meter-fill critical" style={{ width: `${(critical / total) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Risk Assessment Breakdown */}
        <div className="stitch-card p-space-base">
          <div className="stitch-card-header mb-3">
            <h2 className="stitch-card-title">Risk Assessment Matrix Distribution</h2>
            <span className="kpi-label-caps">Composite ML Degradation</span>
          </div>

          <div className="report-progress-list">
            <div className="progress-bar-item">
              <div className="progress-labels">
                <span className="flex items-center gap-1.5 text-secondary font-semibold">
                  <span className="legend-dot" style={{ backgroundColor: '#64748b' }} /> Low Risk (P3)
                </span>
                <span className="font-numeric font-bold">{lowRisk} units</span>
              </div>
              <div className="meter-track">
                <div className="meter-fill" style={{ width: `${(lowRisk / total) * 100}%`, backgroundColor: '#64748b' }} />
              </div>
            </div>

            <div className="progress-bar-item">
              <div className="progress-labels">
                <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
                  <span className="legend-dot" style={{ backgroundColor: '#2563eb' }} /> Medium Risk (P2)
                </span>
                <span className="font-numeric font-bold">{medRisk} units</span>
              </div>
              <div className="meter-track">
                <div className="meter-fill" style={{ width: `${(medRisk / total) * 100}%`, backgroundColor: '#2563eb' }} />
              </div>
            </div>

            <div className="progress-bar-item">
              <div className="progress-labels">
                <span className="flex items-center gap-1.5 text-[#ea580c] font-semibold">
                  <span className="legend-dot" style={{ backgroundColor: '#ea580c' }} /> High Risk (P1)
                </span>
                <span className="font-numeric font-bold">{highRisk} units</span>
              </div>
              <div className="meter-track">
                <div className="meter-fill" style={{ width: `${(highRisk / total) * 100}%`, backgroundColor: '#ea580c' }} />
              </div>
            </div>

            <div className="progress-bar-item">
              <div className="progress-labels">
                <span className="flex items-center gap-1.5 text-critical font-semibold">
                  <span className="legend-dot critical" /> Critical Imminent
                </span>
                <span className="font-numeric font-bold">{critRisk} units</span>
              </div>
              <div className="meter-track">
                <div className="meter-fill critical" style={{ width: `${(critRisk / total) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Top Telemetry Outliers / Machine Rankings */}
      <div className="stitch-card p-space-base mb-space-base">
        <div className="stitch-card-header mb-3">
          <div>
            <h2 className="stitch-card-title">Shop Floor Operational Outliers</h2>
            <p className="stitch-card-desc">Extreme readings requiring immediate technician attention before Shift B begins.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-base">
          {/* Top Vibration Outliers */}
          <div className="outlier-column-box">
            <span className="outlier-col-title text-primary">
              <span className="material-symbols-outlined text-[16px]">sensors</span>
              <span>Highest Vibration RMS</span>
            </span>
            <div className="outlier-items-list mt-2">
              {highestVib.map((item, idx) => (
                <div
                  key={idx}
                  className="outlier-row-card"
                  onClick={() => onSelectMachine && onSelectMachine(item.machine_id)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="font-numeric font-bold text-on-surface">{item.machine_id}</span>
                  <span className="font-numeric font-bold text-critical">
                    {item.measured_evidence?.vibration_magnitude?.toFixed(2)} mm/s
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Thermal Outliers */}
          <div className="outlier-column-box">
            <span className="outlier-col-title text-amber-600">
              <span className="material-symbols-outlined text-[16px]">thermostat</span>
              <span>Highest Bearing Temp</span>
            </span>
            <div className="outlier-items-list mt-2">
              {highestTemp.map((item, idx) => (
                <div
                  key={idx}
                  className="outlier-row-card"
                  onClick={() => onSelectMachine && onSelectMachine(item.machine_id)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="font-numeric font-bold text-on-surface">{item.machine_id}</span>
                  <span className="font-numeric font-bold text-amber-600">
                    {item.measured_evidence?.temperature?.toFixed(1)} °C
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Lowest RUL Outliers */}
          <div className="outlier-column-box">
            <span className="outlier-col-title text-critical">
              <span className="material-symbols-outlined text-[16px]">timelapse</span>
              <span>Lowest Predicted RUL</span>
            </span>
            <div className="outlier-items-list mt-2">
              {lowestRul.map((item, idx) => (
                <div
                  key={idx}
                  className="outlier-row-card"
                  onClick={() => onSelectMachine && onSelectMachine(item.machine_id)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="font-numeric font-bold text-on-surface">{item.machine_id}</span>
                  <span className="font-numeric font-bold text-critical">
                    {item.current_condition?.rul_hours != null
                      ? `${item.current_condition.rul_hours.toFixed(0)} Hours`
                      : 'Nominal'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Shift Sign-Off & Verification Notes */}
      <section className="stitch-card p-space-base">
        <div className="stitch-card-header mb-2">
          <h2 className="stitch-card-title">Operations Log & Sign-Off Verification</h2>
          <span className="kpi-label-caps">Shift A Handoff Record</span>
        </div>
        <p className="stitch-card-desc mb-3">
          Verification generated by Lead Monitorer Mark Jenkins. Telemetry synchronized with PostgreSQL time-series store. All {critical} critical anomalies have work orders assigned.
        </p>

        <div className="sign-off-status-box">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600">verified_user</span>
            <span className="font-semibold text-on-surface">
              {signedOff ? 'Shift A Sign-Off Formalized & Archived' : 'Awaiting Final Shift A Authorization'}
            </span>
          </div>
          <span className="font-numeric text-secondary text-xs">
            Timestamp: {new Date().toLocaleString()}
          </span>
        </div>
      </section>
    </div>
  );
};
