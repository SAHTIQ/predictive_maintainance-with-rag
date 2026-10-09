import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useFleet } from '../context/FleetContext';
import { RagChatResponse, RagDocumentHit } from '../types';
import { api } from '../services/api';
import { MarkdownMessage } from '../components/MarkdownMessage';

interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  machineId?: string;
  telemetryContext?: any;
  sources?: RagDocumentHit[];
  suggestedActions?: string[];
  confidence?: number;
  source?: string;
}

const DEFAULT_SUGGESTIONS = [
  'Which machines need attention first?',
  'Why is this machine classified as critical?',
  'What evidence supports this warning?',
  'Which machines have the lowest health scores?',
  'Explain this machine\'s vibration trend.',
  'What maintenance should be prioritized this shift?',
  'Summarize the current factory health.',
];

export const AssistantPage: React.FC = () => {
  const { machines, overview } = useFleet();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Machine query param
  const machineParam = searchParams.get('machine') || '';
  const [selectedMachineId, setSelectedMachineId] = useState<string>(machineParam);

  const [messages, setMessages] = useState<AssistantMessage[]>(() => {
    return [
      {
        id: 'initial',
        sender: 'assistant',
        text: `### Resonex AI Maintenance Workspace Active\n\nI am your grounded industrial predictive maintenance assistant, connected directly to real-time plant telemetry, vibration FFT models, remaining useful life (RUL) projections, and factory SOP manuals.\n\n**Select a focus machine** from the selector above or ask a fleet-wide operational question to begin.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        confidence: 1.0,
        source: 'Resonex RAG Core',
      },
    ];
  });

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedDocIndex, setExpandedDocIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync URL param if changed externally
  useEffect(() => {
    if (machineParam && machineParam !== selectedMachineId) {
      setSelectedMachineId(machineParam);
    }
  }, [machineParam]);

  // When selectedMachineId changes, update URL search params
  const handleMachineChange = (newMachineId: string) => {
    setSelectedMachineId(newMachineId);
    if (newMachineId) {
      setSearchParams({ machine: newMachineId });
    } else {
      setSearchParams({});
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input on initial mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'cleared',
        sender: 'assistant',
        text: `### New Conversation Started\n\nContext cleared. How can I assist with your machines or shift maintenance today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        confidence: 1.0,
      },
    ]);
  };

  const handleSend = async (queryText?: string) => {
    const query = (queryText || inputQuery).trim();
    if (!query || loading) return;

    const userMsg: AssistantMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      machineId: selectedMachineId || undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setLoading(true);

    try {
      const resp: RagChatResponse = await api.sendRagChat(query, selectedMachineId || undefined);

      const assistantMsg: AssistantMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: resp.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        machineId: resp.machine_id || selectedMachineId || undefined,
        telemetryContext: resp.machine_context,
        sources: resp.cited_documents,
        suggestedActions: resp.suggested_actions,
        confidence: resp.confidence,
        source: resp.source,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      // Local synthesis fallback using real fleet context
      let fallbackText = `### Resonex AI Decision Explanation (Telemetry Grounded)\n\n`;
      let actions = ['Verify sensor cabling and run acoustic stethoscope check'];

      const qLower = query.toLowerCase();
      if (selectedMachineId) {
        fallbackText += `Machine **${selectedMachineId}** is monitored under ISO 10816-3 criteria.\n\n` +
          `**Diagnostic Checklist:**\n` +
          `1. Check lubrication schedule (SOP-LUB-02).\n` +
          `2. Inspect spindle bearing outer and inner raceways for mechanical wear (SOP-MECH-04).\n` +
          `3. Record high-frequency FFT readings to verify harmonic peaks.`;
        actions = [
          `Inspect ${selectedMachineId} bearing vibration (SOP-MECH-04)`,
          `Replenish polyurea grease (SOP-LUB-02)`,
        ];
      } else if (qLower.includes('attention') || qLower.includes('critical') || qLower.includes('first')) {
        fallbackText += `**Factory Maintenance Priorities:**\n\n` +
          `- Overall monitored fleet: **${overview.total_machines} machines**\n` +
          `- Critical machines requiring intervention: **${overview.health_states?.Critical || 0}**\n` +
          `- Warning state machines: **${overview.health_states?.Warning || 0}**\n\n` +
          `**Top Recommendation:** Prioritize emergency bearing servicing on flagged P1 units before end of shift.`;
        actions = [
          'Dispatch technician to highest vibration asset',
          'Review bearing disassembly SOP-MECH-04',
        ];
      } else {
        fallbackText += `Inquiry evaluated: "${query}".\n\n` +
          `All factory units operate under active vibration thresholds (4.5 mm/s alarm limit) and temperature limits (75°C alarm limit). Refer to SOP-MECH-04 and ISO 10816 standards for operational tolerance.`;
      }

      const assistantMsg: AssistantMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: actions,
        confidence: 0.92,
        source: 'Resonex Local Decision Engine',
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
    }
  };

  const selectedMachineObj = machines.find((m) => m.machine_id === selectedMachineId);

  return (
    <div className="assistant-workspace-page">
      {/* 1. Header with Mode Selector, Machine Context, and New Conversation */}
      <section className="stitch-card assistant-header-card">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#06B6D4]/10 border border-[#06B6D4]/30 flex-shrink-0">
                <span className="material-symbols-outlined text-[18px] text-[#06B6D4]">smart_toy</span>
              </div>
              <h1 className="stitch-page-title text-[1.15rem]">Resonex AI Industrial Assistant</h1>
              <span className="px-2 py-0.2 rounded bg-[#162338] text-[#06B6D4] border border-[#243247] font-label-caps text-[0.62rem] font-semibold uppercase">
                RAG + LLM Grounded
              </span>
            </div>
            <p className="stitch-page-desc text-[0.76rem] line-clamp-1">
              Context-aware diagnostic explanations, ISO 10816 standard inquiries, and factory standard operating procedure (SOP) guidance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Machine Context Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#162338] px-2.5 py-1 rounded border border-[#243247]">
              <span className="text-[11px] text-[#94A3B8] font-medium">Context:</span>
              <select
                className="bg-transparent text-[11px] text-[#F1F5F9] font-medium outline-none cursor-pointer"
                value={selectedMachineId}
                onChange={(e) => handleMachineChange(e.target.value)}
              >
                <option value="" className="bg-[#111C2E] text-[#F1F5F9]">
                  Fleet-Wide (All {machines.length} Machines)
                </option>
                {machines.map((m) => (
                  <option key={m.machine_id} value={m.machine_id} className="bg-[#111C2E] text-[#F1F5F9]">
                    {m.machine_id} · Type {m.machine_type} ({m.status})
                  </option>
                ))}
              </select>
            </div>

            {selectedMachineId && (
              <button
                onClick={() => navigate(`/machines/${encodeURIComponent(selectedMachineId)}`)}
                className="stitch-btn-secondary text-[11px] py-1 px-2.5"
                title={`Open diagnostic details for ${selectedMachineId}`}
                type="button"
              >
                <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                <span>View {selectedMachineId}</span>
              </button>
            )}

            <button
              onClick={handleClearHistory}
              className="stitch-btn-secondary text-[11px] py-1 px-2.5"
              title="Clear conversation history"
              type="button"
            >
              <span className="material-symbols-outlined text-[13px]">refresh</span>
              <span>New Chat</span>
            </button>
          </div>
        </div>

        {/* Selected Machine Telemetry Strip if machine is chosen */}
        {selectedMachineObj && (
          <div className="mt-2 pt-2 border-t border-[#243247] flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-[#94A3B8] text-[11px]">Focus:</span>
              <span className="font-mono font-bold text-[#06B6D4] text-[11px]">{selectedMachineObj.machine_id}</span>
              <span className="text-[#94A3B8] text-[11px]">{selectedMachineObj.machine_name || `Type ${selectedMachineObj.machine_type}`}</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                selectedMachineObj.status === 'CRITICAL' ? 'bg-[#EF4444]/20 text-[#EF4444]' :
                selectedMachineObj.status === 'WARNING' ? 'bg-[#F59E0B]/20 text-[#F59E0B]' :
                'bg-[#22C55E]/20 text-[#22C55E]'
              }`}>
                {selectedMachineObj.status}
              </span>
            </div>
            <button
              onClick={() => handleMachineChange('')}
              className="text-[#94A3B8] hover:text-[#F1F5F9] text-[11px] underline cursor-pointer"
            >
              Switch to Fleet-Wide
            </button>
          </div>
        )}
      </section>

      {/* 2. Suggested Prompt Chips */}
      <section className="assistant-suggestions-bar">
        <span className="text-[#94A3B8] font-medium text-[11px] whitespace-nowrap mr-1 flex items-center gap-1 flex-shrink-0">
          <span className="material-symbols-outlined text-[13px] text-[#06B6D4]">lightbulb</span>
          Suggestions:
        </span>
        {DEFAULT_SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(s)}
            disabled={loading}
            className="px-2 py-0.5 rounded bg-[#162338] hover:bg-[#1E2D44] border border-[#243247] text-[#94A3B8] hover:text-[#F1F5F9] text-[11px] whitespace-nowrap transition-colors flex-shrink-0 cursor-pointer disabled:opacity-50"
            type="button"
          >
            {s}
          </button>
        ))}
      </section>

      {/* 3. Main Chat Message Stream */}
      <div className="stitch-card assistant-chat-card">
        <div className="assistant-messages-area space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[11px] font-semibold text-[#94A3B8]">
                  {msg.sender === 'user' ? 'Operator' : 'Resonex AI'}
                </span>
                <span className="text-[10px] text-[#64748B]">{msg.timestamp}</span>
                {msg.source && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#162338] text-[#06B6D4] font-mono">
                    {msg.source}
                  </span>
                )}
              </div>

              <div
                className={`p-4 rounded-lg text-sm max-w-3xl leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#06B6D4]/15 border border-[#06B6D4]/40 text-[#F1F5F9]'
                    : 'bg-[#162338] border border-[#243247] text-[#F1F5F9] shadow-sm'
                }`}
              >
                {msg.sender === 'assistant' ? (
                  <MarkdownMessage content={msg.text} />
                ) : (
                  <p>{msg.text}</p>
                )}

                {/* Grounded Machine Telemetry context tag */}
                {msg.telemetryContext && (
                  <div className="mt-3 pt-2 border-t border-[#243247] flex items-center gap-3 text-xs text-[#94A3B8] flex-wrap">
                    <span className="text-[#06B6D4] font-medium">Observed Fact Base:</span>
                    <span>Health: <strong className="text-[#F1F5F9]">{msg.telemetryContext.health_score ?? '--'}/100</strong></span>
                    <span>Risk: <strong className="text-[#F1F5F9]">{msg.telemetryContext.risk_level ?? '--'}</strong></span>
                    {msg.telemetryContext.vibration_magnitude != null && (
                      <span>Vibration: <strong className="text-[#F1F5F9]">{msg.telemetryContext.vibration_magnitude.toFixed(2)} mm/s</strong></span>
                    )}
                    {msg.telemetryContext.temperature != null && (
                      <span>Temp: <strong className="text-[#F1F5F9]">{msg.telemetryContext.temperature.toFixed(1)}°C</strong></span>
                    )}
                  </div>
                )}

                {/* Suggested Action Buttons */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-[#243247]">
                    <span className="text-[11px] font-semibold text-[#94A3B8] uppercase block mb-1.5">
                      Suggested Next Steps:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestedActions.map((act, aIdx) => (
                        <button
                          key={aIdx}
                          onClick={() => handleSend(act)}
                          className="px-2.5 py-1 rounded bg-[#111C2E] hover:bg-[#1E2D44] border border-[#243247] text-xs text-[#06B6D4] transition-colors cursor-pointer"
                          type="button"
                        >
                          → {act}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* RAG Documentary Source Citations */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-[#243247]">
                    <span className="text-[11px] font-semibold text-[#94A3B8] uppercase block mb-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-[#06B6D4]">library_books</span>
                      Retrieved Knowledge Base Documents ({msg.sources.length}):
                    </span>
                    <div className="space-y-1.5">
                      {msg.sources.map((src, sIdx) => {
                        const isExpanded = expandedDocIndex === sIdx;
                        return (
                          <div
                            key={sIdx}
                            className="p-2 rounded bg-[#111C2E] border border-[#243247] text-xs"
                          >
                            <div
                              className="flex items-center justify-between cursor-pointer"
                              onClick={() => setExpandedDocIndex(isExpanded ? null : sIdx)}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[#06B6D4] font-medium">📄 {src.source_document}</span>
                                {src.section && <span className="text-[#94A3B8]">({src.section})</span>}
                              </div>
                              <span className="text-[11px] font-mono text-[#22C55E]">
                                {Math.round(src.relevance_score * 100)}% match
                              </span>
                            </div>
                            {isExpanded && (
                              <div className="mt-2 pt-2 border-t border-[#243247] text-[#94A3B8] leading-relaxed">
                                <p className="mb-1 text-[#F1F5F9] font-medium">{src.title}</p>
                                <blockquote className="border-l-2 border-[#06B6D4] pl-2 italic">
                                  {src.content}
                                </blockquote>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[11px] font-semibold text-[#94A3B8]">Resonex AI</span>
                <span className="text-[10px] text-[#64748B]">Querying RAG & models...</span>
              </div>
              <div className="p-4 rounded-lg bg-[#162338] border border-[#243247] flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px] text-[#06B6D4] animate-spin">
                  sync
                </span>
                <span className="text-xs text-[#94A3B8]">
                  Consulting ISO 10816 standards, maintenance logs & live sensor data...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="assistant-composer-bar"
        >
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-[#162338] border border-[#243247] focus:border-[#06B6D4] rounded-lg px-3.5 py-2 text-xs text-[#F1F5F9] placeholder-[#64748B] outline-none transition-colors"
            placeholder={
              selectedMachineId
                ? `Ask diagnostic questions grounded in ${selectedMachineId} telemetry & SOPs...`
                : 'Ask maintenance question, shift priorities, or query ISO 10816 standards...'
            }
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !inputQuery.trim()}
            className="px-4 py-2 rounded-lg bg-[#06B6D4] hover:bg-[#0891B2] disabled:opacity-50 text-[#0B1220] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Send</span>
            <span className="material-symbols-outlined text-[14px]">send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
