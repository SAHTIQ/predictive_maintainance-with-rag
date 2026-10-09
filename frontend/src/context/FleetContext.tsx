import React, { createContext, useContext, useState, useEffect } from 'react';
import { FleetOverview, Machine, RecommendationDecision, UserProfile, UserProfileUpdateInput, UserPreferencesUpdateInput, UserPreferences } from '../types';
import { api } from '../services/api';
import { MOCK_FLEET_OVERVIEW, MOCK_MACHINES, MOCK_RECOMMENDATIONS } from '../services/mockData';

export interface AlertContextType {
  machineId: string;
  severity: string;
  condition: string;
  rulHours?: number | null;
  diagnostics?: string;
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: 1,
  email: 'mark.jenkins@resonex.internal',
  full_name: 'Mark Jenkins',
  display_name: 'Operator Jenkins',
  phone_number: '+1 (555) 382-9401',
  job_title: 'Lead Monitorer / Shift Supervisor',
  department: 'Predictive Maintenance & Reliability Engineering',
  plant_assignment: 'Plant Alpha (Sector C Machining & Spinning)',
  preferred_language: 'en',
  role: 'Shift Supervisor',
  account_status: 'Active',
  avatar_url: '/operations_manager_avatar.png',
  auth_provider: 'Resonex Local Identity',
  last_login: new Date().toISOString(),
  preferences: {
    theme: 'dark',
    preferred_dashboard: '/overview',
    language: 'en',
    timezone: 'UTC+05:30 (Asia/Kolkata)',
    email_alerts: true,
    sms_alerts: false,
    critical_push: true,
    sound_effects: true,
  },
  created_at: '2026-01-15T08:00:00Z',
  updated_at: new Date().toISOString(),
};

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
  // User Profile
  currentUser: UserProfile;
  updateCurrentUser: (updates: UserProfileUpdateInput) => Promise<UserProfile>;
  updateUserPreferences: (prefs: UserPreferencesUpdateInput) => Promise<UserPreferences>;
  refreshCurrentUser: () => Promise<void>;
  // Quick AI drawer support across all pages
  isAIDrawerOpen: boolean;
  setIsAIDrawerOpen: (open: boolean) => void;
  activeAlertContext: AlertContextType | null;
  setActiveAlertContext: (ctx: AlertContextType | null) => void;
  openAIWithMachine: (machineId: string) => void;
  openAIWithAlert: (ctx: AlertContextType) => void;
  registerNewMachine: (newMachine: Machine) => void;
}

const FleetContext = createContext<FleetContextValue | undefined>(undefined);

export const FleetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEFAULT_USER_PROFILE);
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

    const p4 = api.getUserProfile()
      .then((user) => {
        if (user && user.id) {
          setCurrentUser(user);
          if (user.preferences?.theme && (user.preferences.theme === 'light' || user.preferences.theme === 'dark')) {
            setTheme(user.preferences.theme);
          }
          anySuccess = true;
        }
      })
      .catch(() => {});

    await Promise.allSettled([p1, p2, p3, p4]);
    setIsOffline(!anySuccess);
    setLoading(false);
  };

  const refreshCurrentUser = async () => {
    try {
      const user = await api.getUserProfile();
      if (user && user.id) {
        setCurrentUser(user);
        if (user.preferences?.theme) {
          setTheme(user.preferences.theme);
        }
      }
    } catch (err) {
      console.warn('Failed to refresh current user:', err);
    }
  };

  const updateCurrentUser = async (updates: UserProfileUpdateInput): Promise<UserProfile> => {
    const updated = await api.updateUserProfile(updates);
    setCurrentUser(updated);
    return updated;
  };

  const updateUserPreferences = async (prefs: UserPreferencesUpdateInput): Promise<UserPreferences> => {
    const updatedPrefs = await api.updateUserPreferences(prefs);
    setCurrentUser((prev) => ({
      ...prev,
      preferences: updatedPrefs,
    }));
    if (updatedPrefs.theme) {
      setTheme(updatedPrefs.theme);
    }
    return updatedPrefs;
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

  const registerNewMachine = (newMachine: Machine) => {
    setMachines((prev) => {
      const exists = prev.some((m) => m.machine_id === newMachine.machine_id);
      if (exists) {
        return prev.map((m) => (m.machine_id === newMachine.machine_id ? newMachine : m));
      }
      return [newMachine, ...prev];
    });
    // Trigger global refresh in background to sync overview KPIs
    fetchGlobalData();
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
        // User Profile
        currentUser,
        updateCurrentUser,
        updateUserPreferences,
        refreshCurrentUser,
        isAIDrawerOpen,
        setIsAIDrawerOpen,
        activeAlertContext,
        setActiveAlertContext,
        openAIWithMachine,
        openAIWithAlert,
        registerNewMachine,
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
