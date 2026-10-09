import React, { useState } from 'react';
import { api } from '../services/api';
import { Machine, MachineCreateInput } from '../types';

interface MachineRegistrationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newMachine: Machine) => void;
}

const MACHINE_CATEGORIES = [
  { code: 'Ring Spinning Frame', label: 'Ring Spinning Frame (Spindle, Drafting)' },
  { code: 'Rotor Spinning Unit', label: 'Rotor Spinning Unit (High-Speed Rotor, Navel)' },
  { code: 'High-Speed Winder', label: 'High-Speed Cone/Cheese Winder' },
  { code: 'Carding Machine', label: 'High-Production Carding Machine' },
  { code: 'Draw Frame', label: 'Autoleveler Draw Frame' },
  { code: 'Comber Machine', label: 'High-Performance Comber' },
  { code: 'Air-Jet Loom', label: 'Air-Jet Weaving Loom' },
  { code: 'Circular Knitting Machine', label: 'Circular Knitting Machine' },
  { code: 'Stenter Frame', label: 'Fabric Finishing Stenter Frame' },
];

export const MachineRegistrationWizard: React.FC<MachineRegistrationWizardProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploadStatus, setCsvUploadStatus] = useState<string | null>(null);

  // Machine ID check state
  const [idChecking, setIdChecking] = useState(false);
  const [idAvailable, setIdAvailable] = useState<boolean | null>(null);
  const [idCheckMessage, setIdCheckMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<MachineCreateInput>({
    machine_id: '',
    machine_type: 'Ring Spinning Frame',
    machine_name: '',
    manufacturer: 'Rieter',
    model_number: '',
    serial_number: '',
    plant: 'Plant 1 - Central Spinning Mill',
    production_line: 'Line A (Spindle Bank 1)',
    location: 'Building B, Floor 2, Zone 4',
    description: '',
    installation_date: new Date().toISOString().split('T')[0],
    status: 'Awaiting Data',
    specifications: {
      rated_power_kw: 45.0,
      rated_speed_rpm: 18500,
      operating_frequency_hz: 50,
      voltage_v: 400,
      spindle_count: 1200,
      motor_count: 2,
      drive_type: 'Inverter-Driven AC Motor',
      bearing_type: 'SKF 6205-2RSH/C3 Deep Groove Ball',
      lubrication_type: 'Synthetic Polyurea Grease (ISO VG 100)',
      technical_notes: 'Equipped with pneumatic drafting load arm and digital yarn clearing sensors.',
    },
    operational_settings: {
      operating_hours_per_day: 24,
      operating_days_per_week: 7,
      shift_schedule: '3 Shifts (8h continuous turnover)',
      typical_load_percent: 85,
      environment_temp_c: 26.5,
      environment_humidity_rh: 58.0,
      responsible_team: 'Shift Mechanical Team A (Operator Jenkins)',
      operational_mode: 'Continuous Production',
    },
    sensor_config: {
      monitoring_enabled: true,
      data_source: 'Resonex Edge IoT Gateway (RS-485 / Modbus TCP)',
      ingestion_method: 'Automated 1-Second Telemetry Buffer',
      vibration_sensor: {
        sensor_id: 'VIB-CH1-MAIN',
        sensor_type: 'Triaxial Accelerometer (Piezoelectric)',
        location: 'Spindle Drive Motor Non-Drive End Bearing Housing',
        axes: 'X, Y, Z (3-Axis)',
        measurement_unit: 'mm/s RMS Velocity',
        sampling_frequency_hz: 5000,
        warning_threshold: 4.5,
        critical_threshold: 7.1,
      },
      temperature_sensor: {
        sensor_id: 'TEMP-CH1-BEARING',
        sensor_type: 'PT100 RTD 4-Wire Probe',
        location: 'Drive End Bearing Outer Raceway',
        measurement_unit: '°C',
        warning_threshold: 75.0,
        critical_threshold: 85.0,
      },
    },
    initial_maintenance_history: [
      {
        maintenance_date: new Date().toISOString().split('T')[0],
        maintenance_type: 'PREVENTIVE',
        component: 'Spindle Bearings & Drive Pulley',
        description: 'Pre-commissioning factory acceptance test (FAT) inspection and alignment verification.',
        action_taken: 'Laser shaft alignment, baseline vibration verification, and synthetic lubrication replenishment.',
        sop_code: 'SOP-COMMISSIONING-01',
        technician_notes: 'Vibration and thermal baseline within ISO 10816 Zone A nominal range.',
      },
    ],
  });

  if (!isOpen) return null;

  // Step 1: Check ID availability on blur
  const handleVerifyMachineId = async (id: string) => {
    const trimmed = id.trim().toUpperCase();
    if (!trimmed || trimmed.length < 2) {
      setIdAvailable(null);
      setIdCheckMessage('Machine ID must be at least 2 characters.');
      return;
    }
    setIdChecking(true);
    try {
      const res = await api.checkMachineId(trimmed);
      setIdAvailable(res.available);
      setIdCheckMessage(res.message);
    } catch {
      setIdAvailable(null);
      setIdCheckMessage(null);
    } finally {
      setIdChecking(false);
    }
  };

  // Validation per step
  const validateStep = (currentStep: number): boolean => {
    setErrorMsg(null);
    if (currentStep === 1) {
      if (!formData.machine_id.trim()) {
        setErrorMsg('Machine ID is required.');
        return false;
      }
      if (!formData.machine_type.trim()) {
        setErrorMsg('Machine category is required.');
        return false;
      }
      if (!formData.plant?.trim()) {
        setErrorMsg('Factory or plant is required.');
        return false;
      }
      if (idAvailable === false) {
        setErrorMsg(`Machine ID '${formData.machine_id}' is already taken. Please choose another.`);
        return false;
      }
    } else if (currentStep === 2) {
      const p = formData.specifications?.rated_power_kw;
      const s = formData.specifications?.rated_speed_rpm;
      if (p !== undefined && p <= 0) {
        setErrorMsg('Rated power must be a positive number.');
        return false;
      }
      if (s !== undefined && s <= 0) {
        setErrorMsg('Rated speed must be a positive number.');
        return false;
      }
    } else if (currentStep === 3) {
      const hrs = formData.operational_settings?.operating_hours_per_day;
      if (hrs !== undefined && (hrs < 1 || hrs > 24)) {
        setErrorMsg('Operating hours per day must be between 1 and 24.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(6, prev + 1));
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    setStep((prev) => Math.max(1, prev - 1));
  };

  // Final Registration Submission
  const handleSubmit = async () => {
    if (!validateStep(step)) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Submit Registration Payload to FastAPI Backend
      const registeredMachine = await api.createMachine(formData);

      // 2. If a sensor CSV was attached, import it immediately
      if (csvFile) {
        try {
          setCsvUploadStatus('Importing sensor CSV telemetry...');
          await api.importMachineSensorCsv(registeredMachine.machine_id, csvFile);
          registeredMachine.status = 'active';
          registeredMachine.monitoring_readiness = 'Monitoring Active';
        } catch (csvErr: any) {
          console.warn('CSV import warning:', csvErr);
        }
      }

      onSuccess(registeredMachine);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register machine. Please review your input.');
    } finally {
      setIsSubmitting(false);
      setCsvUploadStatus(null);
    }
  };

  return (
    <div className="stitch-modal-backdrop" onClick={onClose}>
      <div
        className="stitch-modal-dialog max-w-4xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="modal-header bg-[var(--bg-card)] border-b border-[var(--border-color)] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[var(--accent-blue)] text-[22px]">precision_manufacturing</span>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Register New Machine</h2>
              <p className="text-xs text-[var(--text-muted)]">Onboard equipment into Resonex Mission Control & Predictive Pipeline</p>
            </div>
          </div>
          <button
            type="button"
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded transition-colors"
            onClick={onClose}
            title="Cancel"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Wizard Step Progression Indicator Strip */}
        <div className="bg-[var(--bg-app)] border-b border-[var(--border-color)] px-6 py-2.5 flex items-center justify-between overflow-x-auto gap-2">
          {[
            { num: 1, label: 'Identity' },
            { num: 2, label: 'Specifications' },
            { num: 3, label: 'Operations' },
            { num: 4, label: 'Sensors' },
            { num: 5, label: 'Maintenance' },
            { num: 6, label: 'Review' },
          ].map((s) => {
            const isCompleted = step > s.num;
            const isCurrent = step === s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  if (s.num < step) setStep(s.num);
                }}
                className={`flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  isCurrent
                    ? 'text-[var(--accent-blue)]'
                    : isCompleted
                    ? 'text-[var(--text-primary)] hover:text-[var(--accent-blue)]'
                    : 'text-[var(--text-muted)] opacity-60'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                    isCurrent
                      ? 'bg-[var(--accent-blue)] text-white'
                      : isCompleted
                      ? 'bg-[#10B981] text-white'
                      : 'bg-[var(--border-color)] text-[var(--text-muted)]'
                  }`}
                >
                  {isCompleted ? '✓' : s.num}
                </span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Wizard Body Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-md bg-[rgba(239,68,68,0.12)] border border-[#EF4444] text-[#EF4444] flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Basic Information */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="border-b border-[var(--border-light)] pb-2">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">1. Machine Identity & Facility Assignment</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Configure unique machine identification, model, and physical factory placement.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Machine ID */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)] flex items-center justify-between">
                    <span>Machine ID / Asset Tag <strong className="text-[#EF4444]">*</strong></span>
                    {idChecking && <span className="text-[10px] text-[var(--text-muted)]">Checking...</span>}
                    {idAvailable === true && <span className="text-[10px] text-[#10B981] font-bold">✓ Unique ID</span>}
                    {idAvailable === false && <span className="text-[10px] text-[#EF4444] font-bold">✗ Already Exists</span>}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TXM-051 or RSF-102"
                    value={formData.machine_id}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setFormData({ ...formData, machine_id: val });
                      setIdAvailable(null);
                    }}
                    onBlur={(e) => handleVerifyMachineId(e.target.value)}
                    className="p-2 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] font-mono text-xs outline-none focus:border-[var(--accent-blue)] uppercase"
                  />
                  {idCheckMessage && (
                    <span className={`text-[10px] ${idAvailable ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                      {idCheckMessage}
                    </span>
                  )}
                </div>

                {/* Machine Name */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">Machine Display Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ring Spinning Frame #51"
                    value={formData.machine_name || ''}
                    onChange={(e) => setFormData({ ...formData, machine_name: e.target.value })}
                    className="p-2 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--accent-blue)]"
                  />
                </div>

                {/* Category */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">
                    Machine Category / Type <strong className="text-[#EF4444]">*</strong>
                  </label>
                  <select
                    value={formData.machine_type}
                    onChange={(e) => setFormData({ ...formData, machine_type: e.target.value })}
                    className="p-2 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--accent-blue)] cursor-pointer"
                  >
                    {MACHINE_CATEGORIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {/* Manufacturer */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">Manufacturer / OEM</label>
                  <input
                    type="text"
                    placeholder="e.g. Rieter, Saurer, Trützschler, Murata, Toyota"
                    value={formData.manufacturer || ''}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="p-2 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--accent-blue)]"
                  />
                </div>

                {/* Model Number */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">Model Number</label>
                  <input
                    type="text"
                    placeholder="e.g. G 38 Ring Spinning Machine"
                    value={formData.model_number || ''}
                    onChange={(e) => setFormData({ ...formData, model_number: e.target.value })}
                    className="p-2 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--accent-blue)]"
                  />
                </div>

                {/* Serial Number */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">Serial Number</label>
                  <input
                    type="text"
                    placeholder="e.g. SN-RIE-2024-8849"
                    value={formData.serial_number || ''}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    className="p-2 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] font-mono text-xs outline-none focus:border-[var(--accent-blue)]"
                  />
                </div>

                {/* Plant */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">Factory / Plant <strong className="text-[#EF4444]">*</strong></label>
                  <input
                    type="text"
                    value={formData.plant || ''}
                    onChange={(e) => setFormData({ ...formData, plant: e.target.value })}
                    className="p-2 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--accent-blue)]"
                  />
                </div>

                {/* Production Line */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">Production Line / Bank</label>
                  <input
                    type="text"
                    value={formData.production_line || ''}
                    onChange={(e) => setFormData({ ...formData, production_line: e.target.value })}
                    className="p-2 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--accent-blue)]"
                  />
                </div>
              </div>

              {/* Location & Description */}
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-[var(--text-primary)]">Installation Location / Bay</label>
                <input
                  type="text"
                  placeholder="e.g. Floor 2, Bay 4, East Spindle Corridor"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="p-2 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--accent-blue)]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-[var(--text-primary)]">Machine Description / Role</label>
                <textarea
                  rows={2}
                  placeholder="Detailed function, yarn counts processed, or specific process notes..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="p-2 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--accent-blue)]"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Technical Specifications */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="border-b border-[var(--border-light)] pb-2">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">2. Engineering & Technical Specifications</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Ratings, mechanical drives, bearings, and motor electrical parameters.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">Rated Power (kW)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.specifications?.rated_power_kw || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        specifications: { ...formData.specifications, rated_power_kw: parseFloat(e.target.value) || 0 },
                      })
                    }
                    className="p-2 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs outline-none font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">Rated Operating Speed (RPM)</label>
                  <input
                    type="number"
                    value={formData.specifications?.rated_speed_rpm || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        specifications: { ...formData.specifications, rated_speed_rpm: parseInt(e.target.value, 10) || 0 },
                      })
                    }
                    className="p-2 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs outline-none font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">Frequency (Hz)</label>
                  <input
                    type="number"
                    value={formData.specifications?.operating_frequency_hz || 50}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        specifications: { ...formData.specifications, operating_frequency_hz: parseInt(e.target.value, 10) || 50 },
                      })
                    }
                    className="p-2 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs outline-none font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">Rated Voltage (V)</label>
                  <input
                    type="number"
                    value={formData.specifications?.voltage_v || 400}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        specifications: { ...formData.specifications, voltage_v: parseInt(e.target.value, 10) || 400 },
                      })
                    }
                    className="p-2 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs outline-none font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">Number of Motors</label>
                  <input
                    type="number"
                    value={formData.specifications?.motor_count || 1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        specifications: { ...formData.specifications, motor_count: parseInt(e.target.value, 10) || 1 },
                      })
                    }
                    className="p-2 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs outline-none font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">Capacity / Positions</label>
                  <input
                    type="text"
                    placeholder="e.g. 1,200 Spindles / 24 Drums"
                    value={formData.specifications?.spindle_count || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        specifications: { ...formData.specifications, spindle_count: e.target.value },
                      })
                    }
                    className="p-2 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">Drive & Transmission Type</label>
                  <input
                    type="text"
                    placeholder="e.g. High-efficiency tangential belt with inverter AC drive"
                    value={formData.specifications?.drive_type || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        specifications: { ...formData.specifications, drive_type: e.target.value },
                      })
                    }
                    className="p-2 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">Installed Bearing Specifications</label>
                  <input
                    type="text"
                    placeholder="e.g. SKF 6205-2RSH/C3, NSK B15-69"
                    value={formData.specifications?.bearing_type || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        specifications: { ...formData.specifications, bearing_type: e.target.value },
                      })
                    }
                    className="p-2 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-[var(--text-primary)]">Lubrication Standard</label>
                <input
                  type="text"
                  placeholder="e.g. Synthetic Polyurea Grease, ISO VG 100"
                  value={formData.specifications?.lubrication_type || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      specifications: { ...formData.specifications, lubrication_type: e.target.value },
                    })
                  }
                  className="p-2 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Installation & Operations */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div className="border-b border-[var(--border-light)] pb-2">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">3. Operational Schedule & Environment</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Configure production schedule, shift rotation, load factor, and ambient conditions.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">Commissioning / Installation Date</label>
                  <input
                    type="date"
                    value={formData.installation_date ? String(formData.installation_date).split('T')[0] : ''}
                    onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
                    className="p-2 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">Initial Operating Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="p-2 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs outline-none cursor-pointer"
                  >
                    <option value="Awaiting Data">Awaiting Data (New Registration)</option>
                    <option value="active">Active (Production Active)</option>
                    <option value="Under Maintenance">Under Maintenance (Commissioning)</option>
                    <option value="inactive">Inactive / Standby</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">Typical Load Factor (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={formData.operational_settings?.typical_load_percent || 85}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        operational_settings: {
                          ...formData.operational_settings,
                          typical_load_percent: parseInt(e.target.value, 10) || 85,
                        },
                      })
                    }
                    className="p-2 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs outline-none font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">Operating Hours / Day</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={formData.operational_settings?.operating_hours_per_day || 24}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        operational_settings: {
                          ...formData.operational_settings,
                          operating_hours_per_day: parseInt(e.target.value, 10) || 24,
                        },
                      })
                    }
                    className="p-2 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs outline-none font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">Operating Days / Week</label>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={formData.operational_settings?.operating_days_per_week || 7}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        operational_settings: {
                          ...formData.operational_settings,
                          operating_days_per_week: parseInt(e.target.value, 10) || 7,
                        },
                      })
                    }
                    className="p-2 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs outline-none font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">Shift Schedule</label>
                  <input
                    type="text"
                    value={formData.operational_settings?.shift_schedule || '3 Shifts (Continuous)'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        operational_settings: {
                          ...formData.operational_settings,
                          shift_schedule: e.target.value,
                        },
                      })
                    }
                    className="p-2 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">Responsible Operator / Maintenance Team</label>
                  <input
                    type="text"
                    value={formData.operational_settings?.responsible_team || 'Shift Mechanical Team'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        operational_settings: {
                          ...formData.operational_settings,
                          responsible_team: e.target.value,
                        },
                      })
                    }
                    className="p-2 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[var(--text-primary)]">Ambient Conditions (Temp & Humidity)</label>
                  <input
                    type="text"
                    placeholder="e.g. 26.5°C, 58% Relative Humidity (Controlled HVAC)"
                    value={`${formData.operational_settings?.environment_temp_c || 26.5}°C, ${formData.operational_settings?.environment_humidity_rh || 58}% RH`}
                    readOnly
                    className="p-2 rounded bg-[var(--border-light)] border border-[var(--border-color)] text-[var(--text-muted)] text-xs outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Sensors & Monitoring Configuration */}
          {step === 4 && (
            <div className="flex flex-col gap-4">
              <div className="border-b border-[var(--border-light)] pb-2">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">4. Telemetry Channels & Sensor Configuration</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Configure IoT vibration accelerometer, RTD temperature sensor, and optional historical telemetry CSV upload.</p>
              </div>

              {/* Vibration Channel */}
              <div className="p-3 rounded-md bg-[var(--bg-app)] border border-[var(--border-color)] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--accent-blue)] text-[18px]">vibration</span>
                    <span className="font-bold text-[var(--text-primary)]">Channel 1: Vibration Monitoring Sensor</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[rgba(6,182,212,0.12)] text-[var(--accent-blue)] font-mono text-[10px] font-bold">
                    ISO 10816 Zone A/B
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-[var(--text-muted)]">Sensor Identifier</label>
                    <input
                      type="text"
                      value={formData.sensor_config?.vibration_sensor?.sensor_id || 'VIB-CH1-MAIN'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sensor_config: {
                            ...formData.sensor_config,
                            vibration_sensor: {
                              ...formData.sensor_config?.vibration_sensor,
                              sensor_id: e.target.value,
                            },
                          },
                        })
                      }
                      className="p-1.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] font-mono text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-[var(--text-muted)]">Mount Location</label>
                    <input
                      type="text"
                      value={formData.sensor_config?.vibration_sensor?.location || 'Drive Bearing Housing'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sensor_config: {
                            ...formData.sensor_config,
                            vibration_sensor: {
                              ...formData.sensor_config?.vibration_sensor,
                              location: e.target.value,
                            },
                          },
                        })
                      }
                      className="p-1.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-[var(--text-muted)]">Warning Limit (mm/s)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.sensor_config?.vibration_sensor?.warning_threshold || 4.5}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sensor_config: {
                            ...formData.sensor_config,
                            vibration_sensor: {
                              ...formData.sensor_config?.vibration_sensor,
                              warning_threshold: parseFloat(e.target.value) || 4.5,
                            },
                          },
                        })
                      }
                      className="p-1.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Temperature Channel */}
              <div className="p-3 rounded-md bg-[var(--bg-app)] border border-[var(--border-color)] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#F59E0B] text-[18px]">thermostat</span>
                    <span className="font-bold text-[var(--text-primary)]">Channel 2: Temperature Thermal Sensor</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[rgba(245,158,11,0.12)] text-[#F59E0B] font-mono text-[10px] font-bold">
                    Class B Industrial Limit
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-[var(--text-muted)]">Sensor Identifier</label>
                    <input
                      type="text"
                      value={formData.sensor_config?.temperature_sensor?.sensor_id || 'TEMP-CH1-BEARING'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sensor_config: {
                            ...formData.sensor_config,
                            temperature_sensor: {
                              ...formData.sensor_config?.temperature_sensor,
                              sensor_id: e.target.value,
                            },
                          },
                        })
                      }
                      className="p-1.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] font-mono text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-[var(--text-muted)]">Mount Location</label>
                    <input
                      type="text"
                      value={formData.sensor_config?.temperature_sensor?.location || 'Motor Outer Bearing Raceway'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sensor_config: {
                            ...formData.sensor_config,
                            temperature_sensor: {
                              ...formData.sensor_config?.temperature_sensor,
                              location: e.target.value,
                            },
                          },
                        })
                      }
                      className="p-1.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-[var(--text-muted)]">Warning Limit (°C)</label>
                    <input
                      type="number"
                      value={formData.sensor_config?.temperature_sensor?.warning_threshold || 75.0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sensor_config: {
                            ...formData.sensor_config,
                            temperature_sensor: {
                              ...formData.sensor_config?.temperature_sensor,
                              warning_threshold: parseFloat(e.target.value) || 75.0,
                            },
                          },
                        })
                      }
                      className="p-1.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Optional Telemetry CSV Upload */}
              <div className="p-3.5 rounded-md border border-dashed border-[var(--border-color)] bg-[var(--border-light)] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[var(--accent-blue)]">upload_file</span>
                    Optional: Upload Sensor Telemetry Dataset (CSV)
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">Optional · Max 10MB</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  If you have historical readings for this machine, upload them now. The backend will validate the readings and initialize real Health Index, FFT anomalies, and RUL degradation curves.
                </p>

                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="file"
                    accept=".csv"
                    id="machine-csv-upload"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setCsvFile(e.target.files[0]);
                      }
                    }}
                  />
                  <label
                    htmlFor="machine-csv-upload"
                    className="stitch-btn-secondary px-3 py-1.5 text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">folder_open</span>
                    <span>{csvFile ? 'Change CSV File' : 'Select CSV File'}</span>
                  </label>
                  {csvFile && (
                    <div className="flex items-center gap-2 font-mono text-xs text-[var(--text-primary)]">
                      <span className="font-semibold text-[var(--accent-blue)]">{csvFile.name}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">({(csvFile.size / 1024).toFixed(1)} KB)</span>
                      <button
                        type="button"
                        onClick={() => setCsvFile(null)}
                        className="text-[#EF4444] hover:underline text-[11px]"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Maintenance History */}
          {step === 5 && (
            <div className="flex flex-col gap-4">
              <div className="border-b border-[var(--border-light)] pb-2 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">5. Historical Maintenance Logs</h3>
                  <p className="text-[11px] text-[var(--text-muted)]">Add historical services, bearing replacements, or commissioning logs.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const current = formData.initial_maintenance_history || [];
                    setFormData({
                      ...formData,
                      initial_maintenance_history: [
                        ...current,
                        {
                          maintenance_date: new Date().toISOString().split('T')[0],
                          maintenance_type: 'PREVENTIVE',
                          component: 'Drive Motor & Belts',
                          description: 'Routine maintenance check.',
                          action_taken: 'Inspected and cleaned.',
                          sop_code: 'SOP-GEN-01',
                          technician_notes: 'Nominal condition.',
                        },
                      ],
                    });
                  }}
                  className="stitch-btn-secondary px-2.5 py-1 text-xs"
                >
                  + Add Log Entry
                </button>
              </div>

              {(!formData.initial_maintenance_history || formData.initial_maintenance_history.length === 0) ? (
                <div className="p-6 text-center text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-md">
                  <span>No previous maintenance history recorded. Machine will start with a fresh service log.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {formData.initial_maintenance_history.map((record, index) => (
                    <div key={index} className="p-3 rounded-md bg-[var(--bg-app)] border border-[var(--border-color)] flex flex-col gap-2 relative">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[var(--text-primary)]">Log Entry #{index + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (formData.initial_maintenance_history || []).filter((_, i) => i !== index);
                            setFormData({ ...formData, initial_maintenance_history: updated });
                          }}
                          className="text-[#EF4444] hover:underline text-[11px]"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-[var(--text-muted)]">Date</label>
                          <input
                            type="date"
                            value={record.maintenance_date}
                            onChange={(e) => {
                              const updated = [...(formData.initial_maintenance_history || [])];
                              updated[index].maintenance_date = e.target.value;
                              setFormData({ ...formData, initial_maintenance_history: updated });
                            }}
                            className="w-full p-1.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--text-muted)]">Type</label>
                          <select
                            value={record.maintenance_type}
                            onChange={(e) => {
                              const updated = [...(formData.initial_maintenance_history || [])];
                              updated[index].maintenance_type = e.target.value;
                              setFormData({ ...formData, initial_maintenance_history: updated });
                            }}
                            className="w-full p-1.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                          >
                            <option value="PREVENTIVE">PREVENTIVE</option>
                            <option value="CORRECTIVE">CORRECTIVE</option>
                            <option value="EMERGENCY">EMERGENCY</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--text-muted)]">Component</label>
                          <input
                            type="text"
                            value={record.component}
                            onChange={(e) => {
                              const updated = [...(formData.initial_maintenance_history || [])];
                              updated[index].component = e.target.value;
                              setFormData({ ...formData, initial_maintenance_history: updated });
                            }}
                            className="w-full p-1.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-[var(--text-muted)]">Action Taken</label>
                          <input
                            type="text"
                            value={record.action_taken}
                            onChange={(e) => {
                              const updated = [...(formData.initial_maintenance_history || [])];
                              updated[index].action_taken = e.target.value;
                              setFormData({ ...formData, initial_maintenance_history: updated });
                            }}
                            className="w-full p-1.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--text-muted)]">Standard Operating Procedure Code</label>
                          <input
                            type="text"
                            value={record.sop_code || ''}
                            onChange={(e) => {
                              const updated = [...(formData.initial_maintenance_history || [])];
                              updated[index].sop_code = e.target.value;
                              setFormData({ ...formData, initial_maintenance_history: updated });
                            }}
                            className="w-full p-1.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 6: Review & Register */}
          {step === 6 && (
            <div className="flex flex-col gap-4">
              <div className="border-b border-[var(--border-light)] pb-2 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">6. Verification & Final Registration</h3>
                  <p className="text-[11px] text-[var(--text-muted)]">Confirm machine configuration before committing record to Resonex database.</p>
                </div>
                <span className="px-2.5 py-1 rounded bg-[rgba(16,185,129,0.12)] text-[#10B981] font-mono text-xs font-bold border border-[rgba(16,185,129,0.3)]">
                  Ready to Commit
                </span>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-md bg-[var(--bg-app)] border border-[var(--border-color)] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--text-primary)]">Identity & Placement</span>
                    <button type="button" onClick={() => setStep(1)} className="text-[var(--accent-blue)] hover:underline text-[11px]">Edit</button>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <span className="text-[var(--text-muted)]">Machine ID:</span>
                    <strong className="font-mono text-[var(--text-primary)]">{formData.machine_id}</strong>
                    <span className="text-[var(--text-muted)]">Category:</span>
                    <span className="text-[var(--text-primary)]">{formData.machine_type}</span>
                    <span className="text-[var(--text-muted)]">Plant / Line:</span>
                    <span className="text-[var(--text-primary)]">{formData.plant} · {formData.production_line}</span>
                    <span className="text-[var(--text-muted)]">OEM / Serial:</span>
                    <span className="text-[var(--text-primary)]">{formData.manufacturer} ({formData.serial_number || 'N/A'})</span>
                  </div>
                </div>

                <div className="p-3 rounded-md bg-[var(--bg-app)] border border-[var(--border-color)] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--text-primary)]">Technical Specifications</span>
                    <button type="button" onClick={() => setStep(2)} className="text-[var(--accent-blue)] hover:underline text-[11px]">Edit</button>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <span className="text-[var(--text-muted)]">Power / Speed:</span>
                    <span className="text-[var(--text-primary)] font-mono">{formData.specifications?.rated_power_kw} kW · {formData.specifications?.rated_speed_rpm} RPM</span>
                    <span className="text-[var(--text-muted)]">Bearing Spec:</span>
                    <span className="text-[var(--text-primary)]">{formData.specifications?.bearing_type}</span>
                    <span className="text-[var(--text-muted)]">Drive System:</span>
                    <span className="text-[var(--text-primary)]">{formData.specifications?.drive_type}</span>
                    <span className="text-[var(--text-muted)]">Lubrication:</span>
                    <span className="text-[var(--text-primary)]">{formData.specifications?.lubrication_type}</span>
                  </div>
                </div>

                <div className="p-3 rounded-md bg-[var(--bg-app)] border border-[var(--border-color)] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--text-primary)]">Operations & Monitoring Readiness</span>
                    <button type="button" onClick={() => setStep(3)} className="text-[var(--accent-blue)] hover:underline text-[11px]">Edit</button>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <span className="text-[var(--text-muted)]">Shift Schedule:</span>
                    <span className="text-[var(--text-primary)]">{formData.operational_settings?.shift_schedule}</span>
                    <span className="text-[var(--text-muted)]">Duty Cycle:</span>
                    <span className="text-[var(--text-primary)]">{formData.operational_settings?.operating_hours_per_day}h/day ({formData.operational_settings?.typical_load_percent}% load)</span>
                    <span className="text-[var(--text-muted)]">Monitoring Status:</span>
                    <span className="text-[var(--accent-blue)] font-bold">
                      {csvFile ? 'Monitoring Active (Dataset Attached)' : 'Awaiting Data (New Unit)'}
                    </span>
                    <span className="text-[var(--text-muted)]">Telemetry Source:</span>
                    <span className="text-[var(--text-primary)]">{formData.sensor_config?.data_source}</span>
                  </div>
                </div>

                <div className="p-3 rounded-md bg-[var(--bg-app)] border border-[var(--border-color)] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--text-primary)]">Attached Telemetry & History</span>
                    <button type="button" onClick={() => setStep(5)} className="text-[var(--accent-blue)] hover:underline text-[11px]">Edit</button>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <span className="text-[var(--text-muted)]">Maintenance Logs:</span>
                    <span className="text-[var(--text-primary)] font-bold">{formData.initial_maintenance_history?.length || 0} initial entries</span>
                    <span className="text-[var(--text-muted)]">Attached CSV File:</span>
                    <span className="text-[var(--accent-blue)] font-mono font-semibold">
                      {csvFile ? `${csvFile.name} (${(csvFile.size / 1024).toFixed(1)} KB)` : 'None (Manual/Live Stream)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Actions */}
        <div className="modal-actions bg-[var(--bg-card)] border-t border-[var(--border-color)] px-6 py-3.5 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-semibold px-3 py-1.5 rounded transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="stitch-btn-secondary px-4 py-1.5 text-xs flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                <span>Back</span>
              </button>
            )}

            {step < 6 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className="stitch-btn-primary px-4 py-1.5 text-xs flex items-center gap-1"
              >
                <span>Continue</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="stitch-btn-primary px-5 py-2 text-xs flex items-center gap-1.5 bg-[#10B981] hover:bg-[#059669] text-white font-bold"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{csvUploadStatus || 'Registering Machine...'}</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>Register Machine</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
