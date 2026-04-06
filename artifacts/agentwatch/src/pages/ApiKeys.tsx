import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Key, Copy, Check, Trash2, Plus, Eye, EyeOff, Shield, Loader2 } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import {
  listApiKeys,
  createApiKey,
  deleteApiKey,
  setStoredApiKey,
  getStoredApiKey,
} from "../lib/api";

export default function ApiKeys() {
  const qc = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [plaintext, setPlaintext] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["api-keys"],
    queryFn: listApiKeys,
  });

  const createMut = useMutation({
    mutationFn: (name: string) => createApiKey(name),
    onSuccess: (res) => {
      setPlaintext(res.api_key);
      setStoredApiKey(res.api_key);
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      setCreating(false);
      setNewKeyName("");
    },
  });

  const delMut = useMutation({
    mutationFn: deleteApiKey,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  const keys = data?.keys ?? [];

  const copyKey = (id: string, full?: string) => {
    const text = full || getStoredApiKey() || "";
    if (text) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const deleteKey = (id: string) => {
    if (!confirm("Revoke this API key? Agents using it will stop reporting.")) return;
    delMut.mutate(id);
    const cur = getStoredApiKey();
    if (cur) {
      const row = keys.find((k) => k.id === id);
      if (row && cur.startsWith(row.key_prefix)) {
        localStorage.removeItem("agentwatch_api_key");
      }
    }
  };

  const submitCreate = () => {
    if (!newKeyName.trim()) return;
    createMut.mutate(newKeyName.trim());
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">API Keys</h1>
        <p className="text-white/40 text-sm mt-1">Manage your AgentWatch API keys</p>
      </div>

      {plaintext && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-red-600/10 border border-red-600/30"
        >
          <p className="text-red-300 text-sm font-medium mb-2">Copy your key now — it will not be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-xs text-white/90 break-all bg-black/40 p-3 rounded-lg">
              {plaintext}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(plaintext);
                setCopiedId("new");
              }}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
            >
              {copiedId === "new" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setPlaintext(null)}
            className="mt-3 text-xs text-white/40 hover:text-white/70"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 mb-6"
      >
        <Shield className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-amber-400 text-sm font-medium">Keep your keys private</div>
          <p className="text-amber-400/60 text-xs mt-0.5">
            Never commit API keys to version control. The dashboard stores a key locally so charts can load.
          </p>
        </div>
      </motion.div>

      {error && (
        <div className="text-red-400 text-sm mb-4">{(error as Error).message}</div>
      )}

      <div className="space-y-3 mb-6">
        {isLoading && (
          <div className="flex items-center gap-2 text-white/40 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading keys…
          </div>
        )}
        {keys.map((key, i) => (
          <motion.div
            key={key.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-white/3 border border-white/8 rounded-2xl p-5 flex items-center gap-4 card-hover"
          >
            <div className="w-9 h-9 rounded-xl bg-red-600/15 border border-red-600/20 flex items-center justify-center flex-shrink-0">
              <Key className="w-4 h-4 text-red-400" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-white font-medium text-sm">{key.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-white/30">
                  {showKey === key.id
                    ? `${key.key_prefix}••••••••••••••••`
                    : `${key.key_prefix}${"•".repeat(20)}`}
                </span>
                <button
                  type="button"
                  onClick={() => setShowKey(showKey === key.id ? null : key.id)}
                  className="text-white/20 hover:text-white/50 transition-colors"
                >
                  {showKey === key.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </div>
              <div className="flex items-center gap-4 mt-1.5 text-[10px] text-white/25">
                <span>Created {key.created_at ? new Date(key.created_at).toLocaleDateString() : "—"}</span>
                {key.last_used_at && (
                  <span>Last used {new Date(key.last_used_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copyKey(key.id, getStoredApiKey() || undefined)}
                className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 bg-white/4 hover:bg-white/8 border border-white/8 px-3 py-1.5 rounded-lg transition-all"
              >
                {copiedId === key.id ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy stored
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => deleteKey(key.id)}
                disabled={delMut.isPending}
                className="text-white/20 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-600/10 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {creating ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/3 border border-red-600/20 rounded-2xl p-5"
        >
          <div className="text-sm text-white font-medium mb-4">New API Key</div>
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g. Production)"
              onKeyDown={(e) => e.key === "Enter" && submitCreate()}
              autoFocus
              className="flex-1 min-w-[200px] bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-600/40 transition-all"
            />
            <button
              type="button"
              onClick={submitCreate}
              disabled={createMut.isPending}
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            >
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="text-white/40 hover:text-white/70 px-4 py-2.5 rounded-xl text-sm border border-white/8 transition-all"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 bg-white/3 hover:bg-white/6 border border-dashed border-white/15 hover:border-red-600/30 text-white/40 hover:text-white/70 w-full py-4 rounded-2xl text-sm font-medium transition-all"
        >
          <Plus className="w-4 h-4" />
          Create new API key
        </button>
      )}

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 bg-white/2 border border-white/8 rounded-2xl p-6"
      >
        <h3 className="text-white font-bold text-sm mb-4">Usage</h3>
        <div className="bg-[#020202] border border-white/6 rounded-xl p-4 font-mono text-xs text-white/50 leading-relaxed">
          <span className="text-purple-400">import</span> <span className="text-white/70">agentwatch</span>
          {"\n\n"}
          <span className="text-white/70">agentwatch</span>
          <span className="text-white/40">.</span>
          <span className="text-blue-400">init</span>
          <span className="text-white/40">(</span>
          {"\n    "}
          <span className="text-amber-400">api_key</span>
          <span className="text-white/40">="aw_your_key_here",</span>
          {"\n    "}
          <span className="text-amber-400">agent_name</span>
          <span className="text-white/40">="my-production-agent"</span>
          {"\n"}
          <span className="text-white/40">)</span>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
