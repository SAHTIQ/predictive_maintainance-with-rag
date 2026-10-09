import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFleet } from '../context/FleetContext';
import { FleetDashboard } from '../components/FleetDashboard';

export const OverviewPage: React.FC = () => {
  const { overview, machines, recommendations, openAIWithMachine } = useFleet();
  const navigate = useNavigate();

  const handleSelectMachine = (machineId: string) => {
    navigate(`/machines/${encodeURIComponent(machineId)}`);
  };

  const handleNavigateTab = (tab: string) => {
    if (tab === 'dashboard' || tab === 'overview') navigate('/overview');
    else if (tab === 'machines') navigate('/machines');
    else if (tab === 'alerts') navigate('/alerts');
    else if (tab === 'maintenance') navigate('/maintenance');
    else if (tab === 'reports') navigate('/reports');
    else if (tab === 'settings') navigate('/settings');
    else if (tab === 'assistant') navigate('/assistant');
  };

  const handleOpenAI = (machineId: string) => {
    navigate(`/assistant?machine=${encodeURIComponent(machineId)}`);
  };

  return (
    <FleetDashboard
      overview={overview}
      machines={machines}
      recommendations={recommendations}
      onSelectMachine={handleSelectMachine}
      onNavigateTab={handleNavigateTab}
      onOpenAIWithMachine={handleOpenAI}
    />
  );
};
