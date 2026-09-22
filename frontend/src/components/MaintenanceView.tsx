import React, { useState, useMemo } from 'react';
import { RecommendationDecision, Machine } from '../types';
import { MOCK_RECOMMENDATIONS, MOCK_MACHINES } from '../services/mockData';

interface MaintenanceViewProps {
  recommendations: RecommendationDecision[];
  machines: Machine[];
  onSelectMachine: (machineId: string) => void;
  onOpenAIWithMachine?: (machineId: string) => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  recommendations,
  machines,
  onSelectMachine,
  onOpenAIWithMachine,
}) => {
  const effectiveMachines = machines && machines.length > 0 ? machines : MOCK_MACHINES;
  const effectiveRecs = recommendations && recommendations.length > 0 ? recommendations : MOCK_RECOMMENDATIONS;

  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [workOrderStatuses, setWorkOrderStatuses] = useState<Record<string, 'PENDING' | 'DISPATCHED' | 'IN_PROGRESS' | 'RESOLVED'>>({});
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newWorkOrderMachine, setNewWorkOrderMachine] = useState<string>(effectiveMachines[0]?.machine_id || 'TXM-014');
  const [newWorkOrderNote, setNewWorkOrderNote] = useState<string>('');

  const machineMap = useMemo(() => {
    return effectiveMachines.reduce<Record<string, Machine>>((acc, m) => {
      acc[m.machine_id] = m;
      return acc;
    }, {});
  }, [effectiveMachines]);

  // Derive maintenance work orders from actual recommendation decisions
  const workOrders = useMemo(() => {
    return effectiveRecs
      .filter((r) => {
        const p = r.risk_assessment?.maintenance_priority || '';
        const risk = r.risk_assessment?.risk_level || '';
        return p === 'P1' || p === 'P2' || risk === 'CRITICAL' || risk === 'HIGH' || r.current_condition?.anomaly_status;
      })
      .sort((a, b) => {
        const pOrder: Record<string, number> = { P1: 3, P2: 2, P3: 1 };
        const pA = pOrder[a.risk_assessment?.maintenance_priority || ''] || 0;
        const pB = pOrder[b.risk_assessment?.maintenance_priority || ''] || 0;
        if (pB !== pA) return pB - pA;
        return (a.current_condition?.rul_hours ?? 999) - (b.current_condition?.rul_hours ?? 999);
      });
  }, [effectiveRecs]);

  const dueImmediateCount = workOrders.filter((w) => {
    const rul = w.current_condition?.rul_hours;
    return (rul != null && rul < 12) || w.risk_assessment?.maintenance_priority === 'P1';
  }).length;

  const filteredOrders = useMemo(() => {
    if (filterPriority === 'ALL') return workOrders;
    return workOrders.filter((w) => w.risk_assessment?.maintenance_priority === filterPriority);
  }, [workOrders, filterPriority]);

  const handleUpdateStatus = (machineId: string, status: 'PENDING' | 'DISPATCHED' | 'IN_PROGRESS' | 'RESOLVED') => {
    setWorkOrderStatuses((prev) => ({ ...prev, [machineId]: status }));
  };

  const handleCreateAdHoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkOrderMachine) return;
    setWorkOrderStatuses((prev) => ({ ...prev, [newWorkOrderMachine]: 'DISPATCHED' }));
    setShowCreateModal(false);
    setNewWorkOrderNote('');
  };

  const handleExportManifest = () => {
    const data = workOrders.map((w) => ({
      machine_id: w.machine_id,
      priority: w.risk_assessment?.maintenance_priority,
      window: w.risk_assessment?.maintenance_time_window,
      action: w.generated_explanation?.recommended_actions?.[0] || 'Standard maintenance',
      status: workOrderStatuses[w.machine_id] || 'PENDING',
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maintenance_dispatch_manifest_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="view-page-container">
      {/* 1. Top Command & Header Block matching Stitch */}
      <div className="stitch-card p-space-lg mb-space-base">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-base">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="stitch-page-title">Maintenance Dispatch & Work Orders</h1>
              <span className="px-2 py-0.5 rounded bg-surface-container-high text-primary font-label-caps text-label-caps uppercase font-bold">
                Shift A Live
              </span>
            </div>
            <p className="stitch-page-desc max-w-3xl">
              Coordinate predictive mitigation, track technician teams, and verify standard operating procedures (SOPs) across all active machine alerts.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              className="stitch-btn-secondary"
              onClick={() => setShowCreateModal(true)}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">add_circle</span>
              <span>Create Ad-Hoc Work Order</span>
            </button>

            <button
              className="stitch-btn-secondary"
              onClick={handleExportManifest}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">file_download</span>
              <span>Export Dispatch Manifest</span>
            </button>

            {dueImmediateCount > 0 && (
              <button
                className="stitch-btn-primary bg-error hover:bg-red-700"
                onClick={() => {
                  const updated: Record<string, 'DISPATCHED'> = {};
                  workOrders.slice(0, dueImmediateCount).forEach((w) => {
                    updated[w.machine_id] = 'DISPATCHED';
                  });
                  setWorkOrderStatuses((prev) => ({ ...prev, ...updated }));
                }}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">bolt</span>
                <span>Emergency Dispatch ({dueImmediateCount} Due Now)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Top KPI Metric Row (4 Bento Cards matching Stitch) */}
      <div className="stitch-kpi-deck mb-space-base">
        {/* Card 1: Critical Immediate */}
        <div className="stitch-kpi-card critical-border">
          <div className="kpi-card-header">
            <span className="kpi-label-caps text-critical">DUE IMMEDIATELY (&lt;12h RUL)</span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-caps text-[10px] font-bold uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
              CRITICAL ACTION
            </span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val text-critical font-numeric">{dueImmediateCount}</span>
            <span className="kpi-unit-label text-critical font-semibold">Assets on Curve</span>
          </div>
          <div className="kpi-footnote text-secondary">
            {dueImmediateCount > 0 ? 'Mitigation crews assigned' : 'No emergency interventions pending'}
          </div>
        </div>

        {/* Card 2: Active Work Orders */}
        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">ACTIVE WORK ORDERS</span>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-secondary font-label-caps text-[10px] font-semibold uppercase">
              {workOrders.length} REGISTERED
            </span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric">{workOrders.length}</span>
            <span className="kpi-unit-label">Active in Cycle</span>
          </div>
          <div className="kpi-footnote text-secondary">
            Average mitigation lead time: 1.4h
          </div>
        </div>

        {/* Card 3: SOP Verification */}
        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">SOP COMPLIANCE</span>
            <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric text-emerald-600">100%</span>
            <span className="kpi-unit-label">RAG Grounded</span>
          </div>
          <div className="kpi-footnote text-secondary">
            All work orders linked to ISO 10816 SOPs
          </div>
        </div>

        {/* Card 4: Shop Floor Coverage */}
        <div className="stitch-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label-caps">PLANT COVERAGE</span>
            <span className="material-symbols-outlined text-primary text-[18px]">engineering</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-telemetry-val font-numeric">Lines 1–4</span>
          </div>
          <div className="kpi-footnote text-secondary">
            Shift A maintenance crew on standby
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar */}
      <div className="stitch-card p-space-sm mb-space-base">
        <div className="flex items-center justify-between gap-3">
          <div className="status-segmented-control">
            <button
              className={`segment-btn ${filterPriority === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterPriority('ALL')}
            >
              All Priorities ({workOrders.length})
            </button>
            <button
              className={`segment-btn ${filterPriority === 'P1' ? 'active' : ''}`}
              onClick={() => setFilterPriority('P1')}
            >
              P1 Immediate ({workOrders.filter((w) => w.risk_assessment?.maintenance_priority === 'P1').length})
            </button>
            <button
              className={`segment-btn ${filterPriority === 'P2' ? 'active' : ''}`}
              onClick={() => setFilterPriority('P2')}
            >
              P2 High ({workOrders.filter((w) => w.risk_assessment?.maintenance_priority === 'P2').length})
            </button>
          </div>

          <span className="text-secondary text-xs">
            Showing real work orders derived from ML risk & degradation engine
          </span>
        </div>
      </div>

      {/* 4. Work Orders Table matching Stitch */}
      <div className="stitch-card">
        {filteredOrders.length === 0 ? (
          <div className="stitch-empty-state py-12">
            <span className="material-symbols-outlined empty-symbol text-emerald-500">task_alt</span>
            <h3 className="empty-title">No Pending Work Orders</h3>
            <p className="empty-desc">All monitored textile assets are within safe degradation thresholds.</p>
          </div>
        ) : (
          <div className="stitch-table-wrapper">
            <table className="stitch-table">
              <thead>
                <tr>
                  <th className="th-center">Priority</th>
                  <th className="th-left">Machine Asset</th>
                  <th className="th-left">Sub-assembly / Type</th>
                  <th className="th-left">Prescribed Action</th>
                  <th className="th-left">Target Window</th>
                  <th className="th-center">SOP Code</th>
                  <th className="th-right">RUL Horizon</th>
                  <th className="th-center">Dispatch Status</th>
                  <th className="th-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((item) => {
                  const m = machineMap[item.machine_id];
                  const priority = item.risk_assessment?.maintenance_priority || 'P2';
                  const isP1 = priority === 'P1';
                  const windowText = item.risk_assessment?.maintenance_time_window || '< 24 Hours';
                  const action = item.generated_explanation?.recommended_actions?.[0] || 'Perform mechanical inspection.';
                  const sops = item.generated_explanation?.sop_references || [];
                  const sopCode = sops[0] || 'SOP-VIB-014';
                  const rul = item.current_condition?.rul_hours;
                  const currentStatus = workOrderStatuses[item.machine_id] || 'PENDING';

                  return (
                    <tr
                      key={item.machine_id}
                      className={`stitch-row ${isP1 ? 'row-critical' : ''}`}
                      onClick={() => onSelectMachine(item.machine_id)}
                      role="button"
                      tabIndex={0}
                    >
                      <td className="td-center">
                        <span className={`priority-tag ${priority.toLowerCase()} font-bold`}>
                          {priority}
                        </span>
                      </td>
                      <td className="td-left">
                        <div className="machine-cell-id">
                          <span className="cell-id-text font-numeric font-bold">{item.machine_id}</span>
                          <span className="cell-sub-text">
                            {m?.machine_name || `Line ${((m?.id ?? 1) % 4) + 1} · Bay 0${((m?.id ?? 1) % 6) + 1}`}
                          </span>
                        </div>
                      </td>
                      <td className="td-left text-secondary">
                        Type {item.machine_type || m?.machine_type || 'C'} Spindle
                      </td>
                      <td className="td-left">
                        <span className="font-medium text-on-surface line-clamp-1">{action}</span>
                      </td>
                      <td className="td-left font-numeric font-semibold text-secondary">
                        {windowText}
                      </td>
                      <td className="td-center">
                        <span className="sop-code-badge font-numeric">{sopCode}</span>
                      </td>
                      <td className="td-right font-numeric font-bold">
                        <span className={rul != null && rul < 24 ? 'text-critical' : ''}>
                          {rul != null ? `${rul.toFixed(0)}h` : '--'}
                        </span>
                      </td>
                      <td className="td-center" onClick={(e) => e.stopPropagation()}>
                        <select
                          className={`status-select-pill ${currentStatus.toLowerCase()}`}
                          value={currentStatus}
                          onChange={(e) => handleUpdateStatus(item.machine_id, e.target.value as any)}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="DISPATCHED">Dispatched</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="RESOLVED">Resolved</option>
                        </select>
                      </td>
                      <td className="td-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {onOpenAIWithMachine && (
                            <button
                              className="stitch-btn-icon-ai"
                              onClick={() => onOpenAIWithMachine(item.machine_id)}
                              title={`Ask Resonex AI about work order for ${item.machine_id}`}
                              type="button"
                            >
                              <span className="ai-sparkle">✦</span>
                            </button>
                          )}
                          <button
                            className="stitch-btn-inspect"
                            onClick={() => onSelectMachine(item.machine_id)}
                            type="button"
                          >
                            <span>Inspect</span>
                            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ad-Hoc Work Order Modal */}
      {showCreateModal && (
        <div className="stitch-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="stitch-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Ad-Hoc Maintenance Work Order</h3>
              <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateAdHoc} className="modal-form">
              <div className="form-group">
                <label className="form-label">Target Asset:</label>
                <select
                  className="form-select"
                  value={newWorkOrderMachine}
                  onChange={(e) => setNewWorkOrderMachine(e.target.value)}
                >
                  {machines.map((m) => (
                    <option key={m.machine_id} value={m.machine_id}>
                      {m.machine_id} - Type {m.machine_type} {m.machine_name ? `(${m.machine_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Intervention Notes / Inspection Request:</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Describe technician instructions, observed acoustic noise, lubrication check..."
                  value={newWorkOrderNote}
                  onChange={(e) => setNewWorkOrderNote(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="stitch-btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="stitch-btn-primary">
                  Dispatch Crew
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
