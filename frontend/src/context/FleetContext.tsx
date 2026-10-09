import React, { createContext, useContext, useState, useEffect } from 'react';
import { FleetOverview, Machine, RecommendationDecision } from '../types';
import { api } from '../services/api';
import { MOCK_FLEET_OVERVIEW, MOCK_MACHINES, MOCK_RECOMMENDATIONS } from '../services/mockData';

export interface AlertContextType {
  machineId: string;
  severity: string;
  condition: string;
  rulHours?: number | null;
  diagnostics?: string;
}

interface FleetContextValue {
  overview: FleetOverview;
  machines: Machine[];
  recommendations: RecommendationDecision[];
  recsByMachine: Record<string, RecommendationDecision>;
  alertCount: number;
  loading: boolean;
  isOffline: boolean;
  autoRefresh: boolean;
  setAutoRefresh: React.Dispatch<React.SetStateAction<boolean>>;
  refreshData: () => Promise<void>;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  // Quick AI drawer support across all pages
  isAIDrawerOpen: boolean;
  setIsAIDrawerOpen: (open: boolean) => void;
  activeAlertContext: AlertContextType | null;
  setActiveAlertContext: (ctx: AlertContextType | null) => void;
  openAIWithMachine: (machineId: string) => void;
  openAIWithAlert: (ctx: AlertContextType) => void;
}

const FleetContext = createContext<FleetContextValue | undefined>(undefined);

export const FleetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [overview, setOverview] = useState<FleetOverview>(MOCK_FLEET_OVERVIEW);
  const [machines, setMachines] = useState<Machine[]>(MOCK_MACHINES);
  const [recommendations, setRecommendations] = useState<RecommendationDecision[]>(MOCK_RECOMMENDATIONS);
  const [loading, setLoading] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // AI Drawer state (quick floating drawer available across pages)
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState<boolean>(false);
  const [activeAlertContext, setActiveAlertContext] = useState<AlertContextType | null>(null);

  // Theme
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('resonex_theme') as 'light' | 'dark') || 'dark';
  });

  const fetchGlobalData = async () => {
    setLoading(true);
    let anySuccess = false;

    const p1 = api.getFleetOverview()
      .then((data) => {
        if (data && data.total_machines > 0) {
          setOverview(data);
          anySuccess = true;
        }
      })
      .catch(() => {});

    const p2 = api.getMachines()
      .then((data) => {
        if (data && data.length > 0) {
          setMachines(data);
          anySuccess = true;
        }
      })
      .catch(() => {});

    const p3 = api.getFleetRecommendations()
      .then((data) => {
        if (data && data.length > 0) {
          setRecommendations(data);
          anySuccess = true;
        }
      })
      .catch(() => {});

    await Promise.allSettled([p1, p2, p3]);
    setIsOffline(!anySuccess);
    setLoading(false);
  };

  useEffect(() => {
    fetchGlobalData();
  }, []);

  // Theme sync
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    localStorage.setItem('resonex_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // 30s Polling
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      Promise.all([
        api.getFleetOverview(),
        api.getMachines(),
        api.getFleetRecommendations().catch(() => []),
      ])
        .then(([overviewData, machinesData, recsData]) => {
          setOverview(overviewData);
          if (machinesData && machinesData.length > 0) setMachines(machinesData);
          if (recsData && recsData.length > 0) setRecommendations(recsData);
          setIsOffline(false);
        })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const recsByMachine = recommendations.reduce<Record<string, RecommendationDecision>>((acc, r) => {
    acc[r.machine_id] = r;
    return acc;
  }, {});

  const alertCount = recommendations.filter((r) => {
    const risk = r.risk_assessment?.risk_level || 'LOW';
    const health = r.current_condition?.health_state_label || 'Good';
    return risk === 'CRITICAL' || risk === 'HIGH' || risk === 'MEDIUM' || health === 'Critical';
  }).length;

  const openAIWithMachine = (machineId: string) => {
    setActiveAlertContext(null);
    setIsAIDrawerOpen(true);
  };

  const openAIWithAlert = (ctx: AlertContextType) => {
    setActiveAlertContext(ctx);
    setIsAIDrawerOpen(true);
  };

  return (
    <FleetContext.Provider
      value={{
        overview,
        machines,
        recommendations,
        recsByMachine,
        alertCount,
        loading,
        isOffline,
        autoRefresh,
        setAutoRefresh,
        refreshData: fetchGlobalData,
        theme,
        toggleTheme,
        searchQuery,
        setSearchQuery,
        isAIDrawerOpen,
        setIsAIDrawerOpen,
        activeAlertContext,
        setActiveAlertContext,
        openAIWithMachine,
        openAIWithAlert,
      }}
    >
      {children}
    </FleetContext.Provider>
  );
};

export const useFleet = (): FleetContextValue => {
  const context = useContext(FleetContext);
  if (!context) {
    throw new Error('useFleet must be used within a FleetProvider');
  }
  return context;
};
