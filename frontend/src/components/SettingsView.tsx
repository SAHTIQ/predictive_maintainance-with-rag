import React, { useState } from 'react';

export const SettingsView: React.FC = () => {
  const [subTab, setSubTab] = useState<'sensors' | 'thresholds' | 'integrations' | 'shifts' | 'users'>('sensors');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Settings form state
  const [samplingRate, setSamplingRate] = useState<number>(100);
  const [vibIsoThreshold, setVibIsoThreshold] = useState<number>(4.5);
  const [tempWarningThreshold, setTempWarningThreshold] = useState<number>(75.0);
  const [rulAlarmHorizon, setRulAlarmHorizon] = useState<number>(24);
  const [mqttBroker, setMqttBroker] = useState<string>('mqtt://telemetry.plant01.resonex.internal:1883');
  const [opcEndpoint, setOpcEndpoint] = useState<string>('opc.tcp://edge-gateway.plant01:4840');
  const [autoHandoverReports, setAutoHandoverReports] = useState<boolean>(true);
  const [streamBufferMinutes, setStreamBufferMinutes] = useState<number>(60);

  const handleSave = () => {
    localStorage.setItem('resonex_settings', JSON.stringify({
      samplingRate,
      vibIsoThreshold,
      tempWarningThreshold,
      rulAlarmHorizon,
      mqttBroker,
      opcEndpoint,
      autoHandoverReports,
      streamBufferMinutes,
    }));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDiscard = () => {
    setSamplingRate(100);
    setVibIsoThreshold(4.5);
    setTempWarningThreshold(75.0);
    setRulAlarmHorizon(24);
    setMqttBroker('mqtt://telemetry.plant01.resonex.internal:1883');
    setOpcEndpoint('opc.tcp://edge-gateway.plant01:4840');
    setAutoHandoverReports(true);
    setStreamBufferMinutes(60);
  };

  return (
    <div className="view-page-container">
      {/* 1. Top Command Header & Actions matching Stitch */}
      <div className="stitch-card p-space-lg mb-space-base">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-base">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="stitch-page-title">Settings & System Configuration</h1>
              <span className="px-2 py-0.5 rounded bg-[#162338] text-[#94A3B8] border border-[#243247] font-label-caps text-label-caps font-semibold tracking-wider uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                Connected & Synced
              </span>
            </div>
            <p className="stitch-page-desc max-w-4xl">
              Configure sensor check rates, safety warning limits, factory network connections, shift schedules, and team logins across all monitored machines.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              className="stitch-btn-secondary"
              onClick={handleDiscard}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">undo</span>
              <span>Reset</span>
            </button>

            <button
              className="stitch-btn-primary"
              onClick={handleSave}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="save-confirmation-banner mt-3">
            <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
            <span>Settings saved successfully and applied to all factory sensors.</span>
          </div>
        )}
      </div>

      {/* 2. Sub-Navigation Tabs Bar matching Stitch */}
      <div className="settings-subnav-bar mb-space-base">
        <button
          className={`settings-tab-btn ${subTab === 'sensors' ? 'active' : ''}`}
          onClick={() => setSubTab('sensors')}
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">sensors</span>
          <span>Sensors & Readings</span>
        </button>

        <button
          className={`settings-tab-btn ${subTab === 'thresholds' ? 'active' : ''}`}
          onClick={() => setSubTab('thresholds')}
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">warning_amber</span>
          <span>Danger Limits & Alerts</span>
        </button>

        <button
          className={`settings-tab-btn ${subTab === 'integrations' ? 'active' : ''}`}
          onClick={() => setSubTab('integrations')}
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">hub</span>
          <span>Data Connections</span>
        </button>

        <button
          className={`settings-tab-btn ${subTab === 'shifts' ? 'active' : ''}`}
          onClick={() => setSubTab('shifts')}
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">calendar_view_week</span>
          <span>Shift Hours & Reports</span>
        </button>

        <button
          className={`settings-tab-btn ${subTab === 'users' ? 'active' : ''}`}
          onClick={() => setSubTab('users')}
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">badge</span>
          <span>Users & Logins</span>
        </button>
      </div>

      {/* 3. Settings Workspace Forms */}
      <div className="stitch-card p-space-lg">
        {subTab === 'sensors' && (
          <div className="settings-section-form">
            <div className="section-head mb-4">
              <h2 className="stitch-card-title">Sensor Reading Speed & Storage</h2>
              <p className="stitch-card-desc">Set how frequently sensors send data and how long live history is kept.</p>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">Sensor Check Rate (Times per second):</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={10}
                    max={500}
                    step={10}
                    className="stitch-slider flex-1"
                    value={samplingRate}
                    onChange={(e) => setSamplingRate(Number(e.target.value))}
                  />
                  <span className="slider-val-badge font-numeric">{samplingRate} /sec</span>
                </div>
                <span className="form-help-text">Factory default is 100 times per second for high-speed textile machines.</span>
              </div>

              <div className="form-field">
                <label className="form-label">Keep Live History For (Minutes):</label>
                <input
                  type="number"
                  className="stitch-input font-numeric"
                  value={streamBufferMinutes}
                  onChange={(e) => setStreamBufferMinutes(Number(e.target.value))}
                />
                <span className="form-help-text">Controls how many minutes of live sensor history are saved in fast memory.</span>
              </div>

              <div className="form-field">
                <label className="form-label">Shaking Sensor Directions:</label>
                <select className="stitch-select">
                  <option value="triaxial">3-Direction Shaking (Side, Front, Vertical) [Standard]</option>
                  <option value="dual">2-Direction Shaking (Side, Front)</option>
                  <option value="uniaxial">Single Direction Shaking</option>
                </select>
              </div>

              <div className="form-field">
                <label className="form-label">Machine Sound Monitoring:</label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="checkbox" id="acousticCheck" defaultChecked className="stitch-checkbox" />
                  <label htmlFor="acousticCheck" className="text-sm font-medium">Enable high-pitch bearing friction sound detection</label>
                </div>
              </div>
            </div>
          </div>
        )}

        {subTab === 'thresholds' && (
          <div className="settings-section-form">
            <div className="section-head mb-4">
              <h2 className="stitch-card-title">Safety Warning & Danger Limits</h2>
              <p className="stitch-card-desc">Set danger levels for vibration, temperature, and hours left before repair.</p>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">Maximum Safe Shaking (Vibration) Limit (mm/s):</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="0.1"
                    className="stitch-input font-numeric"
                    value={vibIsoThreshold}
                    onChange={(e) => setVibIsoThreshold(Number(e.target.value))}
                  />
                  <span className="text-secondary font-numeric">mm/s</span>
                </div>
                <span className="form-help-text">Machines exceeding this shaking level immediately trigger an Urgent P1 Alert.</span>
              </div>

              <div className="form-field">
                <label className="form-label">Maximum Safe Temperature (°C):</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="1"
                    className="stitch-input font-numeric"
                    value={tempWarningThreshold}
                    onChange={(e) => setTempWarningThreshold(Number(e.target.value))}
                  />
                  <span className="text-secondary font-numeric">°C</span>
                </div>
                <span className="form-help-text">Heat alert limit for motor core and spindle bearings.</span>
              </div>

              <div className="form-field">
                <label className="form-label">Emergency Alert Threshold (Hours Left Before Failure):</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="1"
                    className="stitch-input font-numeric"
                    value={rulAlarmHorizon}
                    onChange={(e) => setRulAlarmHorizon(Number(e.target.value))}
                  />
                  <span className="text-secondary font-numeric">Hours</span>
                </div>
                <span className="form-help-text">Estimated hours left threshold that triggers emergency repair warnings.</span>
              </div>
            </div>
          </div>
        )}

        {subTab === 'integrations' && (
          <div className="settings-section-form">
            <div className="section-head mb-4">
              <h2 className="stitch-card-title">Edge Protocols & Streaming Endpoints</h2>
              <p className="stitch-card-desc">Connect MQTT message brokers and OPC-UA factory automation servers.</p>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">MQTT Telemetry Broker URI:</label>
                <input
                  type="text"
                  className="stitch-input font-mono"
                  value={mqttBroker}
                  onChange={(e) => setMqttBroker(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label">OPC-UA Industrial Endpoint:</label>
                <input
                  type="text"
                  className="stitch-input font-mono"
                  value={opcEndpoint}
                  onChange={(e) => setOpcEndpoint(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label">Database Synchronization State:</label>
                <div className="flex items-center gap-2 mt-2">
                  <span className="status-dot-pulse" />
                  <span className="font-semibold text-emerald-600">PostgreSQL Live Sync Active (pgvector enabled)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {subTab === 'shifts' && (
          <div className="settings-section-form">
            <div className="section-head mb-4">
              <h2 className="stitch-card-title">Shift Operations & Automated Handover Reports</h2>
              <p className="stitch-card-desc">Configure plant shift intervals and automated PDF dispatch package generation.</p>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">Shift Schedule (3x 8-hour blocks):</label>
                <div className="shift-block-display">
                  <div className="shift-chip">Shift A: 06:00 – 14:00 UTC (Current)</div>
                  <div className="shift-chip">Shift B: 14:00 – 22:00 UTC</div>
                  <div className="shift-chip">Shift C: 22:00 – 06:00 UTC</div>
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Shift Handover Automation:</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="checkbox"
                    id="autoHandoverCheck"
                    checked={autoHandoverReports}
                    onChange={(e) => setAutoHandoverReports(e.target.checked)}
                    className="stitch-checkbox"
                  />
                  <label htmlFor="autoHandoverCheck" className="text-sm font-medium">
                    Automatically compile incident summaries 30 minutes before shift conclusion
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {subTab === 'users' && (
          <div className="settings-section-form">
            <div className="section-head mb-4">
              <h2 className="stitch-card-title">Operator Access & Shift Permissions</h2>
              <p className="stitch-card-desc">Manage plant technician access, roles, and dispatch authority.</p>
            </div>

            <div className="stitch-table-wrapper">
              <table className="stitch-table">
                <thead>
                  <tr>
                    <th className="th-left">User</th>
                    <th className="th-left">Role</th>
                    <th className="th-left">Assigned Lines</th>
                    <th className="th-center">Dispatch Authority</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="stitch-row">
                    <td className="td-left font-bold">Mark Jenkins (Active Session)</td>
                    <td className="td-left text-primary font-semibold">Lead Monitorer / Shift Supervisor</td>
                    <td className="td-left">Plant 01 · Lines 1–4</td>
                    <td className="td-center">
                      <span className="status-chip good">Full Dispatch</span>
                    </td>
                  </tr>
                  <tr className="stitch-row">
                    <td className="td-left font-bold">Sarah Lin</td>
                    <td className="td-left text-secondary">Vibration Specialist Tech</td>
                    <td className="td-left">Lines 1 & 2</td>
                    <td className="td-center">
                      <span className="status-chip warning">Read & Triage</span>
                    </td>
                  </tr>
                  <tr className="stitch-row">
                    <td className="td-left font-bold">David Chen</td>
                    <td className="td-left text-secondary">Mechanical Field Engineer</td>
                    <td className="td-left">Lines 3 & 4</td>
                    <td className="td-center">
                      <span className="status-chip good">Work Order Execution</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
