import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: string;
  footnote?: string;
  statusColor?: 'normal' | 'healthy' | 'warning' | 'critical' | 'cyan';
  trendText?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  icon,
  footnote,
  statusColor = 'normal',
  trendText,
}) => {
  const colorMap = {
    normal: 'text-[#F1F5F9]',
    healthy: 'text-[#22C55E]',
    warning: 'text-[#F59E0B]',
    critical: 'text-[#EF4444]',
    cyan: 'text-[#06B6D4]',
  };

  const borderClass = statusColor === 'critical' ? 'critical-border' : '';

  return (
    <div className={`stitch-kpi-card ${borderClass}`}>
      <div className="kpi-card-header">
        <span className="kpi-label-caps">{label}</span>
        {icon && (
          <span className="material-symbols-outlined text-[#94A3B8] text-[18px]">
            {icon}
          </span>
        )}
      </div>
      <div className="kpi-value-row">
        <span className={`kpi-telemetry-val font-numeric ${colorMap[statusColor]}`}>
          {value}
        </span>
        {unit && <span className="kpi-unit-label">{unit}</span>}
      </div>
      {(footnote || trendText) && (
        <div className="kpi-footnote text-[#94A3B8] flex items-center justify-between">
          <span>{footnote}</span>
          {trendText && (
            <span className="text-[11px] font-mono text-[#06B6D4]">{trendText}</span>
          )}
        </div>
      )}
    </div>
  );
};
