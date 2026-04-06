import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Bell, Slack, Mail, AlertTriangle, Save, Loader2, CheckCircle } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { fetchStats, fetchUserMe, patchUserMe, getStoredApiKey } from "../lib/api";

const ALL_FLAGS = ["hallucination", "error_swallowed", "latency_spike", "empty_output"] as const;

export default function Alerts() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [slack, setSlack] = useState("");
  const [saved, setSaved] = useState(false);
  const [thresholds, setThresholds] = useState<Record<string, boolean>>({
    hallucination: true,
    error_swallowed: true,
    latency_spike: false,
    empty_output: false,
  });

  const userQ = useQuery({ queryKey: ["user-me"], queryFn: fetchUserMe });
  const statsQ = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    enabled: !!getStoredApiKey(),
    retry: 1,
  });

  useEffect(() => {
    const u = userQ.data?.user;
    if (!u) return;
    setEmail(String(u.alert_email || u.email || ""));
    setSlack(String(u.slack_webhook || ""));
    const types = u.alert_flag_types as string[] | undefined;
    if (Array.isArray(types)) {
      const next: Record<string, boolean> = {};
      for (const f of ALL_FLAGS) {
        next[f] = types.includes(f);
      }
      setThresholds(next);
    }
  }, [userQ.data]);

  const mut = useMutation({
    mutationFn: () =>
      patchUserMe({
        alert_email: email.trim() || undefined,
        slack_webhook: slack.trim() || undefined,
        alert_flag_types: ALL_FLAGS.filter((f) => thresholds[f]),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-me"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const byType = statsQ.data?.flags_by_type || {};
  const maxCount = Math.max(1, ...Object.values(byType).map(Number));

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">Alerts</h1>
        <p className="text-white/40 text-sm mt-1">Configure where and when to get notified</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/3 border border-white/8 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Mail className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <div className="text-white font-bold text-sm">Email Alerts</div>
                <div className="text-white/30 text-xs">Get notified when agents are flagged</div>
              </div>
            </div>
            <label className="block text-white/40 text-xs font-medium mb-2">Alert email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alerts@yourcompany.com"
              className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-600/40 transition-all"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="bg-white/3 border border-white/8 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Slack className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <div className="text-white font-bold text-sm">Slack Alerts</div>
                <div className="text-white/30 text-xs">Post to a Slack channel via webhook</div>
              </div>
            </div>
            <label className="block text-white/40 text-xs font-medium mb-2">Slack webhook URL</label>
            <input
              type="url"
              value={slack}
              onChange={(e) => setSlack(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-600/40 transition-all"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="bg-white/3 border border-white/8 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-red-600/10 border border-red-600/20 flex items-center justify-center">
                <Bell className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <div className="text-white font-bold text-sm">Alert Triggers</div>
                <div className="text-white/30 text-xs">Which flag types should trigger an alert</div>
              </div>
            </div>

            <div className="space-y-3">
              {(Object.keys(thresholds) as Array<keyof typeof thresholds>).map((key) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer group">
                  <button
                    type="button"
                    onClick={() => setThresholds((t) => ({ ...t, [key]: !t[key] }))}
                    className={`w-10 h-5 rounded-full border transition-all relative ${
                      thresholds[key]
                        ? "bg-red-600 border-red-600"
                        : "bg-white/5 border-white/15"
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                      thresholds[key] ? "left-5" : "left-0.5"
                    }`} />
                  </button>
                  <div className="flex-1">
                    <div className="text-white/70 text-sm font-mono">{key.replace(/_/g, " ")}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    key === "hallucination" || key === "error_swallowed"
                      ? "text-red-400 bg-red-600/10 border-red-600/20"
                      : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                  }`}>
                    {key === "hallucination" || key === "error_swallowed" ? "HIGH" : "MEDIUM"}
                  </span>
                </label>
              ))}
            </div>
          </motion.div>

          <button
            type="button"
            onClick={() => mut.mutate()}
            disabled={mut.isPending || userQ.isLoading}
            className="flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white py-3 rounded-xl font-semibold text-sm transition-all hover:shadow-lg hover:shadow-red-600/25"
          >
            {mut.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {mut.isPending ? "Saving..." : saved ? "Saved!" : "Save Settings"}
          </button>
        </div>

        <div className="space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/3 border border-white/8 rounded-2xl p-6"
          >
            <h3 className="text-white font-bold text-sm mb-5">Flag Distribution</h3>
            {!getStoredApiKey() ? (
              <p className="text-white/30 text-sm">Add an API key to see aggregate stats.</p>
            ) : statsQ.isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white/30" />
            ) : (
              <div className="space-y-4">
                {Object.entries(byType).map(([type, count], i) => (
                  <div key={type}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-mono text-white/60">{type.replace(/_/g, " ")}</span>
                      <span className="font-bold text-white/80">{count}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(Number(count) / maxCount) * 100}%` }}
                        transition={{ delay: 0.3 + i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full rounded-full bg-red-500"
                      />
                    </div>
                  </div>
                ))}
                {Object.keys(byType).length === 0 && (
                  <p className="text-white/30 text-sm">No flags recorded yet.</p>
                )}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/3 border border-white/8 rounded-2xl p-6"
          >
            <h3 className="text-white font-bold text-sm mb-5">Recent Alerts Sent</h3>
            <p className="text-white/25 text-xs">
              Delivery logs are not stored in MVP. Use your email provider or Slack channel history.
            </p>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
