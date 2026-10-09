from typing import List, Tuple
import numpy as np
import pandas as pd

SENSOR_BASE_COLS = ["vibration_x", "vibration_y", "vibration_z", "temperature"]
META_COLS = ["machine_age_years", "operating_hours", "load_percent", "rotational_speed", "maintenance_count"]
MACHINE_TYPES = ["TypeA", "TypeB", "TypeC", "TypeD", "TypeE"]

def _compute_window_fft(vals: np.ndarray) -> Tuple[float, float, float]:
    """
    Computes spectral frequency features for a window:
    - Dominant frequency (Hz normalized)
    - Peak magnitude
    - Frequency energy
    """
    n = len(vals)
    if n < 2:
        return 0.0, float(vals[0]) if n == 1 else 0.0, float(vals[0]**2) if n == 1 else 0.0
    
    # Detrend by subtracting mean to isolate vibrational oscillation harmonics
    detrended = vals - np.mean(vals)
    fft_vals = np.fft.rfft(detrended)
    freqs = np.fft.rfftfreq(n, d=1.0)
    mags = np.abs(fft_vals)
    
    energy = float(np.sum(mags**2) / len(mags))
    dom_idx = int(np.argmax(mags))
    peak_mag = float(mags[dom_idx])
    dom_freq = float(freqs[dom_idx])
    
    return dom_freq, peak_mag, energy

def compute_rolling_features(df: pd.DataFrame, window_k: int = 5) -> pd.DataFrame:
    """
    Extracts comprehensive feature space specified by architecture:
    1. Statistical Features: RMS, Mean, Std deviation, Variance, Min, Max
    2. FFT / Frequency Features: Dominant frequency, Peak magnitude, Frequency energy
    3. Temporal Features: Trend, Rolling mean, Rate of change, Lag values
    """
    df_sorted = df.sort_values(by=["machine_id", "timestamp"]).copy()
    
    # 1. Vibration Magnitude
    df_sorted["vibration_magnitude"] = np.sqrt(
        df_sorted["vibration_x"]**2 +
        df_sorted["vibration_y"]**2 +
        df_sorted["vibration_z"]**2
    )

    signals_to_roll = SENSOR_BASE_COLS + ["vibration_magnitude"]
    grouped = df_sorted.groupby("machine_id")

    for col in signals_to_roll:
        # --- Statistical Features ---
        roll = grouped[col].rolling(window=window_k, min_periods=1)
        mean_series = roll.mean().reset_index(drop=True)
        std_series = roll.std().reset_index(drop=True).fillna(0.0)
        
        df_sorted[f"{col}_mean_{window_k}"] = mean_series
        df_sorted[f"{col}_std_{window_k}"] = std_series
        df_sorted[f"{col}_var_{window_k}"] = std_series**2
        df_sorted[f"{col}_min_{window_k}"] = roll.min().reset_index(drop=True)
        df_sorted[f"{col}_max_{window_k}"] = roll.max().reset_index(drop=True)
        
        roll_sq = (df_sorted[col]**2).groupby(df_sorted["machine_id"]).rolling(window=window_k, min_periods=1)
        df_sorted[f"{col}_rms_{window_k}"] = np.sqrt(roll_sq.mean().reset_index(drop=True))
        
        # --- Temporal Features ---
        shift_val = grouped[col].shift(window_k - 1)
        first_val = grouped[col].transform("first")
        earliest_in_win = shift_val.fillna(first_val)
        df_sorted[f"{col}_trend_{window_k}"] = df_sorted[col] - earliest_in_win
        
        # Rate of change (1-step diff) & 1-step Lag
        df_sorted[f"{col}_rate_of_change"] = grouped[col].diff().fillna(0.0).reset_index(drop=True)
        df_sorted[f"{col}_lag_1"] = grouped[col].shift(1).fillna(df_sorted[col]).reset_index(drop=True)

        # --- FFT / Frequency Features on Vibration & Energy ---
        # Compute sliding FFT features over the window_k
        def _apply_fft_col(s: pd.Series) -> pd.DataFrame:
            dom_freqs = []
            peak_mags = []
            energies = []
            vals = s.to_numpy()
            for i in range(len(vals)):
                start_idx = max(0, i - window_k + 1)
                window_slice = vals[start_idx : i + 1]
                dfreq, pmag, en = _compute_window_fft(window_slice)
                dom_freqs.append(dfreq)
                peak_mags.append(pmag)
                energies.append(en)
            return pd.DataFrame({
                f"{col}_dom_freq_{window_k}": dom_freqs,
                f"{col}_peak_mag_{window_k}": peak_mags,
                f"{col}_freq_energy_{window_k}": energies
            }, index=s.index)

        fft_features = grouped[col].apply(_apply_fft_col).reset_index(drop=True)
        df_sorted[f"{col}_dom_freq_{window_k}"] = fft_features[f"{col}_dom_freq_{window_k}"]
        df_sorted[f"{col}_peak_mag_{window_k}"] = fft_features[f"{col}_peak_mag_{window_k}"]
        df_sorted[f"{col}_freq_energy_{window_k}"] = fft_features[f"{col}_freq_energy_{window_k}"]

    for m_type in MACHINE_TYPES:
        df_sorted[f"machine_type_{m_type}"] = (df_sorted["machine_type"] == m_type).astype(float)

    return df_sorted

def get_feature_columns(window_k: int = 5) -> List[str]:
    signals_to_roll = SENSOR_BASE_COLS + ["vibration_magnitude"]
    features = []
    
    features.extend(SENSOR_BASE_COLS)
    features.append("vibration_magnitude")
    
    for col in signals_to_roll:
        features.extend([
            # Statistical
            f"{col}_mean_{window_k}",
            f"{col}_std_{window_k}",
            f"{col}_var_{window_k}",
            f"{col}_min_{window_k}",
            f"{col}_max_{window_k}",
            f"{col}_rms_{window_k}",
            # Temporal
            f"{col}_trend_{window_k}",
            f"{col}_rate_of_change",
            f"{col}_lag_1",
            # FFT / Frequency
            f"{col}_dom_freq_{window_k}",
            f"{col}_peak_mag_{window_k}",
            f"{col}_freq_energy_{window_k}",
        ])
        
    features.extend(META_COLS)
    
    for m_type in MACHINE_TYPES:
        features.append(f"machine_type_{m_type}")
        
    return features
