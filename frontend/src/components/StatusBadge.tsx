import React from 'react';

export type BadgeVariant = 
  | 'Good' | 'Warning' | 'Critical' 
  | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  | 'P0' | 'P1' | 'P2' | 'P3'
  | 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  size = 'md',
  showDot = true 
}) => {
  const norm = status?.toUpperCase() || '';

  let colorClass = 'badge-gray';
  let dotClass = 'dot-gray';
  let label = status;

  if (norm === 'GOOD' || norm === 'LOW' || norm === 'P3' || norm === 'NORMAL' || norm === 'ACTIVE') {
    colorClass = 'badge-green';
    dotClass = 'dot-green';
    if (norm === 'P3') label = 'P3 (Low)';
  } else if (norm === 'WARNING' || norm === 'MEDIUM' || norm === 'P2') {
    colorClass = 'badge-amber';
    dotClass = 'dot-amber';
    if (norm === 'P2') label = 'P2 (Medium)';
  } else if (norm === 'HIGH' || norm === 'P1') {
    colorClass = 'badge-orange';
    dotClass = 'dot-orange';
    if (norm === 'P1') label = 'P1 (High)';
  } else if (norm === 'CRITICAL' || norm === 'P0') {
    colorClass = 'badge-red';
    dotClass = 'dot-red';
    if (norm === 'P0') label = 'P0 (Emergency)';
  }

  return (
    <span className={`status-pill ${colorClass} ${size === 'sm' ? 'pill-sm' : ''}`}>
      {showDot && <span className={`pill-dot ${dotClass}`} />}
      <span className="pill-text">{label}</span>
    </span>
  );
};
