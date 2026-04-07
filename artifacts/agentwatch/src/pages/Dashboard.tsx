import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  Activity, AlertTriangle, CheckCircle, Clock, Copy, Check,
  TrendingUp, Zap, ArrowUpRight, Terminal, Loader2
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useAuth } from "../lib/auth-context";
import { fetchStats, fetchTraces, getStoredApiKey } from "../lib/api";
import { mockLatencyData } from "../lib/mock-data";

const staggerChild = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }
  }),
};

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const hasKey = !!getStoredApiKey();

  const statsQuery = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    enabled: hasKey,
    retry: 1,
  });

  const tracesQuery = useQuery({
    queryKey: ["traces", "recent"],
    queryFn: () => fetchTraces({ limit: 8, offset: 0 }),
    enabled: hasKey,
    retry: 1,
    // Stats can succeed while /v1/traces fails (e.g. Firestore index). Refetch traces when stats load.
    refetchOnMount: "always",
  });

  // Stats can load before /v1/traces returns runs (race) or traces cache can be stale after first trace.
  useEffect(() => {
    if (!hasKey || !statsQuery.isSuccess) return;
    const total = statsQuery.data?.total_traces ?? 0;
    if (total > 0) {
      queryClient.invalidateQueries({ queryKey: ["traces", "recent"] });
    }
  }, [hasKey, statsQuery.isSuccess, statsQuery.data?.total_traces, queryClient]);

  const s = statsQuery.data;
  const stats = [
    { label: "Total Traces", value: (s?.total_traces ?? 0).toLocaleString(), color: "text-white", icon: <Activity className="w-5 h-5" />, bg: "bg-white/5" },
    { label: "Flagged", value: s?.flagged_traces ?? 0, color: "text-red-400", icon: <AlertTriangle className="w-5 h-5" />, bg: "bg-red-600/8" },
    { label: "Healthy", value: (s?.ok_traces ?? 0).toLocaleString(), color: "text-emerald-400", icon: <CheckCircle className="w-5 h-5" />, bg: "bg-emerald-500/8" },
    { label: "Flags (24h)", value: s?.last_24h?.flagged ?? s?.flags_today ?? 0, color: "text-amber-400", icon: <Zap className="w-5 h-5" />, bg: "bg-amber-500/8" },
  ];

  const recentRuns = tracesQuery.data?.traces ?? [];

  const initCode = `import agentwatch

agentwatch.init(
    api_key="${getStoredApiKey() || "aw_your_key_here"}",
    agent_name="my-agent"
)
# That's it — all LLM calls are now monitored`;

  const copyCode = () => {
    navigator.clipboard.writeText(initCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout>
      <motion.div custom={0} initial="hidden" animate="show" variants={staggerChild} className="mb-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">
              Good morning{user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}
            </h1>
            <p className="text-white/40 text-sm mt-1">Your agent health overview</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-white/4 border border-white/8 rounded-lg px-3 py-2">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Live</span>
            </div>
          </div>
        </div>
      </motion.div>

      {!hasKey && (
        <div className="mb-6 p-4 rounded-xl border border-amber-500/25 bg-amber-500/5 text-amber-200/90 text-sm">
          Add an <button type="button" className="underline font-medium" onClick={() => navigate("/dashboard/keys")}>API key</button>{" "}
          and store it in this browser so the dashboard can load traces from the AgentWatch API.
        </div>
      )}

      {hasKey && statsQuery.isError && (
        <div className="mb-6 p-4 rounded-xl border border-red-500/25 bg-red-500/5 text-red-300 text-sm">
          Could not reach API ({(statsQuery.error as Error)?.message}). Check VITE_API_URL and that the server is running.
        </div>
      )}

      {hasKey && tracesQuery.isError && !tracesQuery.isLoading && (
        <div className="mb-6 p-4 rounded-xl border border-amber-500/25 bg-amber-500/5 text-amber-200/90 text-sm">
          Could not load recent runs ({(tracesQuery.error as Error)?.message}). Stats may still show totals; fix{" "}
          <code className="text-white/70 font-mono">GET /v1/traces</code> (often a Firestore query/index issue on the API).
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((st, i) => (
          <motion.div
            key={st.label}
            custom={i + 1}
            initial="hidden"
            animate="show"
            variants={staggerChild}
            className={`${st.bg} border border-white/8 rounded-2xl p-5 card-hover`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/30 text-xs font-medium">{st.label}</span>
              <span className={`${st.color} opacity-60`}>{st.icon}</span>
            </div>
            <div className={`text-3xl font-black ${st.color} flex items-center gap-2`}>
              {hasKey && (statsQuery.isLoading || tracesQuery.isLoading) ? (
                <Loader2 className="w-6 h-6 animate-spin text-white/30" />
              ) : (
                st.value
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <motion.div
          custom={5}
          initial="hidden"
          animate="show"
          variants={staggerChild}
          className="col-span-2 bg-white/3 border border-white/8 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-white font-bold text-sm">Latency Trend</h2>
              <p className="text-white/30 text-xs mt-0.5">Illustrative · connect traces for live charts</p>
            </div>
            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg">
              <Clock className="w-3 h-3 text-white/40" />
              <span className="text-white/50 text-xs">demo curve</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={mockLatencyData} margin={{ top: 5, right: 5, bottom: 0, left: -30 }}>
              <defs>
                <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 11 }}
                labelStyle={{ color: "rgba(255,255,255,0.5)" }}
              />
              <Area type="monotone" dataKey="latency" stroke="#ef4444" strokeWidth={2} fill="url(#latGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          custom={6}
          initial="hidden"
          animate="show"
          variants={staggerChild}
          className="bg-white/3 border border-white/8 rounded-2xl p-6"
        >
          <h2 className="text-white font-bold text-sm mb-5">Quick Metrics</h2>
          <div className="space-y-4">
            {[
              { label: "Traces (24h)", value: String(s?.last_24h?.traces ?? "—"), pct: 40 },
              { label: "Flag rate", value: s?.total_traces ? `${((s.flagged_traces / s.total_traces) * 100).toFixed(1)}%` : "—", pct: 18 },
              { label: "Flag types", value: String(Object.keys(s?.flags_by_type ?? {}).length), pct: 30 },
            ].map((m) => (
              <div key={m.label}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-white/40">{m.label}</span>
                  <span className="text-white/80 font-mono font-medium">{m.value}</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${m.pct}%` }}
                    transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full bg-red-600 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div custom={7} initial="hidden" animate="show" variants={staggerChild}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold">Recent Agent Runs</h2>
          <button
            type="button"
            onClick={() => navigate("/dashboard/traces")}
            className="flex items-center gap-1 text-xs text-white/40 hover:text-red-400 transition-colors"
          >
            View all <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {["Status", "Run ID", "Agent", "Steps", "Duration", "Time", "Flags"].map((h) => (
                  <th key={h} className="text-left text-[11px] text-white/30 font-medium px-5 py-3 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((run, i) => (
                <motion.tr
                  key={run.run_id ? `${run.run_id}-${i}` : `run-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  onClick={() => navigate(`/dashboard/traces/${run.run_id}`)}
                  className="border-b border-white/4 hover:bg-white/3 cursor-pointer transition-colors group"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${run.status === "ok" ? "bg-emerald-500" : "bg-red-500"}`} />
                      <span className={`text-xs font-medium ${run.status === "ok" ? "text-emerald-400" : "text-red-400"}`}>
                        {run.status.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs text-white/50 group-hover:text-white/70 transition-colors">
                      {run.run_id ? `${String(run.run_id).slice(0, 14)}…` : "—"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs text-white/70">{run.agent_name}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs text-white/50">{run.steps}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-mono text-white/50">{run.latency_ms}ms</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs text-white/30">
                      {run.created_at ? new Date(run.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {run.flags.length > 0 ? (
                      <span className={`inline-flex text-[10px] font-mono px-2 py-0.5 rounded border ${
                        run.flags[0].severity === "high"
                          ? "bg-red-600/15 text-red-400 border-red-600/25"
                          : "bg-amber-500/15 text-amber-400 border-amber-500/25"
                      }`}>
                        {run.flags[0].flag_type}
                      </span>
                    ) : (
                      <span className="text-white/20 text-xs">—</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {hasKey && recentRuns.length === 0 && !tracesQuery.isLoading && (
            <div className="text-center py-8 text-white/30 text-sm">No traces yet. Send one from the SDK.</div>
          )}
        </div>
      </motion.div>

      <motion.div custom={8} initial="hidden" animate="show" variants={staggerChild} className="mt-8">
        <div className="bg-white/2 border border-white/8 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-red-500" />
              <h3 className="text-white font-bold text-sm">Add to your agent</h3>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="bg-[#020202] border border-white/6 rounded-xl p-4 font-mono text-xs text-white/60 leading-relaxed whitespace-pre">
            {initCode}
          </div>
          <p className="text-white/25 text-xs mt-3">
            Install: <span className="text-white/40 font-mono">pip install agentwatch-io</span>{" "}
            <span className="text-white/20">(or </span>
            <span className="text-white/35 font-mono">pip install -e ./agentwatch-sdk</span>
            <span className="text-white/20"> from the repo)</span>
          </p>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
