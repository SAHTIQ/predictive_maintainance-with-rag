import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFleet } from '../context/FleetContext';
import { MaintenanceView } from '../components/MaintenanceView';

export const MaintenancePage: React.FC = () => {
  const { recommendations, machines } = useFleet();
  const navigate = useNavigate();

  const handleSelectMachine = (machineId: string) => {
    navigate(`/machines/${encodeURIComponent(machineId)}`);
  };

  const handleOpenAIWithMachine = (machineId: string) => {
    navigate(`/assistant?machine=${encodeURIComponent(machineId)}`);
  };

  return (
    <MaintenanceView
      recommendations={recommendations}
      machines={machines}
      onSelectMachine={handleSelectMachine}
      onOpenAIWithMachine={handleOpenAIWithMachine}
    />
  );
};
