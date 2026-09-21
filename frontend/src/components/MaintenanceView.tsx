import React, { useState } from 'react';
import { RecommendationDecision, Machine } from '../types';
import { StatusBadge } from './StatusBadge';

interface MaintenanceViewProps {
  recommendations: RecommendationDecision[];
  machines: Machine[];
  onSelectMachine: (machineId: string) => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  recommendations,
  machines,
  onSelectMachine,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'schedule' | 'protocols'>('schedule');

  const machineMap = machines.reduce<Record<string, Machine>>((acc, m) => {
    acc[m.machine_id] = m;
    return acc;
  }, {});

  const maintenanceQueue = recommendations
    .filter((r) => {
      const p = r.risk_assessment?.maintenance_priority || '';
      const risk = r.risk_assessment?.risk_level || '';
      return p.startsWith('P0') || p.startsWith('P1') || p.startsWith('P2') || risk === 'HIGH' || risk === 'CRITICAL';
    })
    .sort((a, b) => {
      const pA = a.risk_assessment?.maintenance_priority || '';
      const pB = b.risk_assessment?.maintenance_priority || '';
      return pA.localeCompare(pB);
    });

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1 className="view-title">Maintenance Planning</h1>
          <p className="view-subtitle">
            Upcoming equipment work orders, schedule windows, and standard operating procedures (SOPs).
          </p>
        </div>
        <div className="tab-pill-group">
          <button
            className={`tab-pill-btn ${activeSubTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('schedule')}
          >
            Required Interventions ({maintenanceQueue.length})
          </button>
          <button
            className={`tab-pill-btn ${activeSubTab === 'protocols' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('protocols')}
          >
            Standard Procedures & Reference
          </button>
        </div>
      </div>

      {activeSubTab === 'schedule' ? (
        <div className="saas-card table-card">
          <div className="table-responsive">
            <table className="saas-table">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Machine Asset</th>
                  <th>Type</th>
                  <th>Target Window</th>
                  <th>Prescribed Action</th>
                  <th>Referenced SOP</th>
                  <th>Estimated RUL</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceQueue.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-table-state">
                      All machinery is currently operating in normal parameters. No emergency maintenance required.
                    </td>
                  </tr>
                ) : (
                  maintenanceQueue.map((item) => {
                    const m = machineMap[item.machine_id];
                    const priority = item.risk_assessment?.maintenance_priority || 'P2';
                    const windowText = item.risk_assessment?.maintenance_time_window || 'Immediate';
                    const action = item.generated_explanation?.recommended_actions?.[0] || 'Perform inspection and lubrication.';
                    const sops = item.generated_explanation?.sop_references || [];
                    const rul = item.current_condition?.rul_hours;

                    return (
                      <tr
                        key={item.machine_id}
                        className="table-row-hover"
                        onClick={() => onSelectMachine(item.machine_id)}
                      >
                        <td>
                          <StatusBadge status={priority} />
                        </td>
                        <td>
                          <div className="machine-cell">
                            <span className="machine-id-text">{item.machine_id}</span>
                            {m?.machine_name && (
                              <span className="machine-subname">{m.machine_name}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="type-tag">{item.machine_type || m?.machine_type || 'Machinery'}</span>
                        </td>
                        <td>
                          <span className="window-pill">{windowText}</span>
                        </td>
                        <td className="action-text-cell">
                          {action}
                        </td>
                        <td>
                          <span className="sop-code-badge">
                            {sops.length > 0 ? sops[0] : 'SOP-GEN-01'}
                          </span>
                        </td>
                        <td>
                          <span className="font-numeric">
                            {rul !== null && rul !== undefined ? `${rul.toFixed(1)} h` : '--'}
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            className="saas-btn-secondary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectMachine(item.machine_id);
                            }}
                          >
                            Open Task →
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
      ) : (
        <div className="sop-reference-grid">
          <div className="saas-card sop-card">
            <div className="sop-card-header">
              <span className="sop-code">SOP-BEAR-01</span>
              <h3>High-Speed Spindle & Bearing Inspection</h3>
            </div>
            <p className="sop-desc">
              Prescribed protocol for bearing vibration anomalies exceeding ISO 10816 Class II threshold (1.5 g).
            </p>
            <ul className="sop-steps">
              <li>1. Lockout-tagout machine drive system.</li>
              <li>2. Inspect bearing housing temperature using calibrated thermal probe.</li>
              <li>3. Apply high-temperature synthetic bearing grease (ISO VG 150).</li>
              <li>4. Check axial & radial spindle runout using dial indicator.</li>
            </ul>
          </div>

          <div className="saas-card sop-card">
            <div className="sop-card-header">
              <span className="sop-code">SOP-BELT-04</span>
              <h3>Drive Belt Tension & Sheave Alignment</h3>
            </div>
            <p className="sop-desc">
              Procedure for addressing harmonic vibration signatures and drive slip on ring frames and looms.
            </p>
            <ul className="sop-steps">
              <li>1. Verify belt tension using acoustic tension meter.</li>
              <li>2. Align driving and driven sheaves with laser alignment tool.</li>
              <li>3. Replace belts exhibiting micro-cracks or glaze wear.</li>
              <li>4. Retorque mount bolts to 45 Nm specification.</li>
            </ul>
          </div>

          <div className="saas-card sop-card">
            <div className="sop-card-header">
              <span className="sop-code">SOP-THERM-02</span>
              <h3>Motor Overheat & Stator Winding Diagnostics</h3>
            </div>
            <p className="sop-desc">
              Protocol for thermal sensor readings sustained above 75°C or degradation gradient exceeding nominal.
            </p>
            <ul className="sop-steps">
              <li>1. Inspect ventilation cowl and remove textile lint build-up.</li>
              <li>2. Measure winding insulation resistance with 500V Megohmmeter.</li>
              <li>3. Verify phase current balance within 5% tolerance across phases.</li>
              <li>4. Check cooling fan impeller integrity and rotation clearance.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
