import {
  FleetOverview,
  Machine,
  SensorReading,
  HealthRecord,
  RiskRecord,
  MaintenanceRecord,
  RecommendationDecision,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        errorDetail = errorJson.detail;
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Fleet
  getFleetOverview: (): Promise<FleetOverview> => {
    return fetchJson<FleetOverview>('/api/v1/fleet/overview');
  },

  getMachines: (): Promise<Machine[]> => {
    return fetchJson<Machine[]>('/api/v1/machines');
  },

  getFleetRecommendations: (): Promise<RecommendationDecision[]> => {
    return fetchJson<RecommendationDecision[]>('/api/v1/fleet-recommendations');
  },

  // Machine
  getMachine: (machineId: string): Promise<Machine> => {
    return fetchJson<Machine>(`/api/v1/machines/${encodeURIComponent(machineId)}`);
  },

  checkMachineId: (machineId: string): Promise<import('../types').MachineIdCheckResponse> => {
    return fetchJson<import('../types').MachineIdCheckResponse>(`/api/v1/machines/check-id/${encodeURIComponent(machineId)}`);
  },

  createMachine: (payload: import('../types').MachineCreateInput): Promise<Machine> => {
    return fetchJson<Machine>('/api/v1/machines', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  importMachineSensorCsv: (machineId: string, file: File): Promise<import('../types').MachineImportCsvResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const url = `${API_BASE_URL}/api/v1/machines/${encodeURIComponent(machineId)}/import-readings-csv`;
    return fetch(url, {
      method: 'POST',
      body: formData,
    }).then(async (response) => {
      if (!response.ok) {
        let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorJson = await response.json();
          if (errorJson.detail) errorDetail = errorJson.detail;
        } catch {}
        throw new Error(errorDetail);
      }
      return response.json();
    });
  },

  getLatestMachineStatus: (machineId: string): Promise<RecommendationDecision> => {
    return fetchJson<RecommendationDecision>(`/api/v1/machines/${encodeURIComponent(machineId)}/latest`);
  },

  getSensorHistory: (machineId: string, limit: number = 200): Promise<SensorReading[]> => {
    return fetchJson<SensorReading[]>(`/api/v1/machines/${encodeURIComponent(machineId)}/sensor-history?limit=${limit}`);
  },

  getHealthHistory: (machineId: string, limit: number = 100): Promise<HealthRecord[]> => {
    return fetchJson<HealthRecord[]>(`/api/v1/machines/${encodeURIComponent(machineId)}/health-history?limit=${limit}`);
  },

  getRiskHistory: (machineId: string, limit: number = 100): Promise<RiskRecord[]> => {
    return fetchJson<RiskRecord[]>(`/api/v1/machines/${encodeURIComponent(machineId)}/risk-history?limit=${limit}`);
  },

  getMaintenanceHistory: (machineId: string): Promise<MaintenanceRecord[]> => {
    return fetchJson<MaintenanceRecord[]>(`/api/v1/machines/${encodeURIComponent(machineId)}/maintenance-history`);
  },

  getRagContext: (machineId: string): Promise<any> => {
    return fetchJson<any>(`/api/v1/machines/${encodeURIComponent(machineId)}/rag-context`);
  },

  sendRagChat: (query: string, machineId?: string | null): Promise<import('../types').RagChatResponse> => {
    return fetchJson<import('../types').RagChatResponse>('/api/v1/rag/chat', {
      method: 'POST',
      body: JSON.stringify({ query, machine_id: machineId, top_k: 4 }),
    });
  },

  // User Profile & Account Management
  getUserProfile: (): Promise<import('../types').UserProfile> => {
    return fetchJson<import('../types').UserProfile>('/api/v1/users/me');
  },

  updateUserProfile: (payload: import('../types').UserProfileUpdateInput): Promise<import('../types').UserProfile> => {
    return fetchJson<import('../types').UserProfile>('/api/v1/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  getUserPreferences: (): Promise<import('../types').UserPreferences> => {
    return fetchJson<import('../types').UserPreferences>('/api/v1/users/me/preferences');
  },

  updateUserPreferences: (prefs: import('../types').UserPreferencesUpdateInput): Promise<import('../types').UserPreferences> => {
    return fetchJson<import('../types').UserPreferences>('/api/v1/users/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    });
  },

  changePassword: (payload: import('../types').ChangePasswordInput): Promise<{ success: boolean; message: string }> => {
    return fetchJson<{ success: boolean; message: string }>('/api/v1/users/me/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  signOut: (): Promise<{ success: boolean; message: string }> => {
    return fetchJson<{ success: boolean; message: string }>('/api/v1/users/me/sign-out', {
      method: 'POST',
    });
  },
};
