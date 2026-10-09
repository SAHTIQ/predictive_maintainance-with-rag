import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { ResonexAIButton } from '../components/ResonexAIButton';
import { ResonexAIDrawer } from '../components/ResonexAIDrawer';
import { useFleet } from '../context/FleetContext';

export const DashboardLayout: React.FC = () => {
  const {
    machines,
    alertCount,
    autoRefresh,
    setAutoRefresh,
    theme,
    toggleTheme,
    searchQuery,
    setSearchQuery,
    isOffline,
    refreshData,
    isAIDrawerOpen,
    setIsAIDrawerOpen,
    activeAlertContext,
  } = useFleet();

  const location = useLocation();

  // Extract selectedMachineId if on /machines/:machineId
  const machineMatch = location.pathname.match(/^\/machines\/([^/]+)$/);
  const selectedMachineId = machineMatch ? machineMatch[1] : null;

  // Map route to activeTab for legacy sub-component compatibility
  const getActiveTab = () => {
    if (location.pathname.startsWith('/machines')) return 'machines';
    if (location.pathname.startsWith('/alerts')) return 'alerts';
    if (location.pathname.startsWith('/maintenance')) return 'maintenance';
    if (location.pathname.startsWith('/reports')) return 'reports';
    if (location.pathname.startsWith('/settings')) return 'settings';
    if (location.pathname.startsWith('/assistant')) return 'settings'; // or default
    return 'dashboard';
  };

  return (
    <div className="app-layout">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        totalMachines={machines.length}
        alertCount={alertCount}
        selectedMachineId={selectedMachineId}
      />

      {/* 2. Main Workspace Container */}
      <div className="app-main-container">
        {/* Fixed TopBar Header */}
        <TopBar
          totalMachines={machines.length}
          alertCount={alertCount}
          autoRefresh={autoRefresh}
          onToggleAutoRefresh={() => setAutoRefresh((prev) => !prev)}
          theme={theme}
          onToggleTheme={toggleTheme}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isOffline={isOffline}
        />

        {/* Dynamic Main Body Content rendered via React Router Outlet */}
        <main className="app-main-body">
          {isOffline && (
            <div className="flex items-center justify-between px-4 py-2 mb-3 bg-[#111C2E] border border-[#243247] rounded-lg text-[#94A3B8] text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">cloud_sync</span>
                <span>Active on local telemetry cache · Auto-connecting to backend on localhost:8000</span>
              </div>
              <button
                onClick={refreshData}
                className="px-2.5 py-1 rounded bg-[#162338] hover:bg-[#1E2D44] border border-[#243247] text-[#F1F5F9] font-medium transition-colors"
                type="button"
              >
                Sync Now
              </button>
            </div>
          )}

          <Outlet />
        </main>
      </div>

      {/* 3. Global Floating Resonex AI Button (Quick drawer toggle, hidden when on full assistant page) */}
      {!location.pathname.startsWith('/assistant') && (
        <ResonexAIButton
          isOpen={isAIDrawerOpen}
          onToggle={() => setIsAIDrawerOpen(!isAIDrawerOpen)}
          hasContextAlert={Boolean(activeAlertContext)}
          contextMachineId={activeAlertContext?.machineId || selectedMachineId}
        />
      )}

      {/* 4. Global Context-Aware Resonex AI Slide-Over Drawer */}
      <ResonexAIDrawer
        isOpen={isAIDrawerOpen}
        onClose={() => setIsAIDrawerOpen(false)}
        activeTab={getActiveTab() as any}
        selectedMachineId={selectedMachineId}
        activeAlertContext={activeAlertContext}
        machines={machines}
      />
    </div>
  );
};
