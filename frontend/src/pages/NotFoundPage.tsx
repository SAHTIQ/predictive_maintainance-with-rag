import React from 'react';
import { useNavigate } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="view-page-container">
      <div className="stitch-card p-12 text-center max-w-lg mx-auto my-12">
        <div className="w-14 h-14 rounded-full bg-[#162338] border border-[#243247] flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-[28px] text-[#06B6D4]">
            navigation
          </span>
        </div>
        <h2 className="text-xl font-bold text-[#F1F5F9] mb-2">404 - Page Not Found</h2>
        <p className="text-xs text-[#94A3B8] mb-6">
          The requested route does not exist in the Resonex monitoring console.
        </p>
        <button
          onClick={() => navigate('/overview')}
          className="stitch-btn-primary mx-auto inline-flex"
          type="button"
        >
          Return to Overview
        </button>
      </div>
    </div>
  );
};
