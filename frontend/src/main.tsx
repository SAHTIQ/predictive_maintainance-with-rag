import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { FleetOverview, Machine, RecommendationDecision } from './types';
import { api } from './services/api';
import { FleetDashboard } from './components/FleetDashboard';
import { MachinesView } from './components/MachinesView';
import { AlertsView } from './components/AlertsView';
import { MaintenanceView } from './components/MaintenanceView';
import { ReportsView } from './components/ReportsView';
import { MachineDetail } from './components/MachineDetail';

type AppTab = 'dashboard' | 'machines' | 'alerts' | 'maintenance' | 'reports';

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);

  // Global fleet state
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

  const handleSelectMachine = (machineId: string) => {
    setSelectedMachineId(machineId);
  };

  const handleBackToFleet = () => {
    setSelectedMachineId(null);
  };

  const handleNavClick = (tab: AppTab) => {
    setActiveTab(tab);
    setSelectedMachineId(null);
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
      {/* SaaS Left Sidebar */}
      <aside className="app-sidebar">
        {/* Brand Header */}
        <div className="sidebar-brand" onClick={() => handleNavClick('dashboard')}>
          <div className="brand-logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div className="brand-titles">
            <span className="brand-name">RESONEX</span>
            <span className="brand-subline">Predictive Maintenance</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="sidebar-nav-menu">
          <button
            className={`nav-button ${!selectedMachineId && activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavClick('dashboard')}
          >
            <span className="nav-btn-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="7" height="9" x="3" y="3" rx="1" />
                <rect width="7" height="5" x="14" y="3" rx="1" />
                <rect width="7" height="9" x="14" y="12" rx="1" />
                <rect width="7" height="5" x="3" y="16" rx="1" />
              </svg>
            </span>
            <span className="nav-btn-label">Dashboard</span>
          </button>

          <button
            className={`nav-button ${!selectedMachineId && activeTab === 'machines' ? 'active' : ''}`}
            onClick={() => handleNavClick('machines')}
          >
            <span className="nav-btn-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="8" x="2" y="2" rx="2" />
                <rect width="20" height="8" x="2" y="14" rx="2" />
                <line x1="6" x2="6.01" y1="6" y2="6" />
                <line x1="6" x2="6.01" y1="18" y2="18" />
              </svg>
            </span>
            <span className="nav-btn-label">Machines</span>
            <span className="nav-count-badge">{machines.length}</span>
          </button>

          <button
            className={`nav-button ${!selectedMachineId && activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => handleNavClick('alerts')}
          >
            <span className="nav-btn-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </span>
            <span className="nav-btn-label">Alerts</span>
            {alertCount > 0 && <span className="nav-alert-badge">{alertCount}</span>}
          </button>

          <button
            className={`nav-button ${!selectedMachineId && activeTab === 'maintenance' ? 'active' : ''}`}
            onClick={() => handleNavClick('maintenance')}
          >
            <span className="nav-btn-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </span>
            <span className="nav-btn-label">Maintenance</span>
          </button>

          <button
            className={`nav-button ${!selectedMachineId && activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => handleNavClick('reports')}
          >
            <span className="nav-btn-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
            </span>
            <span className="nav-btn-label">Reports</span>
          </button>
        </nav>

        {/* Sidebar Footer Status */}
        <div className="sidebar-bottom-status">
          <div className="status-live-indicator">
            <span className="status-dot-pulse" />
            <span className="status-live-text">Backend Connected</span>
          </div>
          <span className="version-info">RESONEX v1.0 • Enterprise</span>
        </div>
      </aside>

      {/* Main Container */}
      <div className="app-main-container">
        {/* Top Header Bar */}
        <header className="app-topbar">
          <div className="topbar-search">
            <span className="search-symbol">⌘</span>
            <span className="topbar-context-text">Plant 01 • Textile Production Facility</span>
          </div>

          <div className="topbar-right-actions">
            <div className="telemetry-badge">
              <span className="pulse-circle" />
              <span>Latest Sensor Telemetry</span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="app-main-body">
          {loading ? (
            <div className="state-container">
              <div className="spinner"></div>
              <p className="state-text">Initializing RESONEX platform telemetry...</p>
            </div>
          ) : error ? (
            <div className="state-container error">
              <div className="error-icon">⚠️</div>
              <h3>Backend Communication Failure</h3>
              <p className="error-message">{error}</p>
              <button className="saas-btn-primary" onClick={fetchGlobalData}>
                Retry Connection
              </button>
            </div>
          ) : selectedMachineId ? (
            <MachineDetail machineId={selectedMachineId} onBack={handleBackToFleet} />
          ) : activeTab === 'dashboard' ? (
            <FleetDashboard
              overview={overview}
              machines={machines}
              recommendations={recommendations}
              onSelectMachine={handleSelectMachine}
              onNavigateTab={(tab) => setActiveTab(tab as AppTab)}
            />
          ) : activeTab === 'machines' ? (
            <MachinesView
              machines={machines}
              recsByMachine={recsByMachine}
              onSelectMachine={handleSelectMachine}
            />
          ) : activeTab === 'alerts' ? (
            <AlertsView
              recommendations={recommendations}
              machines={machines}
              onSelectMachine={handleSelectMachine}
            />
          ) : activeTab === 'maintenance' ? (
            <MaintenanceView
              recommendations={recommendations}
              machines={machines}
              onSelectMachine={handleSelectMachine}
            />
          ) : activeTab === 'reports' ? (
            <ReportsView
              overview={overview}
              recommendations={recommendations}
              machines={machines}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
