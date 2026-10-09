import React from 'react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Telemetry Connection Notice',
  message,
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 my-6 bg-[#111C2E] border border-[#EF4444]/40 rounded-lg text-center">
      <div className="flex items-center justify-center w-12 h-12 mb-3 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/30">
        <span className="material-symbols-outlined text-[24px] text-[#EF4444]">
          error_outline
        </span>
      </div>
      <h3 className="text-sm font-semibold text-[#F1F5F9] mb-1">
        {title}
      </h3>
      <p className="text-xs text-[#94A3B8] max-w-md mb-4">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          type="button"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-[#162338] hover:bg-[#1E2D44] border border-[#243247] text-[#F1F5F9] text-xs font-medium transition-colors"
        >
          <span className="material-symbols-outlined text-[14px] text-[#06B6D4]">refresh</span>
          <span>Retry Request</span>
        </button>
      )}
    </div>
  );
};
