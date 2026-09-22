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
              <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-caps text-label-caps font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Cluster Synced
              </span>
            </div>
            <p className="stitch-page-desc max-w-4xl">
              Manage telemetry sensor baselines, alert sensitivity thresholds, MQTT/OPC-UA streaming endpoints, shift schedules, and team permissions across all 50 operational assets.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              className="stitch-btn-secondary"
              onClick={handleDiscard}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">undo</span>
              <span>Discard</span>
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
            <span>System configuration parameters committed and synchronized with cluster telemetry edge nodes.</span>
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
          <span>Telemetry & Sensors</span>
        </button>

        <button
          className={`settings-tab-btn ${subTab === 'thresholds' ? 'active' : ''}`}
          onClick={() => setSubTab('thresholds')}
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">warning_amber</span>
          <span>Alerts & Threshold Rules</span>
        </button>

        <button
          className={`settings-tab-btn ${subTab === 'integrations' ? 'active' : ''}`}
          onClick={() => setSubTab('integrations')}
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">hub</span>
          <span>Integrations (MQTT / OPC-UA)</span>
        </button>

        <button
          className={`settings-tab-btn ${subTab === 'shifts' ? 'active' : ''}`}
          onClick={() => setSubTab('shifts')}
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">calendar_view_week</span>
          <span>Shift Schedules & Handover</span>
        </button>

        <button
          className={`settings-tab-btn ${subTab === 'users' ? 'active' : ''}`}
          onClick={() => setSubTab('users')}
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">badge</span>
          <span>Users & Access Control</span>
        </button>
      </div>

      {/* 3. Settings Workspace Forms */}
      <div className="stitch-card p-space-lg">
        {subTab === 'sensors' && (
          <div className="settings-section-form">
            <div className="section-head mb-4">
              <h2 className="stitch-card-title">Telemetry Ingestion & Sensor Baselines</h2>
              <p className="stitch-card-desc">Configure streaming frequencies, buffer horizons, and hardware sensor telemetry.</p>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">Sampling Frequency (Hz):</label>
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
                  <span className="slider-val-badge font-numeric">{samplingRate} Hz</span>
                </div>
                <span className="form-help-text">Edge nodes buffer at 100Hz default for high-speed looms and spindle bearings.</span>
              </div>

              <div className="form-field">
                <label className="form-label">In-Memory Telemetry History Buffer (Minutes):</label>
                <input
                  type="number"
                  className="stitch-input font-numeric"
                  value={streamBufferMinutes}
                  onChange={(e) => setStreamBufferMinutes(Number(e.target.value))}
                />
                <span className="form-help-text">Controls real-time rolling window before permanent disk persistence.</span>
              </div>

              <div className="form-field">
                <label className="form-label">Vibration Axis Configuration:</label>
                <select className="stitch-select">
                  <option value="triaxial">Tri-Axial (X, Y, Z + Resultant RMS) [Standard]</option>
                  <option value="dual">Dual-Axis Radial (X, Y)</option>
                  <option value="uniaxial">Single Uniaxial Accelerometer</option>
                </select>
              </div>

              <div className="form-field">
                <label className="form-label">Acoustic Telemetry Stream:</label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="checkbox" id="acousticCheck" defaultChecked className="stitch-checkbox" />
                  <label htmlFor="acousticCheck" className="text-sm font-medium">Enable ultrasonic bearing friction detection</label>
                </div>
              </div>
            </div>
          </div>
        )}

        {subTab === 'thresholds' && (
          <div className="settings-section-form">
            <div className="section-head mb-4">
              <h2 className="stitch-card-title">Diagnostic Alarm Horizons & ISO 10816 Limits</h2>
              <p className="stitch-card-desc">Configure velocity thresholds and predictive failure warning horizons.</p>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">ISO 10816 Velocity Limit (mm/s RMS):</label>
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
                <span className="form-help-text">Machines breaching this limit automatically trigger a P1 Immediate Alert.</span>
              </div>

              <div className="form-field">
                <label className="form-label">Bearing Temperature Warning Ceiling (°C):</label>
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
                <span className="form-help-text">Thermal alarm threshold for motor core and spindle race.</span>
              </div>

              <div className="form-field">
                <label className="form-label">Predictive RUL Emergency Horizon (Hours):</label>
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
                <span className="form-help-text">Remaining Useful Life threshold for emergency dispatch banner.</span>
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
