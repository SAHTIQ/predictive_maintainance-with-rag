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
};
