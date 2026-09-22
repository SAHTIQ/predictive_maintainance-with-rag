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

  // Global fleet state from real APIs
  const [overview, setOverview] = useState<FleetOverview | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationDecision[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGlobalData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewData, machinesData, recsData] = await Promise.all([
        api.getFleetOverview(),
        api.getMachines(),
        api.getFleetRecommendations().catch(() => []),
      ]);
      setOverview(overviewData);
      setMachines(machinesData);
      setRecommendations(recsData);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to predictive maintenance backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalData();
  }, []);

  // Theme application
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
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
        setMachines(machinesData);
        setRecommendations(recsData);
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
          {loading ? (
            <div className="stitch-state-container">
              <div className="stitch-spinner" />
              <p className="state-text">Initializing RESONEX platform telemetry...</p>
            </div>
          ) : error ? (
            <div className="stitch-state-container error">
              <span className="material-symbols-outlined state-error-icon">wifi_off</span>
              <h3 className="state-error-title">Backend Telemetry Unreachable</h3>
              <p className="state-error-msg">{error}</p>
              <button className="stitch-btn-primary" onClick={fetchGlobalData}>
                Retry Connection
              </button>
            </div>
          ) : selectedMachineId ? (
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
