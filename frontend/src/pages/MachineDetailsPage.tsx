import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MachineDetail } from '../components/MachineDetail';

export const MachineDetailsPage: React.FC = () => {
  const { machineId } = useParams<{ machineId: string }>();
  const navigate = useNavigate();

  if (!machineId) {
    return (
      <div className="view-page-container">
        <div className="stitch-card p-space-lg text-center">
          <p className="text-secondary">No machine ID specified in URL.</p>
          <button
            onClick={() => navigate('/machines')}
            className="stitch-btn-primary mt-4 inline-flex"
            type="button"
          >
            Go to Machines Registry
          </button>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    navigate('/machines');
  };

  const handleOpenAIWithMachine = (mId: string) => {
    navigate(`/assistant?machine=${encodeURIComponent(mId)}`);
  };

  const handleNavigateTab = (tab: string) => {
    if (tab === 'machines') navigate('/machines');
    else if (tab === 'alerts') navigate('/alerts');
    else if (tab === 'maintenance') navigate('/maintenance');
    else if (tab === 'reports') navigate('/reports');
    else navigate('/overview');
  };

  return (
    <MachineDetail
      machineId={machineId}
      onBack={handleBack}
      onOpenAIWithMachine={handleOpenAIWithMachine}
      onNavigateTab={handleNavigateTab}
    />
  );
};
