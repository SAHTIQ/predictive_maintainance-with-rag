import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  trend?: {
    text: string;
    isPositive?: boolean;
    isWarning?: boolean;
  };
  icon?: React.ReactNode;
  statusBadge?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  trend,
  icon,
  statusBadge,
}) => {
  return (
    <div className="saas-card metric-card-v2">
      <div className="metric-header-v2">
        <span className="metric-title-v2">{title}</span>
        {icon && <div className="metric-icon-wrapper">{icon}</div>}
      </div>
      <div className="metric-body-v2">
        <div className="metric-value-row">
          <span className="metric-value-v2">{value}</span>
          {unit && <span className="metric-unit-v2">{unit}</span>}
        </div>
        {statusBadge && <div className="metric-badge-slot">{statusBadge}</div>}
      </div>
      {(subtitle || trend) && (
        <div className="metric-footer-v2">
          {trend && (
            <span className={`trend-tag ${trend.isWarning ? 'trend-warning' : trend.isPositive ? 'trend-positive' : 'trend-neutral'}`}>
              {trend.text}
            </span>
          )}
          {subtitle && <span className="metric-subtitle-v2">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
