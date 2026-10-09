import React, { useRef, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFleet } from '../context/FleetContext';
import { UserMenu } from './UserMenu';

interface TopBarProps {
  totalMachines: number;
  alertCount: number;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  isOffline?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  totalMachines,
  alertCount,
  autoRefresh,
  onToggleAutoRefresh,
  theme,
  onToggleTheme,
  searchQuery = '',
  onSearchChange,
  isOffline = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { currentUser } = useFleet();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const getInitials = (name: string) => {
    if (!name) return 'OP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

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

  // Determine breadcrumb based on current path
  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path.startsWith('/machines/')) {
      const machineId = path.split('/')[2];
      return {
        section: 'Machines',
        sectionPath: '/machines',
        current: machineId || 'Detail',
        isDetail: true,
      };
    }
    if (path.startsWith('/machines')) {
      return { section: 'Inventory', sectionPath: '/machines', current: 'All Machines', isDetail: false };
    }
    if (path.startsWith('/alerts')) {
      return { section: 'Warning Center', sectionPath: '/alerts', current: 'Active Alerts', isDetail: false };
    }
    if (path.startsWith('/maintenance')) {
      return { section: 'Maintenance', sectionPath: '/maintenance', current: 'Work Orders', isDetail: false };
    }
    if (path.startsWith('/reports')) {
      return { section: 'Analytics', sectionPath: '/reports', current: 'Shift Reports', isDetail: false };
    }
    if (path.startsWith('/settings')) {
      return { section: 'Configuration', sectionPath: '/settings', current: 'Safety Limits', isDetail: false };
    }
    if (path.startsWith('/assistant')) {
      return { section: 'AI Workspace', sectionPath: '/assistant', current: 'Resonex AI', isDetail: false };
    }
    return { section: 'Factory Overview', sectionPath: '/overview', current: 'Machine Health', isDetail: false };
  };

  const breadcrumb = getBreadcrumb();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/machines?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="app-topbar">
      {/* LEFT: Contextual Breadcrumb + Global Search */}
      <div className="topbar-left-cluster">
        {breadcrumb.isDetail ? (
          <div className="topbar-machine-nav">
            <button
              className="topbar-back-btn"
              onClick={() => navigate('/machines')}
              title="Return to fleet overview"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Machines</span>
            </button>
            <span className="topbar-crumb-sep">/</span>
            <span className="topbar-machine-badge font-numeric">{breadcrumb.current}</span>
          </div>
        ) : (
          <nav className="topbar-breadcrumbs" aria-label="Breadcrumb">
            <button
              className="topbar-crumb-section-btn"
              onClick={() => navigate(breadcrumb.sectionPath)}
              type="button"
            >
              {breadcrumb.section}
            </button>
            <span className="topbar-crumb-sep">/</span>
            <span className="topbar-crumb-current">{breadcrumb.current}</span>
          </nav>
        )}

        {/* Global Machine Search Bar */}
        <form onSubmit={handleSearchSubmit} className="topbar-search-box">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            ref={searchInputRef}
            type="text"
            className="topbar-search-input"
            placeholder="Search machines (e.g. TXM)..."
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          />
          {searchQuery ? (
            <button
              className="search-clear-btn"
              onClick={() => onSearchChange && onSearchChange('')}
              title="Clear search"
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          ) : (
            <kbd className="search-kbd" title="Press / to search">/</kbd>
          )}
        </form>
      </div>

      {/* RIGHT: Telemetry, Shift, Controls & Operator Profile */}
      <div className="topbar-right-cluster">
        {/* Fleet Online Status Pill */}
        <div
          className={`topbar-telemetry-pill ${isOffline ? 'bg-[#EF4444]/10 border border-[#EF4444]/30' : ''}`}
          title={isOffline ? 'Backend offline - serving cached data' : 'Live sensor network connected'}
        >
          <span className={`telemetry-beacon-dot ${isOffline ? 'bg-[#EF4444]' : ''}`} />
          <span className="telemetry-pill-text">
            {isOffline ? (
              <span className="text-[#EF4444]">Offline · Cached</span>
            ) : (
              <>Fleet Online · <strong className="font-numeric text-slate-200">{totalMachines}</strong> Connected</>
            )}
          </span>
        </div>

        {/* Current Factory Shift */}
        <div className="topbar-shift-pill" title="Active Shift & Production Area">
          <span className="material-symbols-outlined shift-icon">schedule</span>
          <span className="shift-pill-title">Shift A</span>
          <span className="shift-pill-sub">Lines 1–4</span>
        </div>

        {/* Utility Controls Group */}
        <div className="topbar-actions-group">
          {/* Auto-Sync Toggle Button */}
          <button
            className={`topbar-sync-btn ${autoRefresh ? 'active' : 'paused'}`}
            onClick={onToggleAutoRefresh}
            title={autoRefresh ? 'Live Polling Active (30s cadence) - Click to pause' : 'Polling Paused - Click to resume'}
            type="button"
          >
            <span className={`material-symbols-outlined sync-icon ${autoRefresh ? 'spinning' : ''}`}>
              sync
            </span>
            <span className="sync-btn-label">Auto-Sync</span>
            <span className="sync-interval-tag font-numeric">{autoRefresh ? '30s' : 'Off'}</span>
          </button>

          {/* Active Alerts Notification Bell */}
          <button
            className="topbar-icon-btn notifications-btn"
            onClick={() => navigate('/alerts')}
            title={`${alertCount} Active Alerts - Click to view warning center`}
            type="button"
          >
            <span className="material-symbols-outlined text-[19px]">notifications</span>
            {alertCount > 0 && (
              <span className="topbar-notif-badge font-numeric">
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            )}
          </button>

          {/* Theme Toggle Button */}
          <button
            className="topbar-icon-btn theme-btn"
            onClick={onToggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            aria-label="Toggle Theme"
            type="button"
          >
            <span className="material-symbols-outlined text-[19px]">
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>
        </div>

        {/* Vertical Divider */}
        <div className="topbar-v-divider" />

        {/* Operator Profile Capsule & User Menu */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="topbar-user-profile"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-haspopup="true"
            aria-expanded={isMenuOpen}
            title={`Operator: ${currentUser.full_name} (${currentUser.job_title})`}
            style={{
              background: isMenuOpen ? 'var(--bg-card-hover)' : 'transparent',
              border: 'none',
              font: 'inherit',
              color: 'inherit',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div className="profile-avatar-wrap">
              {currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.full_name}
                  className="profile-avatar-img"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(6, 182, 212, 0.15)',
                    border: '1px solid rgba(6, 182, 212, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#06B6D4',
                  }}
                >
                  {getInitials(currentUser.full_name)}
                </div>
              )}
              <span
                className="profile-status-dot"
                style={{
                  backgroundColor: currentUser.account_status === 'ACTIVE' ? '#22C55E' : '#EAB308',
                }}
              />
            </div>
            <div className="profile-info-col">
              <span className="profile-user-name">{currentUser.full_name || 'Operator'}</span>
              <span className="profile-user-role">{currentUser.job_title || currentUser.role}</span>
            </div>
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '16px',
                color: 'var(--text-muted)',
                marginLeft: '4px',
                transform: isMenuOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s ease',
              }}
            >
              expand_more
            </span>
          </button>

          <UserMenu
            user={currentUser}
            isOpen={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
            onProfileClick={() => navigate('/profile')}
          />
        </div>
      </div>
    </header>
  );
};
