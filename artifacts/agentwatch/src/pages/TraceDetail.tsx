import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useRoute } from "wouter";
import {
  ArrowLeft, ChevronDown, ChevronUp, AlertTriangle, CheckCircle,
  Clock, Cpu, Wrench, Brain, Search, Loader2
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { fetchRunDetail, getStoredApiKey } from "../lib/api";

type StepRow = {
  id?: string;
  step_index: number;
  step_type: string;
  input: string;
  output: string;
  model: string;
  latency_ms: number;
  tokens: number;
  tool_calls: Array<{ name?: string; result?: string }>;
  status: string;
  flags: Array<{
    flag_type: string;
    severity: string;
    reason?: string;
    deep_analysis?: Record<string, unknown>;
  }>;
};

export default function TraceDetail() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/dashboard/traces/:runId");
  const runId = params?.runId ? decodeURIComponent(params.runId) : "";
  const hasKey = !!getStoredApiKey();

  const { data, isLoading, error } = useQuery({
    queryKey: ["trace-run", runId],
    queryFn: () => fetchRunDetail(runId),
    enabled: hasKey && !!runId && !!match,
    retry: 1,
  });

  if (!match) {
    return (
      <DashboardLayout>
        <div className="text-white/40">Invalid route</div>
      </DashboardLayout>
    );
  }

  if (!hasKey) {
    return (
      <DashboardLayout>
        <button
          type="button"
          onClick={() => navigate("/dashboard/traces")}
          className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Traces
        </button>
        <p className="text-white/40">Add an API key under API Keys to view trace detail.</p>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center gap-2 text-white/40">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading run…
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <button
          type="button"
          onClick={() => navigate("/dashboard/traces")}
          className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Traces
        </button>
        <p className="text-red-400/80">{(error as Error)?.message || "Run not found"}</p>
      </DashboardLayout>
    );
  }

  const steps = (data.steps || []) as StepRow[];
  const totalDuration = steps.reduce((s, st) => s + (st.latency_ms || 0), 0);
  const isFlagged = steps.some((s) => s.status === "flagged");

  return (
    <DashboardLayout>
      <button
        type="button"
        onClick={() => navigate("/dashboard/traces")}
        className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Traces
      </button>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/3 border border-white/8 rounded-2xl p-6 mb-6"
      >
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="font-mono text-white text-lg font-bold break-all">{data.run_id}</span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                isFlagged
                  ? "bg-red-600/15 text-red-400 border-red-600/30"
                  : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              }`}>
                {isFlagged ? "FLAGGED" : "OK"}
              </span>
            </div>
            <p className="text-white/40 text-sm">
              Agent: <span className="text-white/70 font-medium">{data.agent_name}</span>
            </p>
          </div>

          <div className="flex items-center gap-6 text-right">
            {[
              { label: "Steps", value: steps.length },
              { label: "Duration", value: `${totalDuration}ms` },
              {
                label: "Time",
                value: data.created_at
                  ? new Date(data.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "—",
              },
            ].map((m) => (
              <div key={m.label}>
                <div className="text-white/30 text-xs">{m.label}</div>
                <div className="text-white font-bold font-mono text-sm">{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="space-y-4">
        {steps.map((step, i) => (
          <StepCard key={step.id || i} step={step} index={i} />
        ))}
      </div>
    </DashboardLayout>
  );
}

function StepCard({ step, index }: { step: StepRow; index: number }) {
  const [expanded, setExpanded] = useState(step.status === "flagged");
  const isFlagged = step.status === "flagged";
  const isToolCall = step.step_type === "tool_call";
  const f0 = step.flags?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={`border rounded-2xl overflow-hidden transition-all ${
        isFlagged
          ? "border-red-500/30 bg-red-950/10"
          : "border-white/8 bg-white/3"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-white/3 transition-colors"
      >
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border ${
          isFlagged
            ? "bg-red-600/20 text-red-400 border-red-500/40"
            : "bg-white/5 text-white/50 border-white/10"
        }`}>
          {index + 1}
        </div>

        <div className={`p-1.5 rounded-lg ${isToolCall ? "bg-blue-500/10" : "bg-purple-500/10"}`}>
          {isToolCall
            ? <Wrench className="w-3.5 h-3.5 text-blue-400" />
            : <Brain className="w-3.5 h-3.5 text-purple-400" />
          }
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white/80 text-sm font-medium">
              {isToolCall ? "Tool Call" : "LLM Call"}
            </span>
            {step.model && (
              <span className="text-[10px] font-mono text-white/25 bg-white/5 px-1.5 py-0.5 rounded">
                {step.model}
              </span>
            )}
            {isFlagged && f0 && (
              <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-600/15 border border-red-600/25 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                {f0.flag_type}
              </span>
            )}
          </div>
          {isFlagged && f0?.reason && (
            <p className="text-red-400/70 text-xs mt-1 line-clamp-1">{f0.reason}</p>
          )}
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-1 text-white/30 text-xs">
            <Clock className="w-3 h-3" />
            <span className="font-mono">{step.latency_ms}ms</span>
          </div>
          {step.tokens > 0 && (
            <div className="flex items-center gap-1 text-white/30 text-xs">
              <Cpu className="w-3 h-3" />
              <span className="font-mono">{step.tokens}t</span>
            </div>
          )}
          <div className={`w-5 h-5 rounded flex items-center justify-center ${isFlagged ? "text-red-400" : "text-emerald-400"}`}>
            {isFlagged ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-4 border-t border-white/5 pt-4">
              {isFlagged && f0?.deep_analysis && (
                <div className="bg-purple-950/20 border border-purple-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Search className="w-4 h-4 text-purple-400" />
                    <span className="text-purple-300 text-sm font-bold">LLM analysis</span>
                    <span className="ml-auto text-[10px] font-mono text-purple-400/60 bg-purple-500/10 border border-purple-500/15 px-2 py-0.5 rounded">
                      {Math.round(Number((f0.deep_analysis as { confidence?: number }).confidence ?? 0) * 100)}% confidence
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    {[
                      { label: "What went wrong", key: "what_went_wrong", color: "text-red-300" },
                      { label: "Root cause", key: "root_cause", color: "text-amber-300" },
                      { label: "Suggested fix", key: "suggested_fix", color: "text-emerald-300" },
                    ].map((row) => {
                      const analysis = f0.deep_analysis as Record<string, string> | undefined;
                      return (
                        <div key={row.key} className="flex gap-2">
                          <span className="text-white/30 w-28 flex-shrink-0">{row.label}:</span>
                          <span className={`${row.color}/80 leading-relaxed`}>{analysis?.[row.key]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isFlagged && f0 && (
                <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 text-sm font-bold">
                      {f0.flag_type.replace(/_/g, " ").toUpperCase()}
                    </span>
                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded border ${
                      f0.severity === "high"
                        ? "bg-red-600/20 text-red-400 border-red-600/30"
                        : "bg-amber-500/15 text-amber-400 border-amber-500/25"
                    }`}>
                      {f0.severity.toUpperCase()}
                    </span>
                  </div>
                  {f0.reason && <p className="text-red-300/70 text-xs leading-relaxed">{f0.reason}</p>}
                </div>
              )}

              <div>
                <div className="text-xs text-white/30 font-medium mb-2 uppercase tracking-wider">Input</div>
                <div className="bg-[#020202] border border-white/6 rounded-xl p-4 font-mono text-xs text-white/50 leading-relaxed max-h-36 overflow-y-auto">
                  {step.input}
                </div>
              </div>

              <div>
                <div className="text-xs text-white/30 font-medium mb-2 uppercase tracking-wider">Output</div>
                <div className={`bg-[#020202] border rounded-xl p-4 font-mono text-xs leading-relaxed max-h-36 overflow-y-auto ${
                  isFlagged ? "border-red-600/15 text-red-200/50" : "border-white/6 text-white/50"
                }`}>
                  {step.output}
                </div>
              </div>

              {step.tool_calls && step.tool_calls.length > 0 && (
                <div>
                  <div className="text-xs text-white/30 font-medium mb-2 uppercase tracking-wider">Tool Calls</div>
                  {step.tool_calls.map((tc, i) => (
                    <div key={i} className="bg-blue-950/15 border border-blue-500/15 rounded-xl p-3 font-mono text-xs text-blue-300/60">
                      <span className="text-blue-400 font-bold">{tc.name || "tool"}</span>
                      {" → "}
                      <span>{tc.result ?? ""}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
