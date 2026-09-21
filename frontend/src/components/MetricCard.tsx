import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  status?: 'normal' | 'warning' | 'critical' | 'info';
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  status = 'info',
  icon,
}) => {
  const statusClasses = {
    normal: 'status-normal',
    warning: 'status-warning',
    critical: 'status-critical',
    info: 'status-info',
  };

  return (
    <div className={`metric-card ${statusClasses[status]}`}>
      <div className="metric-header">
        <span className="metric-title">{title}</span>
        {icon && <span className="metric-icon">{icon}</span>}
      </div>
      <div className="metric-body">
        <span className="metric-value">{value}</span>
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
      {subtitle && <div className="metric-subtitle">{subtitle}</div>}
    </div>
  );
};
