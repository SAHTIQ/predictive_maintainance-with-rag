import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { FleetOverview, Machine, RecommendationDecision } from './types';
import { api } from './services/api';
import { Sidebar, NavTab } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { FleetDashboard } from './components/FleetDashboard';
import { MachinesView } from './components/MachinesView';
import { MachineDetail } from './components/MachineDetail';
import { AlertsView } from './components/AlertsView';
import { MaintenanceView } from './components/MaintenanceView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { ResonexAIButton } from './components/ResonexAIButton';
import { ResonexAIDrawer, AlertContext } from './components/ResonexAIDrawer';

import { MOCK_FLEET_OVERVIEW, MOCK_MACHINES, MOCK_RECOMMENDATIONS } from './services/mockData';

function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);

  // Global Resonex AI Drawer state
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState<boolean>(false);
  const [activeAlertContext, setActiveAlertContext] = useState<AlertContext | null>(null);

  // Theme state: light by default
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('resonex_theme') as 'light' | 'dark') || 'light';
  });

  // Auto-refresh state (30s polling)
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Global search query
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Global fleet state from real APIs or fallback
  const [overview, setOverview] = useState<FleetOverview | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationDecision[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  const fetchGlobalData = async () => {
    setLoading(true);
    try {
      const [overviewData, machinesData, recsData] = await Promise.all([
        api.getFleetOverview(),
        api.getMachines(),
        api.getFleetRecommendations().catch(() => []),
      ]);
      setOverview(overviewData);
      setMachines(machinesData.length > 0 ? machinesData : MOCK_MACHINES);
      setRecommendations(recsData.length > 0 ? recsData : MOCK_RECOMMENDATIONS);
      setIsOffline(false);
    } catch {
      // Backend offline or unreachable: fall back smoothly to rich local plant telemetry cache
      setOverview(MOCK_FLEET_OVERVIEW);
      setMachines(MOCK_MACHINES);
      setRecommendations(MOCK_RECOMMENDATIONS);
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalData();
  }, []);

  // Theme application: synchronizes both data-theme attribute AND Tailwind's .dark class on html & body
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    localStorage.setItem('resonex_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Auto-refresh interval (every 30s when enabled)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      Promise.all([
        api.getFleetOverview(),
        api.getMachines(),
        api.getFleetRecommendations().catch(() => []),
      ]).then(([overviewData, machinesData, recsData]) => {
        setOverview(overviewData);
        if (machinesData && machinesData.length > 0) setMachines(machinesData);
        if (recsData && recsData.length > 0) setRecommendations(recsData);
        setIsOffline(false);
      }).catch(() => {
        // Silently preserve existing data on background tick
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleSelectMachine = (machineId: string) => {
    setSelectedMachineId(machineId);
    setActiveAlertContext(null);
  };

  const handleBackToFleet = () => {
    setSelectedMachineId(null);
  };

  const handleNavClick = (tab: NavTab) => {
    setActiveTab(tab);
    setSelectedMachineId(null);
    setActiveAlertContext(null);
  };

  // Open Resonex AI focused on a specific machine
  const handleOpenAIWithMachine = (machineId: string) => {
    setSelectedMachineId(machineId);
    setActiveAlertContext(null);
    setIsAIDrawerOpen(true);
  };

  // Open Resonex AI focused on a specific alert
  const handleOpenAIWithAlert = (alertCtx: AlertContext) => {
    setActiveAlertContext(alertCtx);
    setIsAIDrawerOpen(true);
  };

  // TopBar search handler
  const handleSearchMachine = (query: string) => {
    setSearchQuery(query);
    if (query && !selectedMachineId && activeTab !== 'machines') {
      setActiveTab('machines');
    }
  };

  // Map recommendations by machine_id for easy lookup
  const recsByMachine = recommendations.reduce<Record<string, RecommendationDecision>>((acc, r) => {
    acc[r.machine_id] = r;
    return acc;
  }, {});

  // Compute alert count for badge
  const alertCount = recommendations.filter((r) => {
    const risk = r.risk_assessment?.risk_level || 'LOW';
    const health = r.current_condition?.health_state_label || 'Good';
    return risk === 'CRITICAL' || risk === 'HIGH' || risk === 'MEDIUM' || health === 'Critical';
  }).length;

  return (
    <div className="app-layout">
      {/* 1. Left Sidebar Navigation matching Stitch */}
      <Sidebar
        activeTab={activeTab}
        onNavigate={handleNavClick}
        totalMachines={machines.length}
        alertCount={alertCount}
        selectedMachineId={selectedMachineId}
      />

      {/* 2. Main Workspace Container */}
      <div className="app-main-container">
        {/* Fixed TopBar Header */}
        <TopBar
          activeTab={activeTab}
          selectedMachineId={selectedMachineId}
          totalMachines={machines.length}
          alertCount={alertCount}
          autoRefresh={autoRefresh}
          onToggleAutoRefresh={() => setAutoRefresh((prev) => !prev)}
          theme={theme}
          onToggleTheme={toggleTheme}
          searchQuery={searchQuery}
          onSearchMachine={handleSearchMachine}
          onSelectMachine={handleSelectMachine}
        />

        {/* Dynamic Main Body Content */}
        <main className="app-main-body">
          {isOffline && (
            <div className="flex items-center justify-between px-space-base py-space-xs mb-space-sm bg-surface-container-low border border-outline-variant/60 rounded-lg text-secondary text-xs">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[16px] text-primary">cloud_sync</span>
                <span>Active on local telemetry cache · Auto-connecting to backend on localhost:8000</span>
              </div>
              <button
                onClick={fetchGlobalData}
                className="px-2 py-0.5 rounded bg-surface-container-high hover:bg-surface-container text-on-surface font-semibold transition-colors"
                type="button"
              >
                Sync Now
              </button>
            </div>
          )}

          {selectedMachineId ? (
            <MachineDetail
              machineId={selectedMachineId}
              onBack={handleBackToFleet}
              onOpenAIWithMachine={handleOpenAIWithMachine}
              onNavigateTab={(tab) => handleNavClick(tab as NavTab)}
            />
          ) : activeTab === 'dashboard' ? (
            <FleetDashboard
              overview={overview}
              machines={machines}
              recommendations={recommendations}
              onSelectMachine={handleSelectMachine}
              onNavigateTab={(tab) => handleNavClick(tab as NavTab)}
              onOpenAIWithMachine={handleOpenAIWithMachine}
            />
          ) : activeTab === 'machines' ? (
            <MachinesView
              machines={machines}
              recsByMachine={recsByMachine}
              onSelectMachine={handleSelectMachine}
              onOpenAIWithMachine={handleOpenAIWithMachine}
            />
          ) : activeTab === 'alerts' ? (
            <AlertsView
              recommendations={recommendations}
              machines={machines}
              onSelectMachine={handleSelectMachine}
              onOpenAIWithAlert={handleOpenAIWithAlert}
              onNavigateTab={(tab) => handleNavClick(tab as NavTab)}
            />
          ) : activeTab === 'maintenance' ? (
            <MaintenanceView
              recommendations={recommendations}
              machines={machines}
              onSelectMachine={handleSelectMachine}
              onOpenAIWithMachine={handleOpenAIWithMachine}
            />
          ) : activeTab === 'reports' ? (
            <ReportsView
              overview={overview}
              recommendations={recommendations}
              machines={machines}
              onSelectMachine={handleSelectMachine}
            />
          ) : activeTab === 'settings' ? (
            <SettingsView />
          ) : null}
        </main>
      </div>

      {/* 3. Global Floating Resonex AI Button (Present on every screen) */}
      <ResonexAIButton
        isOpen={isAIDrawerOpen}
        onToggle={() => setIsAIDrawerOpen((prev) => !prev)}
        hasContextAlert={Boolean(activeAlertContext)}
        contextMachineId={activeAlertContext?.machineId || selectedMachineId}
      />

      {/* 4. Global Context-Aware Resonex AI Slide-Over Drawer */}
      <ResonexAIDrawer
        isOpen={isAIDrawerOpen}
        onClose={() => setIsAIDrawerOpen(false)}
        activeTab={activeTab}
        selectedMachineId={selectedMachineId}
        activeAlertContext={activeAlertContext}
        machines={machines}
        onSelectMachine={handleSelectMachine}
      />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
