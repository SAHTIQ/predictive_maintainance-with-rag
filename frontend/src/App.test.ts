import { describe, it, expect } from 'vitest';
import { api } from './services/api';

describe('Resonex API Service Definition', () => {
  it('defines all required endpoints', () => {
    expect(typeof api.getFleetOverview).toBe('function');
    expect(typeof api.getMachines).toBe('function');
    expect(typeof api.getFleetRecommendations).toBe('function');
    expect(typeof api.getMachine).toBe('function');
    expect(typeof api.getLatestMachineStatus).toBe('function');
    expect(typeof api.getSensorHistory).toBe('function');
    expect(typeof api.getHealthHistory).toBe('function');
    expect(typeof api.getRiskHistory).toBe('function');
    expect(typeof api.getMaintenanceHistory).toBe('function');
    expect(typeof api.getRagContext).toBe('function');
    expect(typeof api.sendRagChat).toBe('function');
  });
});
