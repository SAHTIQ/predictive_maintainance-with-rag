import { describe, it, expect } from 'vitest';
import { api } from './services/api';
import { MOCK_MACHINES, MOCK_RECOMMENDATIONS, MOCK_FLEET_OVERVIEW, generateMockSensorHistory } from './services/mockData';
import { routesConfig } from './app/routesConfig';

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

describe('Resonex Fallback & Telemetry Simulation', () => {
  it('provides 50 registered machines with TXM IDs', () => {
    expect(MOCK_MACHINES.length).toBe(50);
    expect(MOCK_MACHINES[0].machine_id).toBe('TXM-001');
    expect(MOCK_MACHINES[49].machine_id).toBe('TXM-050');
  });

  it('provides 50 recommendation objects with 4-tier evidence', () => {
    expect(MOCK_RECOMMENDATIONS.length).toBe(50);
    const txm014 = MOCK_RECOMMENDATIONS.find((r) => r.machine_id === 'TXM-014');
    expect(txm014).toBeDefined();
    expect(txm014?.risk_assessment.risk_level).toBe('CRITICAL');
    expect(txm014?.current_condition.health_state_label).toBe('Critical');
    expect(txm014?.retrieved_documentary_evidence.length).toBeGreaterThan(0);
    expect(txm014?.generated_explanation.recommended_actions.length).toBeGreaterThan(0);
  });

  it('generates 24-point chronological sensor history for SVG chart', () => {
    const history = generateMockSensorHistory('TXM-014', 5.82, 86.4);
    expect(history.length).toBe(24);
    expect(history[history.length - 1].vibration_magnitude).toBe(5.82);
    expect(history[history.length - 1].temperature).toBe(86.4);
  });

  it('provides fleet overview with correct status totals', () => {
    expect(MOCK_FLEET_OVERVIEW.total_machines).toBe(50);
    expect(MOCK_FLEET_OVERVIEW.health_states.Critical).toBe(2);
    expect(MOCK_FLEET_OVERVIEW.health_states.Warning).toBe(6);
    expect(MOCK_FLEET_OVERVIEW.health_states.Good).toBe(42);
  });
});

describe('Resonex Multi-Page Routing Architecture', () => {
  it('registers all required application routes in layout hierarchy', () => {
    const rootRoute = routesConfig[0];
    expect(rootRoute.path).toBe('/');
    expect(rootRoute.children).toBeDefined();

    const childPaths = rootRoute.children?.map((c) => c.path ?? 'index') || [];
    expect(childPaths).toContain('index');
    expect(childPaths).toContain('overview');
    expect(childPaths).toContain('machines');
    expect(childPaths).toContain('machines/:machineId');
    expect(childPaths).toContain('alerts');
    expect(childPaths).toContain('maintenance');
    expect(childPaths).toContain('reports');
    expect(childPaths).toContain('settings');
    expect(childPaths).toContain('assistant');
    expect(childPaths).toContain('*');
  });
});
