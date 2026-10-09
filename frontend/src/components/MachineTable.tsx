import React from 'react';
import { Machine, RecommendationDecision } from '../types';

interface MachineTableProps {
  machines: Machine[];
  recsByMachine: Record<string, RecommendationDecision>;
  onSelectMachine: (machineId: string) => void;
  onOpenAIWithMachine?: (machineId: string) => void;
}

export const MachineTable: React.FC<MachineTableProps> = ({
  machines,
  recsByMachine,
  onSelectMachine,
  onOpenAIWithMachine,
}) => {
  return (
    <div className="table-responsive">
      <table className="stitch-table">
        <thead>
          <tr>
            <th className="th-left">Machine ID</th>
            <th className="th-left">Type & Model</th>
            <th className="th-center">Health Status</th>
            <th className="th-center">Risk Level</th>
            <th className="th-right">Estimated RUL</th>
            <th className="th-right">Vibration (RMS)</th>
            <th className="th-right">Temp</th>
            <th className="th-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {machines.map((machine) => {
            const isAwaiting = machine.monitoring_readiness === 'Awaiting Data' || machine.total_readings === 0;
            const rec = recsByMachine[machine.machine_id];
            const riskLevel = isAwaiting ? 'PENDING' : (rec?.risk_assessment?.risk_level || 'LOW');
            const healthLabel = isAwaiting ? 'Awaiting Data' : (rec?.current_condition?.health_state_label || 'Good');
            const healthScore = isAwaiting ? null : (rec?.current_condition?.health_score ?? 100);
            const rul = isAwaiting ? null : rec?.current_condition?.rul_hours;
            const vib = isAwaiting ? null : rec?.measured_evidence?.vibration_magnitude;
            const temp = isAwaiting ? null : rec?.measured_evidence?.temperature;

            return (
              <tr
                key={machine.machine_id}
                onClick={() => onSelectMachine(machine.machine_id)}
                className="table-row-hover cursor-pointer"
              >
                <td className="td-left font-numeric font-medium">
                  <div className="machine-cell-id">
                    <span className="cell-id-text font-numeric font-semibold text-[#F1F5F9]">{machine.machine_id}</span>
                    {machine.machine_name && (
                      <span className="cell-sub-text text-[#94A3B8] text-xs">{machine.machine_name}</span>
                    )}
                  </div>
                </td>
                <td className="td-left text-[#94A3B8]">
                  Type {machine.machine_type}
                </td>
                <td className="td-center">
                  {isAwaiting ? (
                    <span className="status-chip awaiting">
                      <span className="chip-dot" />
                      <span>Awaiting Data</span>
                    </span>
                  ) : (
                    <span className={`status-chip ${healthLabel.toLowerCase()}`}>
                      <span className="chip-dot" />
                      <span>{healthLabel} ({healthScore?.toFixed(0)})</span>
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
                  ) : (
                    <span className={rul != null && rul < 24 ? 'text-[#EF4444] font-medium' : 'text-[#F1F5F9]'}>
                      {rul != null ? `${rul.toFixed(0)} hrs` : 'Normal'}
                    </span>
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
                <td className="td-right font-numeric">
                  {temp != null ? (
                    <span className={temp > 75 ? 'text-[#EF4444] font-medium' : 'text-[#94A3B8]'}>
                      {temp.toFixed(1)} °C
                    </span>
                  ) : (
                    <span className="text-[#64748B]">--</span>
                  )}
                </td>
                <td className="td-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5">
                    {onOpenAIWithMachine && (
                      <button
                        className="stitch-btn-icon-ai"
                        onClick={() => onOpenAIWithMachine(machine.machine_id)}
                        title={`Ask AI Assistant about ${machine.machine_id}`}
                        type="button"
                      >
                        <span className="ai-sparkle">✦</span>
                      </button>
                    )}
                    <button
                      className="stitch-btn-inspect"
                      onClick={() => onSelectMachine(machine.machine_id)}
                      type="button"
                    >
                      <span>View</span>
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
  );
};
