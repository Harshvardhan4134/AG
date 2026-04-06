import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { User, Save, Loader2, CheckCircle, Zap } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../lib/auth-context";
import { fetchUserMe, patchUserMe } from "../lib/api";

export default function Settings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [deepAnalysis, setDeepAnalysis] = useState(false);
  const [provider, setProvider] = useState<"openai" | "anthropic" | "groq">("openai");
  const [displayName, setDisplayName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["user-me"],
    queryFn: fetchUserMe,
  });

  useEffect(() => {
    const u = data?.user;
    if (u) {
      setDeepAnalysis(Boolean(u.deep_analysis_enabled));
      setProvider((u.llm_provider as "openai" | "anthropic" | "groq") || "openai");
      setDisplayName(String(u.display_name || user?.displayName || ""));
    }
  }, [data, user]);

  const mut = useMutation({
    mutationFn: () =>
      patchUserMe({
        deep_analysis_enabled: deepAnalysis,
        llm_provider: provider,
        display_name: displayName.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-me"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">Settings</h1>
        <p className="text-white/40 text-sm mt-1">Configure your account and preferences</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/3 border border-white/8 rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <User className="w-4 h-4 text-white/40" />
            </div>
            <div className="text-white font-bold text-sm">Account</div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-white/40 text-xs font-medium mb-2">Email</label>
              <div className="bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-white/50 text-sm font-mono">
                {user?.email || "—"}
              </div>
            </div>
            <div>
              <label className="block text-white/40 text-xs font-medium mb-2">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-600/40 transition-all"
              />
            </div>
            <div>
              <label className="block text-white/40 text-xs font-medium mb-2">Plan</label>
              <div className="flex items-center gap-2 bg-white/3 border border-white/8 rounded-xl px-4 py-3">
                <span className="text-white/50 text-sm capitalize">
                  {String(data?.user?.plan || "hobby")}
                </span>
                <span className="ml-auto text-[10px] font-bold text-red-400 bg-red-600/10 border border-red-600/20 px-2 py-0.5 rounded-full">FREE</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-white/3 border border-white/8 rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <div className="text-white font-bold text-sm">LLM analysis</div>
              <div className="text-white/30 text-xs">
                When enabled, your SDK may send an LLM provider key with each trace for the optional judge (your key is not stored on our servers — pass it from env in Python).
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDeepAnalysis(!deepAnalysis)}
              className={`ml-auto w-10 h-5 rounded-full border transition-all relative ${
                deepAnalysis ? "bg-red-600 border-red-600" : "bg-white/5 border-white/15"
              }`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                deepAnalysis ? "left-5" : "left-0.5"
              }`} />
            </button>
          </div>

          {deepAnalysis && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-4 mt-5 pt-5 border-t border-white/5"
            >
              <div>
                <label className="block text-white/40 text-xs font-medium mb-2">Default provider hint</label>
                <div className="flex gap-2">
                  {(["openai", "anthropic", "groq"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProvider(p)}
                      className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-all ${
                        provider === p
                          ? "bg-red-600/15 text-red-400 border-red-600/25"
                          : "bg-white/3 text-white/40 border-white/8 hover:text-white/60"
                      }`}
                    >
                      {p === "openai" ? "OpenAI" : p === "anthropic" ? "Anthropic" : "Groq"}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        <button
          type="button"
          onClick={() => mut.mutate()}
          disabled={mut.isPending || isLoading}
          className="flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white py-3 rounded-xl font-semibold text-sm transition-all hover:shadow-lg hover:shadow-red-600/25"
        >
          {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {mut.isPending ? "Saving..." : saved ? "Saved!" : "Save Settings"}
        </button>
      </div>
    </DashboardLayout>
  );
}
