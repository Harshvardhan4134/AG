import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Slack, Mail, AlertTriangle, Save, Loader2, CheckCircle } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { mockFlagDistribution } from "../lib/mock-data";

export default function Alerts() {
  const [email, setEmail] = useState("");
  const [slack, setSlack] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [thresholds, setThresholds] = useState({
    hallucination: true,
    error_swallowed: true,
    latency_spike: false,
    empty_output: false,
  });

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">Alerts</h1>
        <p className="text-white/40 text-sm mt-1">Configure where and when to get notified</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: config */}
        <div className="space-y-5">
          {/* Email */}
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

          {/* Slack */}
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

          {/* Flag thresholds */}
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
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white py-3 rounded-xl font-semibold text-sm transition-all hover:shadow-lg hover:shadow-red-600/25"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
          </button>
        </div>

        {/* Right: flag distribution */}
        <div className="space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/3 border border-white/8 rounded-2xl p-6"
          >
            <h3 className="text-white font-bold text-sm mb-5">Flag Distribution</h3>
            <div className="space-y-4">
              {mockFlagDistribution.map((f, i) => (
                <div key={f.type}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-mono text-white/60">{f.type.replace(/_/g, " ")}</span>
                    <span className="font-bold text-white/80">{f.count}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(f.count / 23) * 100}%` }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full"
                      style={{ background: f.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recent alerts */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/3 border border-white/8 rounded-2xl p-6"
          >
            <h3 className="text-white font-bold text-sm mb-5">Recent Alerts Sent</h3>
            <div className="space-y-3">
              {[
                { type: "hallucination", agent: "support-bot", time: "10:22", severity: "high" },
                { type: "error_swallowed", agent: "email-agent", time: "10:17", severity: "high" },
                { type: "latency_spike", agent: "data-pipeline", time: "08:31", severity: "medium" },
              ].map((alert, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/3 rounded-xl">
                  <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${alert.severity === "high" ? "text-red-400" : "text-amber-400"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-white/70 text-xs font-medium font-mono">{alert.type.replace(/_/g, " ")}</div>
                    <div className="text-white/30 text-[10px]">{alert.agent}</div>
                  </div>
                  <div className="text-white/25 text-[10px] font-mono">{alert.time}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
