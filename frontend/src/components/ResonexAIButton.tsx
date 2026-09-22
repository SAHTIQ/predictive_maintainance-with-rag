import React from 'react';

interface ResonexAIButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  hasContextAlert?: boolean;
  contextMachineId?: string | null;
}

export const ResonexAIButton: React.FC<ResonexAIButtonProps> = ({
  isOpen,
  onToggle,
  hasContextAlert = false,
  contextMachineId = null,
}) => {
  return (
    <button
      className={`resonex-ai-floating-btn ${isOpen ? 'active' : ''} ${hasContextAlert ? 'has-alarm' : ''}`}
      onClick={onToggle}
      title="Open Resonex Industrial AI Assistant"
      aria-label="Open Resonex AI"
      type="button"
    >
      <span className="ai-btn-sparkle">✦</span>
      <span className="ai-btn-text">Resonex AI</span>
      {contextMachineId ? (
        <span className="ai-btn-context-tag">{contextMachineId}</span>
      ) : hasContextAlert ? (
        <span className="ai-btn-alert-dot" />
      ) : null}
    </button>
  );
};
