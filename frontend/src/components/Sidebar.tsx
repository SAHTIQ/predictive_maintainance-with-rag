import React from 'react';
import { NavLink } from 'react-router-dom';

export type NavTab = 'dashboard' | 'machines' | 'alerts' | 'maintenance' | 'reports' | 'settings' | 'assistant';

export interface SidebarProps {
  totalMachines: number;
  alertCount: number;
  selectedMachineId?: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  totalMachines,
  alertCount,
}) => {
  const navItems = [
    { to: '/overview', label: 'Overview', icon: 'dashboard' },
    { to: '/machines', label: 'All Machines', icon: 'precision_manufacturing', count: totalMachines },
    { to: '/alerts', label: 'Alerts & Warnings', icon: 'warning', count: alertCount > 0 ? alertCount : undefined, isAlert: true },
    { to: '/maintenance', label: 'Maintenance & Repairs', icon: 'build' },
    { to: '/reports', label: 'Shift Reports', icon: 'assessment' },
    { to: '/settings', label: 'Settings', icon: 'settings' },
    { to: '/profile', label: 'Operator Profile', icon: 'account_circle' },
    { to: '/assistant', label: 'Resonex AI', icon: 'smart_toy', isAi: true },
  ];

  return (
    <aside className="app-sidebar">
      <div className="sidebar-top-section">
        {/* Brand Header */}
        <NavLink to="/overview" className="sidebar-brand no-underline">
          <img src="/resonex_logo.png" alt="Resonex Logo" className="brand-logo-img" />
          <div className="brand-titles">
            <span className="brand-name">RESONEX</span>
            <span className="brand-subline">Smart Machine Monitor</span>
          </div>
        </NavLink>

        {/* Machine Sync Status Strip */}
        <div className="sidebar-connected-pill">
          <span className="status-dot-clean" />
          <span className="connected-text">{totalMachines} Machines Active</span>
        </div>

        {/* Navigation Rail */}
        <nav className="sidebar-nav-menu" aria-label="Main Navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-button no-underline ${isActive ? 'active' : ''}`}
            >
              <span className={`material-symbols-outlined nav-symbol-icon ${item.isAi ? 'text-[#06B6D4]' : ''}`}>
                {item.icon}
              </span>
              <span className="nav-btn-label">{item.label}</span>
              {item.count !== undefined && (
                <span className={`nav-badge ${item.isAlert ? 'nav-alert-badge' : 'nav-count-badge'}`}>
                  {item.count}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Telemetry Stream Health Footer */}
      <div className="sidebar-bottom-status">
        <div className="telemetry-stat-row">
          <span className="telemetry-stat-label">Sensor Signal Quality</span>
          <span className="telemetry-stat-val">99.98%</span>
        </div>
        <div className="telemetry-meter-track">
          <div className="telemetry-meter-bar" style={{ width: '99.98%' }} />
        </div>
        <div className="sidebar-health-row">
          <span className="status-dot-clean" />
          <span className="version-info">RESONEX v1.0 • Plant 01</span>
        </div>
      </div>
    </aside>
  );
};
