import React, { useState, useEffect, useRef } from 'react';
import { NavTab } from './Sidebar';
import { Machine, RagChatResponse, RagDocumentHit } from '../types';
import { api } from '../services/api';

export interface AlertContext {
  machineId: string;
  severity: string;
  condition: string;
  rulHours?: number | null;
  diagnostics?: string;
}

interface ResonexAIDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: NavTab;
  selectedMachineId: string | null;
  activeAlertContext?: AlertContext | null;
  machines: Machine[];
  onSelectMachine?: (machineId: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  machineId?: string;
  telemetryContext?: any;
  sources?: RagDocumentHit[];
  suggestedActions?: string[];
  confidence?: number;
}

export const ResonexAIDrawer: React.FC<ResonexAIDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  selectedMachineId,
  activeAlertContext,
  machines,
  onSelectMachine,
}) => {
  // Focus machine ID (either from alert, machine detail, or user selection)
  const [drawerMachineId, setDrawerMachineId] = useState<string>(
    activeAlertContext?.machineId || selectedMachineId || ''
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedDocIndex, setExpandedDocIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync drawerMachineId when alert context or selectedMachineId changes
  useEffect(() => {
    if (activeAlertContext?.machineId) {
      setDrawerMachineId(activeAlertContext.machineId);
    } else if (selectedMachineId) {
      setDrawerMachineId(selectedMachineId);
    }
  }, [activeAlertContext, selectedMachineId]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Generate contextual initial message if thread is empty
  useEffect(() => {
    if (messages.length === 0) {
      let welcomeText = 'Hello! I am your Resonex Factory Assistant. I track live sensor readings, machine health, and official factory repair manuals. How can I help you today?';
      if (activeAlertContext) {
        welcomeText = `I am looking at the alert for ${activeAlertContext.machineId} (${activeAlertContext.severity}). Status: "${activeAlertContext.condition}". What would you like to know or fix?`;
      } else if (selectedMachineId) {
        welcomeText = `I am currently monitoring machine ${selectedMachineId}. Ask me about shaking (vibration), temperature, how many hours are left, or recommended repair steps.`;
      } else if (activeTab === 'dashboard') {
        welcomeText = 'Factory Assistant active. Ask me which machines need attention, overall factory health, or shift handover summary.';
      }

      setMessages([
        {
          id: 'initial',
          sender: 'assistant',
          text: welcomeText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          machineId: activeAlertContext?.machineId || selectedMachineId || undefined,
        },
      ]);
    }
  }, [activeAlertContext, selectedMachineId, activeTab]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isOpen]);

  // Determine dynamic suggested quick prompts based on context
  const getContextSuggestions = (): string[] => {
    if (activeAlertContext) {
      const mid = activeAlertContext.machineId;
      return [
        `Why does ${mid} need an urgent fix?`,
        `What problem was detected on ${mid}?`,
        `Show sensor readings for this alert`,
        `How do I fix ${mid}?`,
        `What should I do right now?`,
      ];
    }
    if (selectedMachineId) {
      return [
        `Why is ${selectedMachineId} flagged?`,
        `How many hours left for ${selectedMachineId}?`,
        `Explain shaking (vibration) on ${selectedMachineId}`,
        `Show repair guide for this machine`,
      ];
    }
    switch (activeTab) {
      case 'dashboard':
        return [
          'Which machines need attention first?',
          'What is the average hours left across all machines?',
          'List machines that need urgent repair',
          'Show overall vibration levels',
        ];
      case 'machines':
        return [
          'Which machine has the shortest time left?',
          'Compare machine vibration levels',
          'Which machines are wearing out fastest?',
        ];
      case 'alerts':
        return [
          'What are the main causes of active alerts?',
          'Which alert needs repair earliest today?',
          'Show repair steps for high vibration warnings',
        ];
      case 'maintenance':
        return [
          'Which repair task should I handle first?',
          'What are the steps to lubricate spindle bearings?',
          'How many machines need repair today?',
        ];
      case 'reports':
        return [
          'Explain the machine health trend for Shift A',
          'Summarize hottest and highest shaking machines',
          'Are all machines within safe vibration standards?',
        ];
      case 'settings':
        return [
          'What are the safe vibration thresholds?',
          'How does anomaly sensitivity work?',
        ];
      default:
        return [
          'Which machines need attention?',
          'What are the current machine risks?',
        ];
    }
  };

  const handleSend = async (queryText?: string) => {
    const query = (queryText || inputQuery).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      machineId: drawerMachineId || undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setLoading(true);

    try {
      const resp: RagChatResponse = await api.sendRagChat(query, drawerMachineId || undefined);

      const assistantMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: resp.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        machineId: resp.machine_id || drawerMachineId || undefined,
        telemetryContext: resp.machine_context,
        sources: resp.cited_documents,
        suggestedActions: resp.suggested_actions,
        confidence: resp.confidence,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: `Error contacting Resonex AI backend: ${err.message || 'Network communication failed'}. Please ensure the backend server is running.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const suggestions = getContextSuggestions();

  return (
    <>
      {/* Light subtle backdrop overlay - clicking outside closes drawer */}
      <div className="resonex-ai-backdrop" onClick={onClose} />

      {/* Slide-over Drawer Panel */}
      <aside className="resonex-ai-drawer" aria-label="Resonex AI Assistant Drawer">
        {/* Drawer Header */}
        <div className="ai-drawer-header">
          <div className="ai-drawer-title-group">
            <span className="ai-drawer-icon">✦</span>
            <div>
              <h2 className="ai-drawer-title">Resonex AI</h2>
              <span className="ai-drawer-subtitle">Predictive Diagnostic Assistant</span>
            </div>
          </div>

          <button className="ai-drawer-close-btn" onClick={onClose} title="Close AI Assistant (Esc)">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Machine Context Selector Strip */}
        <div className="ai-context-strip">
          <div className="context-label-group">
            <span className="context-pill-tag">ACTIVE CONTEXT</span>
            {activeAlertContext && (
              <span className="context-alert-chip">
                {activeAlertContext.severity} · {activeAlertContext.machineId}
              </span>
            )}
          </div>

          <div className="context-machine-select-wrap">
            <span className="material-symbols-outlined context-select-icon">precision_manufacturing</span>
            <select
              className="context-machine-select"
              value={drawerMachineId}
              onChange={(e) => {
                const newId = e.target.value;
                setDrawerMachineId(newId);
                if (newId && onSelectMachine) {
                  // Optionally sync selection
                }
              }}
            >
              <option value="">Fleet-Wide (No specific machine)</option>
              {machines.map((m) => (
                <option key={m.machine_id} value={m.machine_id}>
                  {m.machine_id} {m.machine_name ? `(${m.machine_name})` : ''} - Type {m.machine_type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Suggested Contextual Quick Prompts */}
        <div className="ai-suggestions-row">
          <span className="suggestions-label">Suggested Questions:</span>
          <div className="suggestions-scroll">
            {suggestions.map((prompt, idx) => (
              <button
                key={idx}
                className="suggestion-chip"
                onClick={() => handleSend(prompt)}
                disabled={loading}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Message Thread */}
        <div className="ai-drawer-body">
          {messages.map((msg) => (
            <div key={msg.id} className={`ai-message-item ${msg.sender}`}>
              <div className="ai-msg-header">
                <span className="ai-msg-author">
                  {msg.sender === 'user' ? 'Operator' : '✦ Resonex AI'}
                </span>
                <span className="ai-msg-time">{msg.timestamp}</span>
              </div>

              {/* Message text */}
              <div className="ai-msg-content leading-relaxed">
                {msg.text}
              </div>

              {/* Evidence Section (Rule 10: Clear Evidence Differentiation) */}
              {msg.sender === 'assistant' && (
                <div className="ai-evidence-container">
                  {/* 1. Measured Sensor Telemetry */}
                  {msg.telemetryContext && (
                    <div className="ai-evidence-card measured">
                      <div className="evidence-header">
                        <span className="material-symbols-outlined evidence-icon">sensors</span>
                        <span className="evidence-title">1. Live Sensor Readings</span>
                      </div>
                      <div className="evidence-metrics-grid">
                        <div className="evidence-metric-tile">
                          <span className="metric-name">Temperature</span>
                          <span className="metric-val font-numeric">
                            {msg.telemetryContext.temperature != null
                              ? `${msg.telemetryContext.temperature.toFixed(1)} °C`
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="evidence-metric-tile">
                          <span className="metric-name">Shaking (Vibration)</span>
                          <span className="metric-val font-numeric">
                            {msg.telemetryContext.vibration_magnitude != null
                              ? `${msg.telemetryContext.vibration_magnitude.toFixed(2)} mm/s`
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="evidence-metric-tile">
                          <span className="metric-name">Machine ID</span>
                          <span className="metric-val font-numeric font-bold text-primary">
                            {msg.telemetryContext.machine_id}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. Calculated ML Diagnostics */}
                  {msg.telemetryContext && (
                    <div className="ai-evidence-card calculated">
                      <div className="evidence-header">
                        <span className="material-symbols-outlined evidence-icon">analytics</span>
                        <span className="evidence-title">2. Machine Health & Hours Left</span>
                      </div>
                      <div className="evidence-metrics-grid">
                        <div className="evidence-metric-tile">
                          <span className="metric-name">Health Score</span>
                          <span className="metric-val font-numeric">
                            {msg.telemetryContext.health_score != null
                              ? `${msg.telemetryContext.health_score.toFixed(1)}/100`
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="evidence-metric-tile">
                          <span className="metric-name">Hours Left (RUL)</span>
                          <span className="metric-val font-numeric">
                            {msg.telemetryContext.rul_hours != null
                              ? `${msg.telemetryContext.rul_hours.toFixed(0)} Hours`
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="evidence-metric-tile">
                          <span className="metric-name">Risk Level</span>
                          <span className={`metric-val risk-tag ${msg.telemetryContext.risk_level?.toLowerCase() || 'low'}`}>
                            {msg.telemetryContext.risk_level || 'LOW'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. Retrieved RAG Documents & SOPs */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="ai-evidence-card rag-docs">
                      <div className="evidence-header">
                        <span className="material-symbols-outlined evidence-icon">menu_book</span>
                        <span className="evidence-title">
                          3. Factory Manuals & Guides ({msg.sources.length} Found)
                        </span>
                      </div>
                      <div className="rag-citation-list">
                        {msg.sources.map((doc, dIdx) => {
                          const isExpanded = expandedDocIndex === dIdx;
                          return (
                            <div key={dIdx} className="citation-item">
                              <div
                                className="citation-header"
                                onClick={() => setExpandedDocIndex(isExpanded ? null : dIdx)}
                                role="button"
                                tabIndex={0}
                              >
                                <div className="citation-title-row">
                                  <span className="citation-name">{doc.title}</span>
                                  <span className="citation-score">
                                    {(doc.relevance_score * 100).toFixed(0)}% match
                                  </span>
                                </div>
                                <span className="citation-meta">
                                  {doc.source_document} • {doc.section}
                                </span>
                              </div>
                              {isExpanded && (
                                <div className="citation-body">
                                  <p className="citation-content">{doc.content}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 4. Suggested Operational Mitigation */}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="ai-evidence-card actions">
                      <div className="evidence-header">
                        <span className="material-symbols-outlined evidence-icon">build_circle</span>
                        <span className="evidence-title">4. Recommended Steps to Fix</span>
                      </div>
                      <ul className="evidence-actions-list">
                        {msg.suggestedActions.map((action, aIdx) => (
                          <li key={aIdx} className="evidence-action-item">
                            <span className="material-symbols-outlined action-check">check_circle</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="ai-message-item assistant loading">
              <div className="ai-msg-header">
                <span className="ai-msg-author">✦ Resonex AI</span>
                <span className="ai-msg-time">Analyzing Telemetry...</span>
              </div>
              <div className="ai-loading-dots">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="ai-drawer-footer">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="ai-input-form"
          >
            <input
              ref={inputRef}
              type="text"
              className="ai-chat-input"
              placeholder={
                drawerMachineId
                  ? `Ask AI Assistant about ${drawerMachineId}...`
                  : 'Ask about machine health, repair guides, or alerts...'
              }
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="ai-send-btn"
              disabled={loading || !inputQuery.trim()}
              title="Send Message"
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </form>
          <span className="ai-footnote">
            All answers are verified directly with live sensor readings and official factory repair manuals.
          </span>
        </div>
      </aside>
    </>
  );
};
