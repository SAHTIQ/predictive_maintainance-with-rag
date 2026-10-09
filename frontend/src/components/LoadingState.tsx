import React from 'react';

interface LoadingStateProps {
  message?: string;
  subtext?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading telemetry & predictive diagnostics...',
  subtext = 'Connecting to edge sensor nodes and executing adaptive health models',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 my-6 bg-[#111C2E] border border-[#243247] rounded-lg text-center animate-pulse">
      <div className="relative flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-[#162338] border border-[#06B6D4]/30">
        <span className="material-symbols-outlined text-[24px] text-[#06B6D4] animate-spin">
          sync
        </span>
      </div>
      <h3 className="text-sm font-semibold text-[#F1F5F9] tracking-wide mb-1">
        {message}
      </h3>
      <p className="text-xs text-[#94A3B8] max-w-md">
        {subtext}
      </p>
    </div>
  );
};
