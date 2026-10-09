import numpy as np
import pandas as pd
from backend.ml.features.engineer import _compute_window_fft

def compute_degradation_metrics(machine_df: pd.DataFrame) -> dict:
    """
    Analyzes chronological degradation trends for a single machine's trajectory.
    Combines:
    - Time-domain short-term polynomial slope vs historical baseline RMS
    - Frequency-domain spectral energy growth ratio (recent FFT energy vs baseline FFT energy)
    - Dominant frequency shift detection
    """
    df_sorted = machine_df.sort_values("timestamp").copy()
    n_obs = len(df_sorted)
    
    # Calculate vibration magnitude
    vib_mag = np.sqrt(
        df_sorted["vibration_x"]**2 +
        df_sorted["vibration_y"]**2 +
        df_sorted["vibration_z"]**2
    )
    df_sorted["vibration_magnitude"] = vib_mag
    
    # Need at least 2 readings for a trend
    if n_obs < 2:
        return {
            "degradation_status": "STABLE",
            "degradation_rate": 0.0,
            "vibration_trend_slope": 0.0,
            "temperature_trend_slope": 0.0,
            "vibration_severity_ratio": 1.0,
            "fft_energy_ratio": 1.0,
            "dominant_frequency_hz": 0.0,
            "is_rapid_degradation": False,
        }

    # 1. Short-term slope (last 5 steps or available history)
    k_short = min(5, n_obs)
    recent_vib = df_sorted["vibration_magnitude"].iloc[-k_short:].values
    recent_temp = df_sorted["temperature"].iloc[-k_short:].values
    
    x_axis = np.arange(k_short)
    vib_slope = float(np.polyfit(x_axis, recent_vib, 1)[0])
    temp_slope = float(np.polyfit(x_axis, recent_temp, 1)[0])
    
    # 2. Baseline comparison: recent RMS vs historical baseline RMS (first 20 readings)
    k_baseline = min(20, n_obs)
    baseline_vib = df_sorted["vibration_magnitude"].iloc[:k_baseline].values
    baseline_rms = np.sqrt(np.mean(baseline_vib**2))
    current_rms = np.sqrt(np.mean(recent_vib**2))
    
    severity_ratio = float(current_rms / max(baseline_rms, 1e-4))

    # 3. Frequency domain (FFT) degradation metrics
    recent_dom_freq, recent_peak_mag, recent_energy = _compute_window_fft(recent_vib)
    base_dom_freq, base_peak_mag, base_energy = _compute_window_fft(baseline_vib)
    fft_energy_ratio = float(recent_energy / max(base_energy, 1e-4))
    
    # 4. Overall composite degradation rate (normalized slope + severity increase + spectral growth)
    norm_vib_slope = max(0.0, vib_slope / max(baseline_rms, 1e-4))
    norm_temp_slope = max(0.0, temp_slope / 10.0) # 10 deg scale
    norm_spectral_growth = max(0.0, (fft_energy_ratio - 1.0) * 0.1)
    
    degradation_rate = float(0.5 * norm_vib_slope + 0.3 * norm_temp_slope + 0.2 * norm_spectral_growth)
    
    # 5. Status determination
    if severity_ratio >= 1.5 or fft_energy_ratio >= 2.0 or degradation_rate > 0.08 or (vib_slope > 0.05 and temp_slope > 0.5):
        status = "RAPID_DEGRADATION"
        is_rapid = True
    elif severity_ratio >= 1.2 or fft_energy_ratio >= 1.4 or degradation_rate > 0.03 or vib_slope > 0.02:
        status = "MODERATE_DEGRADATION"
        is_rapid = False
    else:
        status = "STABLE"
        is_rapid = False
        
    return {
        "degradation_status": status,
        "degradation_rate": round(degradation_rate, 4),
        "vibration_trend_slope": round(vib_slope, 4),
        "temperature_trend_slope": round(temp_slope, 4),
        "vibration_severity_ratio": round(severity_ratio, 3),
        "fft_energy_ratio": round(fft_energy_ratio, 3),
        "dominant_frequency_hz": round(recent_dom_freq, 3),
        "is_rapid_degradation": is_rapid,
    }
