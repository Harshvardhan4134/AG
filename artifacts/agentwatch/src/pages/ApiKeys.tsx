import { useState } from "react";
import { motion } from "framer-motion";
import { Key, Copy, Check, Trash2, Plus, Eye, EyeOff, Shield } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { mockApiKeys } from "../lib/mock-data";

export default function ApiKeys() {
  const [keys, setKeys] = useState(mockApiKeys);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);

  const copyKey = (id: string, prefix: string) => {
    navigator.clipboard.writeText(`${prefix}_demo_key_placeholder`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteKey = (id: string) => {
    setKeys((prev) => prev.filter((k) => k.id !== id));
  };

  const createKey = () => {
    if (!newKeyName.trim()) return;
    const newKey = {
      id: `key-${Date.now()}`,
      name: newKeyName.trim(),
      key_prefix: `aw_${newKeyName.toLowerCase().replace(/\s+/g, "_").slice(0, 4)}`,
      created_at: new Date().toISOString(),
      last_used_at: null as string | null,
    };
    setKeys((prev) => [...prev, newKey]);
    setNewKeyName("");
    setCreating(false);
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">API Keys</h1>
        <p className="text-white/40 text-sm mt-1">Manage your AgentWatch API keys</p>
      </div>

      {/* Security notice */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 mb-6"
      >
        <Shield className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-amber-400 text-sm font-medium">Keep your keys private</div>
          <p className="text-amber-400/60 text-xs mt-0.5">
            Never commit API keys to version control. Use environment variables or a secrets manager in production.
          </p>
        </div>
      </motion.div>

      {/* Keys list */}
      <div className="space-y-3 mb-6">
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
                  {showKey === key.id ? `${key.key_prefix}_${"•".repeat(28)}` : `${key.key_prefix}${"•".repeat(20)}`}
                </span>
                <button
                  onClick={() => setShowKey(showKey === key.id ? null : key.id)}
                  className="text-white/20 hover:text-white/50 transition-colors"
                >
                  {showKey === key.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </div>
              <div className="flex items-center gap-4 mt-1.5 text-[10px] text-white/25">
                <span>Created {new Date(key.created_at).toLocaleDateString()}</span>
                {key.last_used_at && (
                  <span>Last used {new Date(key.last_used_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => copyKey(key.id, key.key_prefix)}
                className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 bg-white/4 hover:bg-white/8 border border-white/8 px-3 py-1.5 rounded-lg transition-all"
              >
                {copiedId === key.id ? (
                  <><Check className="w-3 h-3 text-emerald-400" /> Copied</>
                ) : (
                  <><Copy className="w-3 h-3" /> Copy</>
                )}
              </button>
              <button
                onClick={() => deleteKey(key.id)}
                className="text-white/20 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-600/10 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create new key */}
      {creating ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/3 border border-red-600/20 rounded-2xl p-5"
        >
          <div className="text-sm text-white font-medium mb-4">New API Key</div>
          <div className="flex gap-3">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g. Production)"
              onKeyDown={(e) => e.key === "Enter" && createKey()}
              autoFocus
              className="flex-1 bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-600/40 transition-all"
            />
            <button
              onClick={createKey}
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            >
              Create
            </button>
            <button
              onClick={() => setCreating(false)}
              className="text-white/40 hover:text-white/70 px-4 py-2.5 rounded-xl text-sm border border-white/8 transition-all"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 bg-white/3 hover:bg-white/6 border border-dashed border-white/15 hover:border-red-600/30 text-white/40 hover:text-white/70 w-full py-4 rounded-2xl text-sm font-medium transition-all"
        >
          <Plus className="w-4 h-4" />
          Create new API key
        </button>
      )}

      {/* Usage snippet */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 bg-white/2 border border-white/8 rounded-2xl p-6"
      >
        <h3 className="text-white font-bold text-sm mb-4">Usage</h3>
        <div className="bg-[#020202] border border-white/6 rounded-xl p-4 font-mono text-xs text-white/50 leading-relaxed">
          <span className="text-purple-400">import</span>{" "}
          <span className="text-white/70">agentwatch</span>
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
