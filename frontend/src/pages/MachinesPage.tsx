import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFleet } from '../context/FleetContext';
import { MachinesView } from '../components/MachinesView';

export const MachinesPage: React.FC = () => {
  const { machines, recsByMachine, searchQuery, setSearchQuery } = useFleet();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // If URL has ?search=TXM-xxx, sync to searchQuery state
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch && urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
    }
  }, [searchParams]);

  const handleSelectMachine = (machineId: string) => {
    navigate(`/machines/${encodeURIComponent(machineId)}`);
  };

  const handleOpenAIWithMachine = (machineId: string) => {
    navigate(`/assistant?machine=${encodeURIComponent(machineId)}`);
  };

  return (
    <MachinesView
      machines={machines}
      recsByMachine={recsByMachine}
      onSelectMachine={handleSelectMachine}
      onOpenAIWithMachine={handleOpenAIWithMachine}
    />
  );
};
