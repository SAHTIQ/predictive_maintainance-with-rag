import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { FleetDashboard } from './components/FleetDashboard';
import { MachineDetail } from './components/MachineDetail';

function App() {
  const [activeTab, setActiveTab] = useState<'fleet' | 'machine'>('fleet');
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);

  const handleSelectMachine = (machineId: string) => {
    setSelectedMachineId(machineId);
    setActiveTab('machine');
  };

  const handleBackToFleet = () => {
    setActiveTab('fleet');
  };

  return (
    <div className="app-container">
      {/* Industrial Dark Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">⚙️</div>
          <div className="brand-text">
            <span className="brand-title">VIBRA-PREDICT</span>
            <span className="brand-subtitle">Textile Predictive Maintenance</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'fleet' ? 'active' : ''}`}
            onClick={() => setActiveTab('fleet')}
          >
            <span className="nav-icon">📊</span>
            <span>Fleet Dashboard</span>
          </button>
          {selectedMachineId && (
            <button
              className={`nav-item ${activeTab === 'machine' ? 'active' : ''}`}
              onClick={() => setActiveTab('machine')}
            >
              <span className="nav-icon">🔍</span>
              <span>Machine: {selectedMachineId}</span>
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="status-indicator-row">
            <span className="live-dot" />
            <span className="status-text">Backend API Connected</span>
          </div>
          <div className="version-tag">Stage 11 Integrated</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        <header className="top-header">
          <div className="header-title-group">
            <h1>Predictive Maintenance Monitoring System</h1>
            <p className="header-subtitle">
              MSME Textile Machinery Vibration & Thermal Intelligence Platform
            </p>
          </div>
          <div className="header-meta">
            <span className="architecture-tag">PostgreSQL + FastAPI + RAG</span>
          </div>
        </header>

        <main className="content-area">
          {activeTab === 'fleet' ? (
            <FleetDashboard onSelectMachine={handleSelectMachine} />
          ) : selectedMachineId ? (
            <MachineDetail machineId={selectedMachineId} onBack={handleBackToFleet} />
          ) : (
            <FleetDashboard onSelectMachine={handleSelectMachine} />
          )}
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

