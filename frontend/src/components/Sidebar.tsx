import React from 'react';

export type NavTab = 'dashboard' | 'machines' | 'alerts' | 'maintenance' | 'reports' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  totalMachines: number;
  alertCount: number;
  selectedMachineId: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onNavigate,
  totalMachines,
  alertCount,
  selectedMachineId,
}) => {
  const navItems: { id: NavTab; label: string; icon: string; count?: number; isAlert?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'machines', label: 'Machines', icon: 'precision_manufacturing', count: totalMachines },
    { id: 'alerts', label: 'Alerts', icon: 'warning', count: alertCount > 0 ? alertCount : undefined, isAlert: true },
    { id: 'maintenance', label: 'Maintenance', icon: 'build' },
    { id: 'reports', label: 'Reports', icon: 'assessment' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <aside className="app-sidebar">
      <div className="sidebar-top-section">
        {/* Brand Header */}
        <div className="sidebar-brand" onClick={() => onNavigate('dashboard')} role="button" tabIndex={0}>
          <img src="/resonex_logo.png" alt="Resonex Logo" className="brand-logo-img" />
          <div className="brand-titles">
            <span className="brand-name">RESONEX</span>
            <span className="brand-subline">Telemetry Core</span>
          </div>
        </div>

        {/* Machine Sync Status Strip */}
        <div className="sidebar-connected-pill">
          <span className="status-dot-pulse" />
          <span className="connected-text">{totalMachines} Machines Connected</span>
        </div>

        {/* Navigation Rail */}
        <nav className="sidebar-nav-menu" aria-label="Main Navigation">
          {navItems.map((item) => {
            const isActive = !selectedMachineId && activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-button ${isActive ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="material-symbols-outlined nav-symbol-icon">{item.icon}</span>
                <span className="nav-btn-label">{item.label}</span>
                {item.count !== undefined && (
                  <span className={`nav-badge ${item.isAlert ? 'nav-alert-badge' : 'nav-count-badge'}`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Telemetry Stream Health Footer */}
      <div className="sidebar-bottom-status">
        <div className="telemetry-stat-row">
          <span className="telemetry-stat-label">Vibration Telemetry</span>
          <span className="telemetry-stat-val">99.98%</span>
        </div>
        <div className="telemetry-meter-track">
          <div className="telemetry-meter-bar" style={{ width: '99.98%' }} />
        </div>
        <div className="sidebar-health-row">
          <span className="status-dot-pulse" />
          <span className="version-info">RESONEX v1.0 • Plant 01</span>
        </div>
      </div>
    </aside>
  );
};
