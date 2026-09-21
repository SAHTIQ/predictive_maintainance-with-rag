import numpy as np
import pandas as pd

def compute_degradation_metrics(machine_df: pd.DataFrame) -> dict:
    """
    Analyzes chronological degradation trends for a single machine's trajectory.
    Uses short-term (k=5) vs baseline (k=20) rolling windows without FFT.
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
    baseline_rms = np.sqrt(np.mean(df_sorted["vibration_magnitude"].iloc[:k_baseline].values**2))
    current_rms = np.sqrt(np.mean(recent_vib**2))
    
    severity_ratio = float(current_rms / max(baseline_rms, 1e-4))
    
    # 3. Overall composite degradation rate (normalized slope + severity increase)
    norm_vib_slope = max(0.0, vib_slope / max(baseline_rms, 1e-4))
    norm_temp_slope = max(0.0, temp_slope / 10.0) # 10 deg scale
    
    degradation_rate = float(0.6 * norm_vib_slope + 0.4 * norm_temp_slope)
    
    # 4. Status determination
    if severity_ratio >= 1.5 or degradation_rate > 0.08 or (vib_slope > 0.05 and temp_slope > 0.5):
        status = "RAPID_DEGRADATION"
        is_rapid = True
    elif severity_ratio >= 1.2 or degradation_rate > 0.03 or vib_slope > 0.02:
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
        "is_rapid_degradation": is_rapid,
    }
