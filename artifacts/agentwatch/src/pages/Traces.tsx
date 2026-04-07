import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Search, Filter, ChevronRight, Loader2 } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { fetchTraces, getStoredApiKey, type TraceFlatRow } from "../lib/api";

export default function Traces() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "flagged" | "ok">("all");
  const hasKey = !!getStoredApiKey();

  const { data, isLoading, error } = useQuery({
    queryKey: ["traces", filter, "flat"],
    queryFn: () =>
      fetchTraces({
        limit: 100,
        offset: 0,
        status: filter === "all" ? undefined : filter,
        flat: true,
      }),
    enabled: hasKey,
    retry: 1,
  });

  const runs = data?.traces ?? [];
  const isFlat = (r: (typeof runs)[number]): r is TraceFlatRow =>
    typeof (r as TraceFlatRow).flags_count === "number";
  const filtered = runs.filter((r) => {
    const q = search.toLowerCase();
    const rid = (r.run_id || "").toLowerCase();
    const matchSearch =
      !q ||
      rid.includes(q) ||
      r.agent_name.toLowerCase().includes(q) ||
      (isFlat(r) && (r.model || "").toLowerCase().includes(q));
    return matchSearch;
  });

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">Traces</h1>
        <p className="text-white/40 text-sm mt-1">All agent run traces · sorted by latest</p>
      </div>

      {!hasKey && (
        <div className="mb-6 p-4 rounded-xl border border-amber-500/25 bg-amber-500/5 text-amber-200/90 text-sm">
          Store an API key from{" "}
          <button type="button" className="underline font-medium" onClick={() => navigate("/dashboard/keys")}>
            API Keys
          </button>{" "}
          to load traces.
        </div>
      )}

      {error && (
        <div className="mb-4 text-red-400 text-sm">{(error as Error).message}</div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by run ID or agent..."
            className="w-full bg-white/4 border border-white/8 text-white placeholder-white/25 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:border-red-600/40 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white/3 border border-white/8 rounded-xl p-1">
          {(["all", "flagged", "ok"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f
                  ? f === "flagged"
                    ? "bg-red-600/20 text-red-400 border border-red-600/25"
                    : f === "ok"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : "bg-white/10 text-white border border-white/15"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-white/30">
          <Filter className="w-3.5 h-3.5" />
          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : `${filtered.length} runs`}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden"
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {["Status", "Run ID", "Agent", "Model", "Step", "Latency", "Time", "Flags", ""].map((h) => (
                <th key={h} className="text-left text-[11px] text-white/30 font-medium px-5 py-3 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((run, i) => (
              <motion.tr
                key={isFlat(run) ? run.trace_id || `${run.run_id}-${i}` : run.run_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() =>
                  navigate(
                    `/dashboard/traces/${encodeURIComponent(run.run_id || (isFlat(run) ? run.trace_id || "" : ""))}`
                  )
                }
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
                <td className="px-5 py-4 font-mono text-xs text-white/50 group-hover:text-white/70 transition-colors">
                  {run.run_id ? `${run.run_id.slice(0, 20)}…` : isFlat(run) ? String(run.trace_id || "").slice(0, 12) : "—"}
                </td>
                <td className="px-5 py-4 text-xs text-white/70">{run.agent_name}</td>
                <td className="px-5 py-4 text-xs text-white/50 font-mono">
                  {isFlat(run) ? run.model || "—" : "—"}
                </td>
                <td className="px-5 py-4 text-xs text-white/50">
                  {isFlat(run) ? run.step_index : "steps" in run ? run.steps : "—"}
                </td>
                <td className="px-5 py-4 font-mono text-xs text-white/50">{run.latency_ms}ms</td>
                <td className="px-5 py-4 text-xs text-white/30">
                  {run.created_at ? new Date(run.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                </td>
                <td className="px-5 py-4">
                  {isFlat(run) ? (
                    run.flags_count > 0 ? (
                      <span className="text-amber-400/90 text-xs font-mono">{run.flags_count}</span>
                    ) : (
                      <span className="text-white/20 text-xs">0</span>
                    )
                  ) : "flags" in run && run.flags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {run.flags.map((f, fi) => (
                        <span
                          key={fi}
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            f.severity === "high"
                              ? "bg-red-600/15 text-red-400 border-red-600/25"
                              : "bg-amber-500/15 text-amber-400 border-amber-500/25"
                          }`}
                        >
                          {f.flag_type}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-white/20 text-xs">—</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-red-400 transition-colors" />
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && hasKey && !isLoading && (
          <div className="text-center py-12 text-white/30 text-sm">
            No traces match your search.
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
