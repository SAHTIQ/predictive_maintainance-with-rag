import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFleet } from '../context/FleetContext';
import { ReportsView } from '../components/ReportsView';

export const ReportsPage: React.FC = () => {
  const { overview, recommendations, machines } = useFleet();
  const navigate = useNavigate();

  const handleSelectMachine = (machineId: string) => {
    navigate(`/machines/${encodeURIComponent(machineId)}`);
  };

  return (
    <ReportsView
      overview={overview}
      recommendations={recommendations}
      machines={machines}
      onSelectMachine={handleSelectMachine}
    />
  );
};
