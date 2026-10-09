import React from 'react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Records Found',
  message = 'No data matching your current filters or search criteria.',
  icon = 'inbox',
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 my-6 bg-[#111C2E] border border-[#243247] rounded-lg text-center">
      <div className="flex items-center justify-center w-12 h-12 mb-3 rounded-full bg-[#162338] border border-[#243247]">
        <span className="material-symbols-outlined text-[24px] text-[#94A3B8]">
          {icon}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-[#F1F5F9] mb-1">
        {title}
      </h3>
      <p className="text-xs text-[#94A3B8] max-w-sm mb-4">
        {message}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#06B6D4] hover:bg-[#0891B2] text-[#0B1220] text-xs font-semibold transition-colors"
        >
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};
