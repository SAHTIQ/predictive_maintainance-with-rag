import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFleet, AlertContextType } from '../context/FleetContext';
import { AlertsView } from '../components/AlertsView';

export const AlertsPage: React.FC = () => {
  const { recommendations, machines, openAIWithAlert } = useFleet();
  const navigate = useNavigate();

  const handleSelectMachine = (machineId: string) => {
    navigate(`/machines/${encodeURIComponent(machineId)}`);
  };

  const handleOpenAIWithAlert = (alertCtx: AlertContextType) => {
    navigate(`/assistant?machine=${encodeURIComponent(alertCtx.machineId)}&alertSeverity=${encodeURIComponent(alertCtx.severity)}`);
  };

  const handleNavigateTab = (tab: string) => {
    if (tab === 'maintenance') navigate('/maintenance');
    else if (tab === 'machines') navigate('/machines');
    else navigate('/overview');
  };

  return (
    <AlertsView
      recommendations={recommendations}
      machines={machines}
      onSelectMachine={handleSelectMachine}
      onOpenAIWithAlert={handleOpenAIWithAlert}
      onNavigateTab={handleNavigateTab}
    />
  );
};
