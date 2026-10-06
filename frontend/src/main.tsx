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

  // Theme state: Dark Mission Control by default
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('resonex_theme') as 'light' | 'dark') || 'dark';
  });

  // Auto-refresh state (30s polling)
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Global search query
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Global fleet state: initialized with rich telemetry cache so UI is instantaneous
  const [overview, setOverview] = useState<FleetOverview>(MOCK_FLEET_OVERVIEW);
  const [machines, setMachines] = useState<Machine[]>(MOCK_MACHINES);
  const [recommendations, setRecommendations] = useState<RecommendationDecision[]>(MOCK_RECOMMENDATIONS);
  const [loading, setLoading] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  const fetchGlobalData = async () => {
    let anySuccess = false;

    // Concurrently fetch each endpoint without blocking each other
    const p1 = api.getFleetOverview()
      .then((data) => {
        if (data && data.total_machines > 0) {
          setOverview(data);
          anySuccess = true;
        }
      })
      .catch(() => {});

    const p2 = api.getMachines()
      .then((data) => {
        if (data && data.length > 0) {
          setMachines(data);
          anySuccess = true;
        }
      })
      .catch(() => {});

    const p3 = api.getFleetRecommendations()
      .then((data) => {
        if (data && data.length > 0) {
          setRecommendations(data);
          anySuccess = true;
        }
      })
      .catch(() => {});

    await Promise.allSettled([p1, p2, p3]);
    setIsOffline(!anySuccess);
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
            <div className="flex items-center justify-between px-4 py-2 mb-3 bg-[#111C2E] border border-[#243247] rounded-lg text-[#94A3B8] text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">cloud_sync</span>
                <span>Active on local telemetry cache · Auto-connecting to backend on localhost:8000</span>
              </div>
              <button
                onClick={fetchGlobalData}
                className="px-2.5 py-1 rounded bg-[#162338] hover:bg-[#1E2D44] border border-[#243247] text-[#F1F5F9] font-medium transition-colors"
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
