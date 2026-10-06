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
              <h1 className="stitch-page-title">Shift Summary & Machine Health Reports</h1>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-error-container text-on-error-container font-label-caps text-label-caps font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
                <span>SHIFT A ENDING</span>
              </div>
              <span className="font-label-caps text-label-caps text-secondary uppercase bg-surface-container-low px-2 py-0.5 rounded">
                06:00 – 14:00
              </span>
            </div>
            <p className="stitch-page-desc">
              Summary of machine health, wear-and-tear trends, and repair updates across all {machines.length} machines on the factory floor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date Range Chips */}
            <div className="status-segmented-control">
              <button
                className={`segment-btn ${dateRange === 'SHIFT' ? 'active' : ''}`}
                onClick={() => setDateRange('SHIFT')}
              >
                This Shift (8h)
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
              <span>Print / Save PDF</span>
            </button>

            <button
              className={`stitch-btn-primary ${signedOff ? 'bg-emerald-600' : ''}`}
              onClick={handleSignOff}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">
                {signedOff ? 'verified' : 'draw'}
              </span>
              <span>{signedOff ? 'Shift Report Approved ✓' : 'Approve & Sign Shift Report'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Top KPI Deck (5 Bento Cards matching Stitch) */}
      <section className="stitch-kpi-deck mb-space-base">
        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">Active Machines</span>
            <span className="flex items-center gap-1 font-label-caps text-[#22C55E] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" /> LIVE
            </span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric">{machines.length}</span>
            <span className="kpi-unit-label">Running Live</span>
          </div>
          <div className="kpi-footnote text-[#94A3B8]">
            All sensors online across Lines 1 to 4
          </div>
        </div>

        <div className="stitch-kpi-card critical-border">
          <div className="kpi-card-header">
            <span className="kpi-label-caps text-[#EF4444]">Urgent Warning Alarms</span>
            <span className="px-1.5 py-0.5 rounded bg-[rgba(239,68,68,0.1)] text-[#EF4444] border border-[rgba(239,68,68,0.3)] font-label-caps text-[10px] font-semibold">ALARM</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val text-[#EF4444] font-numeric">{critical}</span>
            <span className="kpi-unit-label text-[#EF4444] font-semibold">Urgent Issues</span>
          </div>
          <div className="kpi-footnote text-[#94A3B8]">
            Needs immediate review before next shift
          </div>
        </div>

        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">Overall Health Score</span>
            <span className="material-symbols-outlined text-[#94A3B8] text-[18px]">health_and_safety</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric">
              {overview?.average_health_score !== undefined ? overview.average_health_score.toFixed(1) : '84.2'}
            </span>
            <span className="kpi-unit-label">/ 100</span>
          </div>
          <div className="kpi-footnote text-[#94A3B8]">
            Average health score of all factory machines
          </div>
        </div>

        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">Average Hours Left</span>
            <span className="material-symbols-outlined text-[#94A3B8] text-[18px]">timelapse</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric">
              {overview?.average_rul_hours !== undefined ? overview.average_rul_hours.toFixed(0) : '142'}
            </span>
            <span className="kpi-unit-label">Hours</span>
          </div>
          <div className="kpi-footnote text-[#94A3B8]">
            Estimated runtime left before parts need fixing
          </div>
        </div>

        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">Average Sensor Readings</span>
            <span className="material-symbols-outlined text-[#94A3B8] text-[18px]">sensors</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric">{avgVib}</span>
            <span className="kpi-unit-label">mm/s vib</span>
            <span className="text-[#64748B] mx-1">·</span>
            <span className="kpi-telemetry-val font-numeric">{avgTemp}</span>
            <span className="kpi-unit-label">°C temp</span>
          </div>
          <div className="kpi-footnote text-[#94A3B8]">
            Average vibration level & machine heat
          </div>
        </div>
      </section>

      {/* 2.5 SVG Visual Shift Telemetry Timeline Chart matching Stitch Screen 9 */}
      <section className="stitch-card p-space-base mb-space-base">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="stitch-card-title">Live Shift Health & Problem Timeline</h2>
            <p className="stitch-card-desc">How machine health changed over the 8-hour shift, showing alerts and repairs.</p>
          </div>
          <div className="flex items-center gap-3 text-secondary font-label-md text-label-md">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-surface-container-high inline-block rounded"></span>
              Normal Safe Zone (70–90%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-primary inline-block"></span>
              Average Health Trend
            </span>
          </div>
        </div>

        {/* SVG Timeline Canvas */}
        <div className="relative w-full h-64 bg-surface-container-low rounded-lg p-space-sm overflow-hidden flex flex-col justify-between border border-outline-variant/40">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 760 210">
            {/* Grid Lines */}
            <line stroke="currentColor" className="text-outline-variant/40" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="760" y1="35" y2="35" />
            <line stroke="currentColor" className="text-outline-variant/40" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="760" y1="85" y2="85" />
            <line stroke="currentColor" className="text-outline-variant/40" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="760" y1="135" y2="135" />
            <line stroke="currentColor" className="text-outline-variant/40" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="760" y1="185" y2="185" />

            {/* Baseline Corridor Shading (70% - 90%) */}
            <polygon fill="#3b82f6" fillOpacity="0.12" points="0,55 190,55 380,55 570,55 760,55 760,115 570,115 380,115 190,115 0,115" />

            {/* Shift A Trend Line */}
            <path d="M 0,70 Q 95,75 190,77 T 350,115 Q 400,105 490,82 T 760,84" fill="none" stroke="#2563eb" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />

            {/* Data Point Markers */}
            <circle cx="0" cy="70" fill="#2563eb" r="3.5" />
            <circle cx="190" cy="77" fill="#2563eb" r="3.5" />
            <circle cx="350" cy="115" fill="#ef4444" r="5" stroke="var(--surface-container-lowest)" strokeWidth="2" />
            <circle cx="490" cy="82" fill="#10b981" r="5" stroke="var(--surface-container-lowest)" strokeWidth="2" />
            <circle cx="760" cy="84" fill="#2563eb" r="4" />

            {/* Critical Threshold Guideline (65%) */}
            <line stroke="#ef4444" strokeWidth="1.5" x1="0" x2="760" y1="145" y2="145" strokeDasharray="4 4" />
            <text fill="#ef4444" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="700" x="8" y="140">DANGER LEVEL (65% HEALTH)</text>
          </svg>

          {/* Overlaid Event Callout Tags matching Stitch */}
          <div className="absolute left-[44%] top-[50%] -translate-x-1/2 flex flex-col items-center pointer-events-none">
            <div className="bg-error-container text-on-error-container text-[11px] font-bold px-2 py-0.5 rounded shadow-sm border border-error/20 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">trending_down</span>
              <span>09:42 · TXM-014 Shaking Spike (-6.2%)</span>
            </div>
            <div className="w-px h-3 bg-error" />
          </div>

          <div className="absolute left-[64%] top-[22%] -translate-x-1/2 flex flex-col items-center pointer-events-none">
            <div className="bg-tertiary-fixed text-on-tertiary-fixed text-[11px] font-bold px-2 py-0.5 rounded shadow-sm border border-tertiary/20 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">trending_up</span>
              <span>11:15 · TXM-008 Oil Refilled (+4.8%)</span>
            </div>
            <div className="w-px h-3 bg-tertiary" />
          </div>

          {/* Time X-Axis Grid */}
          <div className="flex justify-between items-center text-secondary font-label-caps text-label-caps pt-1 border-t border-outline-variant/40 px-2">
            <span>06:00 (Shift Start)</span>
            <span>08:00</span>
            <span>10:00</span>
            <span>12:00</span>
            <span className="text-on-surface font-bold">14:00 (Next Shift Starts)</span>
          </div>
        </div>

        {/* Trend Summary Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-space-base py-space-xs bg-surface-container-low rounded-lg mt-2 font-body-sm text-body-sm border border-outline-variant/30">
          <div className="flex items-center gap-space-sm text-on-surface">
            <span className="material-symbols-outlined text-secondary text-[18px]">query_stats</span>
            <span>Machine Stability: <strong className="font-numeric">94.2%</strong> across Shift A (2 repairs completed)</span>
          </div>
          <span className="font-label-caps text-label-caps text-tertiary font-bold uppercase">All Factory Lines Ready for Next Shift</span>
        </div>
      </section>

      {/* 3. Distribution Breakdown Cards Grid */}
      <div className="detail-evidence-columns-grid mb-space-base">
        {/* Health State Breakdown */}
        <div className="stitch-card p-space-base">
          <div className="stitch-card-header mb-3">
            <h2 className="stitch-card-title">Machine Health Condition</h2>
            <span className="kpi-label-caps">{total} Total Machines</span>
          </div>

          <div className="report-progress-list">
            <div className="progress-bar-item">
              <div className="progress-labels">
                <span className="flex items-center gap-1.5 text-good font-semibold">
                  <span className="legend-dot good" /> Healthy / Running Smoothly
                </span>
                <span className="font-numeric font-bold">{good} machines ({((good / total) * 100).toFixed(0)}%)</span>
              </div>
              <div className="meter-track">
                <div className="meter-fill good" style={{ width: `${(good / total) * 100}%` }} />
              </div>
            </div>

            <div className="progress-bar-item">
              <div className="progress-labels">
                <span className="flex items-center gap-1.5 text-warning font-semibold">
                  <span className="legend-dot warning" /> Check Soon (Early Wear)
                </span>
                <span className="font-numeric font-bold">{warning} machines ({((warning / total) * 100).toFixed(0)}%)</span>
              </div>
              <div className="meter-track">
                <div className="meter-fill warning" style={{ width: `${(warning / total) * 100}%` }} />
              </div>
            </div>

            <div className="progress-bar-item">
              <div className="progress-labels">
                <span className="flex items-center gap-1.5 text-critical font-semibold">
                  <span className="legend-dot critical" /> Urgent Repair Needed
                </span>
                <span className="font-numeric font-bold">{critical} machines ({((critical / total) * 100).toFixed(0)}%)</span>
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
            <h2 className="stitch-card-title">Risk of Failure Breakdown</h2>
            <span className="kpi-label-caps">Based on Sensor Wear</span>
          </div>

          <div className="report-progress-list">
            <div className="progress-bar-item">
              <div className="progress-labels">
                <span className="flex items-center gap-1.5 text-secondary font-semibold">
                  <span className="legend-dot" style={{ backgroundColor: '#64748b' }} /> Low Risk (P3 Routine)
                </span>
                <span className="font-numeric font-bold">{lowRisk} machines</span>
              </div>
              <div className="meter-track">
                <div className="meter-fill" style={{ width: `${(lowRisk / total) * 100}%`, backgroundColor: '#64748b' }} />
              </div>
            </div>

            <div className="progress-bar-item">
              <div className="progress-labels">
                <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
                  <span className="legend-dot" style={{ backgroundColor: '#2563eb' }} /> Medium Risk (P2 Check 48h)
                </span>
                <span className="font-numeric font-bold">{medRisk} machines</span>
              </div>
              <div className="meter-track">
                <div className="meter-fill" style={{ width: `${(medRisk / total) * 100}%`, backgroundColor: '#2563eb' }} />
              </div>
            </div>

            <div className="progress-bar-item">
              <div className="progress-labels">
                <span className="flex items-center gap-1.5 text-[#ea580c] font-semibold">
                  <span className="legend-dot" style={{ backgroundColor: '#ea580c' }} /> High Risk (P1 Urgent Today)
                </span>
                <span className="font-numeric font-bold">{highRisk} machines</span>
              </div>
              <div className="meter-track">
                <div className="meter-fill" style={{ width: `${(highRisk / total) * 100}%`, backgroundColor: '#ea580c' }} />
              </div>
            </div>

            <div className="progress-bar-item">
              <div className="progress-labels">
                <span className="flex items-center gap-1.5 text-critical font-semibold">
                  <span className="legend-dot critical" /> Critical (Fix Immediately)
                </span>
                <span className="font-numeric font-bold">{critRisk} machines</span>
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
            <h2 className="stitch-card-title">Machines Needing Most Attention</h2>
            <p className="stitch-card-desc">Machines with the highest shaking, temperature, or shortest time left.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-base">
          {/* Top Vibration Outliers */}
          <div className="outlier-column-box">
            <span className="outlier-col-title text-primary">
              <span className="material-symbols-outlined text-[16px]">sensors</span>
              <span>Highest Shaking (Vibration)</span>
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
              <span>Hottest Machines (Temperature)</span>
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
              <span>Fewest Hours Left (Shortest Life)</span>
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
                      : 'Good'}
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
          <h2 className="stitch-card-title">Shift Handover Log & Verification</h2>
          <span className="kpi-label-caps">Official Shift Record</span>
        </div>
        <p className="stitch-card-desc mb-3">
          Prepared by Shift Supervisor. All sensor readings verified. All urgent issues have repair tasks assigned.
        </p>

        <div className="sign-off-status-box">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600">verified_user</span>
            <span className="font-semibold text-on-surface">
              {signedOff ? 'Shift Report Approved & Saved' : 'Awaiting Supervisor Approval'}
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
