import React, { useRef, useEffect } from 'react';
import { NavTab } from './Sidebar';

interface TopBarProps {
  activeTab: NavTab;
  selectedMachineId: string | null;
  totalMachines: number;
  alertCount: number;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onSearchMachine?: (query: string) => void;
  searchQuery?: string;
  onSelectMachine?: (machineId: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  selectedMachineId,
  totalMachines,
  alertCount,
  autoRefresh,
  onToggleAutoRefresh,
  theme,
  onToggleTheme,
  onSearchMachine,
  searchQuery = '',
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut '/' to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getBreadcrumb = () => {
    if (selectedMachineId) {
      return { section: 'Machines', current: `Machine Detail (${selectedMachineId})` };
    }
    switch (activeTab) {
      case 'dashboard':
        return { section: 'Fleet Operations', current: 'Operational Matrix' };
      case 'machines':
        return { section: 'Fleet Registry', current: 'All Operational Units' };
      case 'alerts':
        return { section: 'Action Center', current: 'Real-Time Anomaly Triage' };
      case 'maintenance':
        return { section: 'Dispatch', current: 'Work Orders & Mitigation' };
      case 'reports':
        return { section: 'Operations', current: 'Shift & Fleet Reports' };
      case 'settings':
        return { section: 'System', current: 'Configuration & Thresholds' };
      default:
        return { section: 'Operations', current: 'Overview' };
    }
  };

  const breadcrumb = getBreadcrumb();

  return (
    <header className="app-topbar">
      <div className="topbar-left-cluster">
        {/* Breadcrumbs */}
        <div className="topbar-breadcrumbs">
          <span className="crumb-root">Resonex</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-section">{breadcrumb.section}</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-current">{breadcrumb.current}</span>
        </div>

        {/* Global Machine Search Bar with '/' Shortcut */}
        <div className="topbar-search-box">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            ref={searchInputRef}
            type="text"
            className="topbar-search-input"
            placeholder="Search machines... (press /)"
            value={searchQuery}
            onChange={(e) => onSearchMachine && onSearchMachine(e.target.value)}
          />
          <kbd className="search-kbd">/</kbd>
        </div>
      </div>

      <div className="topbar-right-cluster">
        {/* Sync Status Badge */}
        <div className="topbar-sync-pill">
          <span className="sync-dot-pulse" />
          <span className="sync-pill-text">Monitoring Active · {totalMachines}/{totalMachines} Synced</span>
        </div>

        {/* Shift Badge */}
        <div className="topbar-shift-pill">
          <span className="material-symbols-outlined shift-icon">schedule</span>
          <span>Shift A · Lines 1-4</span>
        </div>

        {/* Notifications Icon with Badge */}
        <div className="topbar-notifications-wrap" title={`${alertCount} Active Alerts`}>
          <span className="material-symbols-outlined bell-icon">notifications</span>
          {alertCount > 0 && <span className="topbar-notif-count">{alertCount}</span>}
        </div>

        {/* Auto-Refresh Toggle */}
        <button
          className={`topbar-toggle-btn ${autoRefresh ? 'active' : ''}`}
          onClick={onToggleAutoRefresh}
          title={autoRefresh ? 'Live Polling Active (30s) - Click to pause' : 'Polling Paused - Click to resume'}
          type="button"
        >
          <span className={`pulse-circle ${autoRefresh ? 'live' : 'paused'}`} />
          <span>{autoRefresh ? 'Auto-Sync (30s)' : 'Sync Paused'}</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          className="topbar-theme-btn"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          aria-label="Toggle Theme"
          type="button"
        >
          <span className="material-symbols-outlined theme-icon">
            {theme === 'light' ? 'dark_mode' : 'light_mode'}
          </span>
        </button>

        {/* Operator Profile */}
        <div className="topbar-profile-item">
          <img
            src="/operations_manager_avatar.png"
            alt="Operator Profile"
            className="profile-avatar"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <div className="profile-details">
            <span className="profile-name">Mark Jenkins</span>
            <span className="profile-role">Lead Monitorer</span>
          </div>
        </div>
      </div>
    </header>
  );
};
