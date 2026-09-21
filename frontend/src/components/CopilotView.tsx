import React, { useState, useRef, useEffect } from 'react';
import { Machine, RagChatResponse, RagDocumentHit } from '../types';
import { api } from '../services/api';

interface CopilotViewProps {
  machines: Machine[];
  selectedMachineId: string | null;
  onSelectMachine: (id: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  machineId?: string;
  telemetryContext?: any;
  sources?: RagDocumentHit[];
}

const SAMPLE_QUESTIONS = [
  'What are the vibration velocity thresholds under ISO 10816 for textile spinning looms?',
  'Explain bearing failure stages and recommended SOP actions for peak vibration.',
  'What is the SOP for motor overheating above 80°C?',
  'Explain how skewness and kurtosis indicate early sub-surface bearing flaking.',
];

export const CopilotView: React.FC<CopilotViewProps> = ({
  machines,
  selectedMachineId,
  onSelectMachine,
}) => {
  const [activeMachineId, setActiveMachineId] = useState<string>(selectedMachineId || '');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Welcome to RESONEX Industrial Copilot. I am connected directly to your facility SOPs, machine operating manuals, ISO 10816 vibration standards, and live machine sensor telemetry. Ask me anything about machine diagnostics, maintenance procedures, or specific asset health.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<RagDocumentHit | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedMachineId) {
      setActiveMachineId(selectedMachineId);
    }
  }, [selectedMachineId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const query = (queryText || inputQuery).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      machineId: activeMachineId || undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setLoading(true);

    try {
      const resp: RagChatResponse = await api.sendRagChat(query, activeMachineId || undefined);
      const assistantMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: resp.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        machineId: resp.machine_id || undefined,
        telemetryContext: resp.machine_context,
        sources: resp.cited_documents,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (resp.cited_documents && resp.cited_documents.length > 0 && !selectedCitation) {
        setSelectedCitation(resp.cited_documents[0]);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: `Error contacting RAG Copilot: ${err.message || 'Unknown network error'}. Please ensure backend is running.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="copilot-layout">
      {/* Main Chat Panel */}
      <div className="copilot-chat-container">
        {/* Chat Header */}
        <div className="copilot-header">
          <div className="copilot-header-info">
            <div className="copilot-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
                <rect x="3" y="8" width="18" height="12" rx="2" />
                <path d="M9 13h6" />
              </svg>
            </div>
            <div>
              <h2 className="copilot-title">RESONEX AI Maintenance Copilot</h2>
              <p className="copilot-subtitle">Grounded Retrieval-Augmented Generation • ISO 10816 & Factory SOPs</p>
            </div>
          </div>

          <div className="copilot-asset-selector">
            <label htmlFor="copilot-machine-select">Focus Asset:</label>
            <select
              id="copilot-machine-select"
              className="saas-select"
              value={activeMachineId}
              onChange={(e) => {
                setActiveMachineId(e.target.value);
                if (e.target.value) {
                  onSelectMachine(e.target.value);
                }
              }}
            >
              <option value="">Fleet-Wide (General SOPs)</option>
              {machines.map((m) => (
                <option key={m.machine_id} value={m.machine_id}>
                  {m.machine_id} ({m.machine_type} • {m.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Prompt Suggestions */}
        <div className="copilot-suggestions">
          <span className="suggestion-label">Try asking:</span>
          {SAMPLE_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              className="suggestion-chip"
              onClick={() => handleSend(q)}
              disabled={loading}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Message Stream */}
        <div className="copilot-messages-stream">
          {messages.map((msg) => (
            <div key={msg.id} className={`copilot-message-bubble ${msg.sender}`}>
              <div className="message-header">
                <span className="sender-name">{msg.sender === 'user' ? 'Operator' : 'Resonex Copilot'}</span>
                <span className="message-time">{msg.timestamp}</span>
              </div>
              <div className="message-body">
                <p className="message-text">{msg.text}</p>
                {msg.machineId && (
                  <div className="grounded-asset-tag">
                    <span>Grounded Asset: <strong>{msg.machineId}</strong></span>
                    {msg.telemetryContext && (
                      <span className="telemetry-pill">
                        Health: {msg.telemetryContext.health_score ?? 'N/A'} • Risk: {msg.telemetryContext.risk_level ?? 'N/A'}
                      </span>
                    )}
                  </div>
                )}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="sources-strip">
                    <span className="sources-title">Retrieved Citations:</span>
                    <div className="source-chips-row">
                      {msg.sources.map((src, i) => (
                        <button
                          key={i}
                          className={`source-chip ${selectedCitation?.title === src.title && selectedCitation?.section === src.section ? 'active' : ''}`}
                          onClick={() => setSelectedCitation(src)}
                        >
                          📄 {src.source_document} {src.section ? `• ${src.section}` : ''} ({Math.round(src.relevance_score * 100)}%)
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="copilot-message-bubble assistant loading">
              <div className="loading-dots">
                <span></span><span></span><span></span>
              </div>
              <span className="loading-text">Consulting ISO standards & operating manuals...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          className="copilot-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            type="text"
            className="copilot-input-field"
            placeholder={
              activeMachineId
                ? `Ask question grounded in ${activeMachineId} telemetry & maintenance manuals...`
                : 'Ask maintenance question or query ISO 10816 standards...'
            }
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="copilot-send-btn" disabled={loading || !inputQuery.trim()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
            <span>Send</span>
          </button>
        </form>
      </div>

      {/* Right Knowledge Base & Citation Inspector */}
      <div className="copilot-side-panel">
        <div className="side-panel-card">
          <h3 className="side-panel-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            Evidence & Document Citation
          </h3>

          {selectedCitation ? (
            <div className="citation-detail-view">
              <div className="citation-meta-box">
                <div className="meta-row">
                  <span className="meta-label">Document:</span>
                  <span className="meta-value">{selectedCitation.source_document}</span>
                </div>
                {selectedCitation.section && (
                  <div className="meta-row">
                    <span className="meta-label">Section:</span>
                    <span className="meta-value">{selectedCitation.section}</span>
                  </div>
                )}
                {selectedCitation.document_type && (
                  <div className="meta-row">
                    <span className="meta-label">Type:</span>
                    <span className="meta-value doc-tag">{selectedCitation.document_type}</span>
                  </div>
                )}
                <div className="meta-row">
                  <span className="meta-label">Relevance:</span>
                  <span className="meta-value score">{(selectedCitation.relevance_score * 100).toFixed(1)}% match</span>
                </div>
              </div>

              <div className="citation-snippet">
                <label>Verified Manual Excerpt:</label>
                <div className="snippet-text">{selectedCitation.content}</div>
              </div>
            </div>
          ) : (
            <div className="side-empty-state">
              <p>Ask a question or select a citation chip to view exact technical documentation excerpts.</p>
            </div>
          )}
        </div>

        {/* Knowledge Base Index Card */}
        <div className="side-panel-card kb-index">
          <h3 className="side-panel-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            Indexed Knowledge Base
          </h3>
          <ul className="kb-file-list">
            <li className="kb-file-item">
              <span className="kb-icon">📘</span>
              <div className="kb-info">
                <span className="kb-name">ISO 10816-3 Standard</span>
                <span className="kb-desc">Mechanical vibration evaluation standards for industrial machines</span>
              </div>
            </li>
            <li className="kb-file-item">
              <span className="kb-icon">📙</span>
              <div className="kb-info">
                <span className="kb-name">SOP-BEAR-01: Bearing Lubrication</span>
                <span className="kb-desc">Grease replenishment & ultrasonic condition monitoring</span>
              </div>
            </li>
            <li className="kb-file-item">
              <span className="kb-icon">📗</span>
              <div className="kb-info">
                <span className="kb-name">SOP-BELT-04: Drive Belt Tensioning</span>
                <span className="kb-desc">Harmonic tension measurement & belt alignment</span>
              </div>
            </li>
            <li className="kb-file-item">
              <span className="kb-icon">📕</span>
              <div className="kb-info">
                <span className="kb-name">SOP-THERM-02: Stator Overheating</span>
                <span className="kb-desc">Thermal cooling duct inspection & motor shutdown protocols</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

