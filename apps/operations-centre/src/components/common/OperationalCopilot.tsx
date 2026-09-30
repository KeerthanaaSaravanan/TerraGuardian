import React, { useState, useEffect, useRef } from "react";
import { apiClient } from "../../services/apiClient";
import {
  IconAlertTriangle,
  IconExternalLink,
  IconInfo,
  IconMic,
  IconMicOff,
  IconSend,
  IconShieldAlert,
  IconSparkles,
  IconX,
} from "../icons";

interface OperationalCopilotProps {
  currentIncidentCode?: string;
  currentView?: string;
  onNavigateView?: (view: string, payload?: any) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface CopilotResponse {
  query: string;
  intent: string;
  intent_name: string;
  interpreted_as: string;
  is_statutory: boolean;
  statutory_guardrail_triggered: boolean;
  parameters: Record<string, any>;
  action?: {
    type: string;
    target_view?: string;
    incident_code?: string;
    payload?: Record<string, any>;
  };
  answer: string;
  evidence_sources: string[];
  confidence: number;
  suggested_next_commands: string[];
}

const PRESET_COMMANDS = [
  { label: "Why is TG-2048 P1?", category: "Consequence" },
  { label: "Show evidence convergence for TG-2048", category: "Evidence" },
  { label: "What changed since last assessment?", category: "Telemetry" },
  { label: "What is missing before intervention?", category: "Uncertainty" },
  { label: "Filter map to Arunachal Pradesh", category: "GIS" },
  { label: "Show Priority Queue", category: "Queue" },
  { label: "Explain NBI for TG-2048", category: "Next Best Info" },
  { label: "Show incident replay", category: "Replay" },
  { label: "What is SDRF field status?", category: "Response" },
  { label: "Show all P1 incidents", category: "Queue" },
  { label: "Open TG-2048", category: "Twin" },
  { label: "Authorize evacuation", category: "Guardrail Test" },
  { label: "Unknown command test", category: "Registry Test" },
];

export const OperationalCopilot: React.FC<OperationalCopilotProps> = ({
  currentIncidentCode = "TG-2048",
  currentView = "situational-overview",
  onNavigateView,
  isOpen,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<CopilotResponse | null>(null);
  const [history, setHistory] = useState<Array<{ q: string; r: CopilotResponse }>>([]);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechStatus, setSpeechStatus] = useState<string>("READY");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check Web Speech API support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-IN";

        recognition.onstart = () => {
          setIsListening(true);
          setSpeechStatus("LISTENING");
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setQuery(transcript);
          setIsListening(false);
          setSpeechStatus("TRANSCRIBED");
          handleExecuteQuery(transcript);
        };

        recognition.onerror = (event: any) => {
          setIsListening(false);
          setSpeechStatus(`VOICE UNAVAILABLE — TEXT COMMAND MODE (${event.error || "Permission Denied"})`);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } catch (err) {
        setSpeechSupported(false);
        setSpeechStatus("VOICE UNAVAILABLE — TEXT COMMAND MODE");
      }
    } else {
      setSpeechSupported(false);
      setSpeechStatus("VOICE UNAVAILABLE — TEXT COMMAND MODE");
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [response, isLoading]);

  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) {
      setSpeechStatus("VOICE UNAVAILABLE — TEXT COMMAND MODE");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setSpeechStatus("READY");
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        setIsListening(false);
        setSpeechStatus("VOICE UNAVAILABLE — TEXT COMMAND MODE");
      }
    }
  };

  const handleExecuteQuery = async (queryText: string) => {
    const textToRun = queryText.trim();
    if (!textToRun) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await apiClient.queryCopilot(
        textToRun,
        currentIncidentCode,
        currentView,
        { timestamp: new Date().toISOString() }
      );
      setResponse(res);
      setHistory((prev) => [...prev, { q: textToRun, r: res }]);
      setQuery("");

      // Automatically execute UI state change if recommended and not statutory blocked
      if (res.action && onNavigateView) {
        if (res.action.type === "NAVIGATE" && res.action.target_view) {
          onNavigateView(res.action.target_view, res.action.payload);
        } else if (res.action.type === "FILTER_MAP") {
          onNavigateView("tactical-map", res.action.payload);
        } else if (res.action.type === "OPEN_INCIDENT") {
          onNavigateView("incident-twin", { incident_code: res.action.incident_code });
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to contact Operational Copilot service.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleExecuteQuery(query);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-slate-900/98 backdrop-blur-xl border-l border-slate-800 shadow-2xl z-50 flex flex-col transition-all duration-300"
      role="dialog"
      aria-label="Operational Copilot"
    >
      {/* ── COPILOT HEADER ── */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <IconSparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-white tracking-wide uppercase">Operational Copilot</h2>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                READ-ONLY ADVISORY
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Bounded Operational Intel & Automated State Dispatch</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
          aria-label="Close Copilot"
        >
          <IconX className="w-4 h-4" />
        </button>
      </div>

      {/* ── STATUTORY GUARDRAIL DISCLOSURE BANNER ── */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-start space-x-2">
        <IconShieldAlert className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-amber-300 leading-tight">
          <span className="font-semibold">Guardrail Active:</span> Statutory actions (evacuation orders, closures) require human authorization (NDMA Act 2005 §34).
        </p>
      </div>

      {/* ── CONVERSATION / RESPONSE STREAM ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.length === 0 && !response && (
          <div className="text-center py-8 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-indigo-400">
              <IconSparkles className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">Incident Commander Operational Copilot</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Execute operational commands, inspect consequence formulas, verify sensor convergence, or query incident telemetry.
            </p>
          </div>
        )}

        {/* Prior messages */}
        {history.map((item, idx) => (
          <div key={idx} className="space-y-3 pb-3 border-b border-slate-800/60 last:border-b-0">
            {/* User command bubble */}
            <div className="flex justify-end">
              <div className="bg-indigo-600/30 border border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-white max-w-[85%] font-medium">
                {item.q}
              </div>
            </div>

            {/* Visible Interpretation Card */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-xs space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1.5 border-b border-slate-800/80">
                <span className="font-mono text-indigo-300 font-medium">
                  COMMAND: <span className="text-white">"{item.q}"</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {item.r.intent}
                </span>
              </div>

              {/* INTERPRETED AS line */}
              <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 px-2 py-1 rounded">
                INTERPRETED AS: {item.r.interpreted_as}
              </div>

              {/* Statutory alert banner if triggered */}
              {item.r.statutory_guardrail_triggered && (
                <div className="bg-rose-950/40 border border-rose-600/50 rounded p-2 text-rose-200 text-xs flex items-start space-x-2">
                  <IconShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-rose-300">STATUTORY GATE TRIGGERED:</span>
                    <p className="mt-0.5 text-[11px] leading-relaxed">{item.r.answer}</p>
                    {onNavigateView && (
                      <button
                        onClick={() => onNavigateView("incident-twin", { tab: "action-execution" })}
                        className="mt-2 inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-rose-600/40 hover:bg-rose-600/60 border border-rose-500 text-white font-medium text-[11px] transition-colors"
                      >
                        <span>Open Action Execution Gate</span>
                        <IconExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Standard Answer */}
              {!item.r.statutory_guardrail_triggered && (
                <div className="text-slate-200 text-xs leading-relaxed whitespace-pre-line">
                  {item.r.answer}
                </div>
              )}

              {/* Evidence Lineage Sources */}
              {item.r.evidence_sources && item.r.evidence_sources.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center space-x-1">
                    <IconInfo className="w-3 h-3 text-cyan-400" />
                    <span>Evidence Lineage Grounding</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {item.r.evidence_sources.map((src, sIdx) => (
                      <span
                        key={sIdx}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800/90 text-cyan-300 border border-slate-700 font-mono"
                      >
                        {src}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Suggested Commands */}
              {item.r.suggested_next_commands && item.r.suggested_next_commands.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-1.5">
                  {item.r.suggested_next_commands.map((cmd, cIdx) => (
                    <button
                      key={cIdx}
                      onClick={() => handleExecuteQuery(cmd)}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 hover:bg-indigo-900/40 hover:text-indigo-200 border border-slate-700 text-slate-300 transition-colors"
                    >
                      {cmd} →
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center space-x-2 text-xs text-indigo-400 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <IconSparkles className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Operational Copilot evaluating command against authoritative telemetry...</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-600/40 text-rose-300 text-xs flex items-center space-x-2">
            <IconAlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── QUICK SUGGESTION CHIPS TRAY ── */}
      <div className="p-2.5 bg-slate-950/60 border-t border-slate-800">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span>Demonstration Commands (1-Click)</span>
          <span className="text-[9px] text-indigo-400 font-mono">13 HIGH-VALUE INTENTS</span>
        </div>
        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
          {PRESET_COMMANDS.map((cmd, idx) => (
            <button
              key={idx}
              onClick={() => handleExecuteQuery(cmd.label)}
              className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                cmd.category === "Guardrail Test"
                  ? "bg-rose-950/30 border-rose-800/50 text-rose-300 hover:bg-rose-900/40"
                  : cmd.category === "Consequence" || cmd.category === "Evidence"
                  ? "bg-indigo-950/40 border-indigo-800/50 text-indigo-300 hover:bg-indigo-900/50"
                  : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {cmd.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── SPEECH STATUS BAR ── */}
      <div className="px-3 py-1 bg-slate-950 text-[10px] font-mono flex items-center justify-between border-t border-slate-800/80 text-slate-400">
        <span className="flex items-center space-x-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isListening
                ? "bg-rose-500 animate-ping"
                : speechSupported
                ? "bg-emerald-500"
                : "bg-amber-500"
            }`}
          />
          <span>{speechStatus}</span>
        </span>
        <span>ACTIVE TWIN: {currentIncidentCode}</span>
      </div>

      {/* ── INPUT BAR ── */}
      <form onSubmit={handleSubmit} className="p-3 bg-slate-950 border-t border-slate-800 flex items-center space-x-2">
        <button
          type="button"
          onClick={toggleListening}
          className={`p-2 rounded-lg border transition-colors ${
            isListening
              ? "bg-rose-600 text-white border-rose-500 animate-pulse"
              : speechSupported
              ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
              : "bg-slate-800/50 text-slate-500 border-slate-800 cursor-not-allowed"
          }`}
          title={speechSupported ? (isListening ? "Stop Listening" : "Start Voice Input") : "Voice Unsupported in this Browser"}
        >
          {isListening ? <IconMicOff className="w-4 h-4" /> : <IconMic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            isListening ? "Listening... Speak your operational command..." : "Type operational command or select preset..."
          }
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />

        <button
          type="submit"
          disabled={!query.trim() || isLoading}
          className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium transition-colors"
          aria-label="Send Command"
        >
          <IconSend className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
