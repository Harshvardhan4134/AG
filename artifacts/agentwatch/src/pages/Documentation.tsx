import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  ArrowLeft, Code2, Cpu, Layers, Bell, LayoutDashboard,
  GitBranch, Sparkles, Lock, AlertTriangle, Terminal,
} from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";
import { useAuth } from "../lib/auth-context";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "architecture", label: "Architecture" },
  { id: "install", label: "Install" },
  { id: "instrument", label: "Python: instrument" },
  { id: "nodejs", label: "Node.js" },
  { id: "rules", label: "Rule checks" },
  { id: "llm-analysis", label: "LLM judge" },
  { id: "runs", label: "Runs & steps" },
  { id: "dashboard", label: "Dashboard & keys" },
  { id: "alerts", label: "Alerts" },
  { id: "reference", label: "API reference" },
];

function Code({ children }: { children: string }) {
  return (
    <pre className="bg-[#050505] border border-white/[0.08] rounded-xl p-4 text-xs sm:text-sm text-white/75 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
      {children}
    </pre>
  );
}

export default function Documentation() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const goBack = () => navigate(user ? "/dashboard" : "/");

  return (
    <div className="min-h-screen bg-[#060606] text-white">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#060606]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-2 text-white/45 hover:text-white/80 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {user ? "Dashboard" : "Home"}
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center ring-1 ring-white/10 bg-white/[0.03]">
              <BrandLogo size={28} className="w-7 h-7" />
            </div>
            <span className="font-black tracking-tight">Documentation</span>
          </div>
          {user ? (
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="text-sm text-red-400 hover:text-red-300 font-medium"
            >
              Dashboard
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/signin")}
              className="text-sm text-red-400 hover:text-red-300 font-medium"
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-12">
        <nav className="lg:w-52 flex-shrink-0">
          <div className="lg:sticky lg:top-24 space-y-1">
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-3">On this page</p>
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block text-sm text-white/45 hover:text-red-400/90 py-1.5 border-l-2 border-transparent hover:border-red-500/50 pl-3 transition-colors"
              >
                {s.label}
              </a>
            ))}
          </div>
        </nav>

        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 min-w-0 space-y-14 text-white/80 leading-relaxed"
        >
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">AgentWatch documentation</h1>
            <p className="text-white/45 text-lg">
              Trace LLM calls, run server-side checks, optionally call your own model as a judge, and review everything in
              the dashboard.
            </p>
          </div>

          <section id="overview" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-red-500" />
              Overview
            </h2>
            <p className="mb-4">
              AgentWatch records each LLM step (input, output, latency, model, optional tool calls) and POSTs it to your{" "}
              <strong className="text-white/90">AgentWatch API</strong>. The API stores traces in{" "}
              <strong className="text-white/90">Firestore</strong>, runs <strong className="text-white/90">rule checks</strong>{" "}
              on every trace, and can run an optional <strong className="text-white/90">LLM judge</strong> using{" "}
              <strong className="text-white/90">your</strong> OpenAI, Anthropic, or Groq credentials (never stored by
              AgentWatch). You can receive <strong className="text-white/90">email or Slack</strong> alerts when something is
              flagged.
            </p>
            <p className="text-white/50 text-sm">
              The <code className="text-red-400/90">aw_...</code> key identifies <strong className="text-white/70">your</strong>{" "}
              tenant. It is <strong className="text-white/70">not</strong> your OpenAI or Groq key — those stay in your SDK
              config or environment for normal LLM calls and (optionally) for the judge.
            </p>
          </section>

          <section id="architecture" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Cpu className="w-5 h-5 text-red-500" />
              Architecture
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-white/70">
              <li>
                <strong className="text-white/85">SDK (Python or Node)</strong> — Wraps your LLM client, builds a trace
                payload, sends <code className="text-white/60">POST /v1/trace</code> with{" "}
                <code className="text-white/60">Authorization: Bearer aw_...</code>.
              </li>
              <li>
                <strong className="text-white/85">API (FastAPI)</strong> — Validates the key, saves the trace, runs checks,
                optionally runs the judge, saves flags, sends alerts (deduplicated per run).
              </li>
              <li>
                <strong className="text-white/85">Dashboard (Vite)</strong> — You sign in with Firebase. You paste the same{" "}
                <code className="text-white/60">aw_...</code> key into the UI so the browser can call{" "}
                <code className="text-white/60">GET /v1/stats</code> and <code className="text-white/60">GET /v1/traces</code>.
                Data is scoped to that key&apos;s user — nothing is shared between accounts.
              </li>
            </ul>
          </section>

          <section id="install" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Code2 className="w-5 h-5 text-red-500" />
              Install
            </h2>
            <p className="mb-3 text-white/60 text-sm">Python package name on PyPI is <code className="text-white/70">agentwatch-io</code>; import name is still <code className="text-white/70">agentwatch</code>.</p>
            <Code>{`pip install agentwatch-io

# Optional: Groq
pip install groq

# Editable install from a clone:
# pip install -e ./agentwatch-sdk`}</Code>
            <p className="mt-4 text-sm text-white/50">
              Node: <code className="text-white/60">npm install agentwatch-io</code> (see Node.js below).
            </p>
          </section>

          <section id="instrument" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <GitBranch className="w-5 h-5 text-red-500" />
              Python: instrument your agent
            </h2>
            <p className="mb-4">
              Call <code className="text-red-400/90">agentwatch.init()</code> once, then{" "}
              <code className="text-red-400/90">agentwatch.watch(client)</code> on the same client you use for completions.{" "}
              <code className="text-white/60">init</code> alone does not trace — the wrapper must wrap the code path that calls
              the model.
            </p>
            <Code>{`import os
import agentwatch
import openai

agentwatch.init(
    api_key=os.environ["AGENTWATCH_API_KEY"],   # aw_... from Dashboard → API Keys
    server_url=os.environ["AGENTWATCH_SERVER_URL"],  # HTTPS API base, no trailing slash
    agent_name="support-bot",
)

client = agentwatch.watch(openai.OpenAI())

resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello"}],
)

# Short scripts / CLIs: flush so traces are sent before exit
agentwatch.flush(timeout_s=3.0)`}</Code>
            <p className="mt-4 text-sm text-white/50">
              <strong className="text-white/70">Groq:</strong>{" "}
              <code className="text-white/60">from groq import Groq</code> then{" "}
              <code className="text-white/60">agentwatch.watch(Groq())</code> and{" "}
              <code className="text-white/60">chat.completions.create</code>.
            </p>
            <p className="mt-3 text-sm text-white/50">
              <strong className="text-white/70">Anthropic:</strong>{" "}
              <code className="text-white/60">agentwatch.watch(anthropic.Anthropic())</code> and{" "}
              <code className="text-white/60">messages.create</code>.
            </p>
            <p className="mt-6 text-sm text-white/45 border border-white/10 rounded-xl px-4 py-3">
              <Terminal className="w-4 h-4 inline-block mr-2 text-white/40 align-text-bottom" />
              <strong className="text-white/75">Optional auto-wrap (one extra import)</strong>
              <br />
              After setting <code className="text-white/60">AGENTWATCH_API_KEY</code> and{" "}
              <code className="text-white/60">AGENTWATCH_SERVER_URL</code>, call{" "}
              <code className="text-white/60">import agentwatch.auto_instrument as aw; aw.install()</code> to patch new{" "}
              <code className="text-white/60">OpenAI</code>, <code className="text-white/60">Groq</code>, and{" "}
              <code className="text-white/60">Anthropic</code> clients without manually calling <code className="text-white/60">watch()</code>.
              Health: <code className="text-white/60">python -m agentwatch ping</code>.
            </p>
          </section>

          <section id="nodejs" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Terminal className="w-5 h-5 text-red-500" />
              Node.js
            </h2>
            <p className="mb-4 text-sm text-white/60">
              The npm package is also named <code className="text-white/70">agentwatch-io</code>. Use the{" "}
              <strong className="text-white/80">register</strong> preload so OpenAI- and Groq-compatible clients are wrapped
              when those modules load — no edits to your app source in many setups.
            </p>
            <Code>{`# .env
AGENTWATCH_KEY=aw_...
AGENTWATCH_SERVER_URL=https://your-api.example.com
NODE_OPTIONS=--require agentwatch-io/register`}</Code>
            <p className="mt-4 text-sm text-white/45">
              Use <code className="text-white/60">agentwatch-io/register</code> (not the bare package name) so Node loads the CommonJS preload. For explicit control:{" "}
              <code className="text-white/60">const {"{ init, watch }"} = require("agentwatch-io");</code>
            </p>
          </section>

          <section id="rules" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Rule checks
            </h2>
            <p className="mb-3 text-sm">
              Checks run on the server for every trace. Each flag includes a <strong className="text-white/85">confidence</strong> score (0–1). The LLM judge only runs for flags below a server threshold (high-confidence rules can stand alone).
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/70 mb-4">
              <li>
                <strong className="text-white/85">Hallucination (grounding)</strong> — Output mentions{" "}
                <strong className="text-white/90">concrete values</strong> (e.g. dollar amounts, long IDs, order-style tokens) that
                do not appear in the input, with no tool calls to justify them, and the text reads like a factual claim (e.g.
                refund/processed/approved). Echoing an amount the user already gave is <strong className="text-white/90">not</strong> flagged.
              </li>
              <li>
                <strong className="text-white/85">Error swallowed</strong> — A tool result looks like an error, but the assistant
                replies with <strong className="text-white/90">positive success language</strong> (approved, done, processed…) without acknowledging the failure.
              </li>
              <li>
                <strong className="text-white/85">Latency spike</strong> — Step latency vs a recent rolling average for the same agent (needs history).
              </li>
              <li>
                <strong className="text-white/85">Empty output</strong> — Blank model output.
              </li>
            </ul>
            <p className="text-sm text-white/50 mb-2">
              <strong className="text-white/75">Content mode</strong> — Pass <code className="text-red-400/90">content_mode=True</code> in{" "}
              <code className="text-white/60">init()</code> to enable extra checks (repetition, very short output, prompt-injection phrases in input, off-topic heuristic).
            </p>
          </section>

          <section id="llm-analysis" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-400" />
              LLM judge
            </h2>
            <p className="mb-4 text-sm">
              When enabled, the API can call <strong className="text-white/90">your</strong> provider with a structured judge prompt. Your key is used only in that request from the API process — it is <strong className="text-white/90">not</strong> persisted by AgentWatch. High-confidence rule flags may skip the judge; lower-confidence flags are more likely to receive judge output.
            </p>
            <Code>{`import os

agentwatch.init(
    api_key=os.environ["AGENTWATCH_API_KEY"],
    server_url=os.environ["AGENTWATCH_SERVER_URL"],
    agent_name="my-agent",
    deep_analysis=True,
    llm_provider="openai",
    llm_api_key=os.environ["OPENAI_API_KEY"],
    llm_model="gpt-4o-mini",
)`}</Code>
            <p className="mt-4 text-sm text-white/50">
              Use <code className="text-white/60">llm_provider=&quot;groq&quot;</code> and your Groq key for a Groq judge. If{" "}
              <code className="text-white/60">deep_analysis</code> is on but no judge key is configured, only rules run.
            </p>
          </section>

          <section id="runs" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <LayoutDashboard className="w-5 h-5 text-red-500" />
              Runs &amp; steps
            </h2>
            <p className="mb-3">
              Each trace has a <code className="text-red-400/90">run_id</code>. The API ensures a non-empty ID if the client omits
              one. Steps that belong to the same logical run should reuse the same <code className="text-white/60">run_id</code>. The
              dashboard lists <strong className="text-white/85">individual trace rows</strong> (each LLM step) and groups detail by run when you open a run.
            </p>
            <Code>{`client.chat.completions.create(
    aw_run_id="support-ticket-4421",
    aw_agent_name="support-bot",
    model="gpt-4o-mini",
    messages=[...],
)`}</Code>
          </section>

          <section id="dashboard" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-red-500" />
              Dashboard &amp; API keys
            </h2>
            <p className="mb-3">
              Sign in, then create an API key under <strong className="text-white/85">API Keys</strong> and paste it into the
              dashboard so the UI can call the API. The key in the browser must match the key your SDK uses, or stats and traces
              will disagree.
            </p>
            <p className="mb-3 text-sm text-white/50">
              Deploy the frontend with <code className="text-white/60">VITE_API_URL</code> set to your API base URL (HTTPS, no trailing slash) — e.g. your Cloud Run URL. Add your dashboard origin to Firebase <strong className="text-white/70">Authorized domains</strong> and ensure the API <code className="text-white/60">CORS_ORIGINS</code> includes that origin.
            </p>
          </section>

          <section id="alerts" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-red-500" />
              Alerts
            </h2>
            <p className="mb-3">
              Configure email (Resend on the server) and/or a Slack webhook in <strong className="text-white/85">Alerts</strong>. At most one notification per flagged <code className="text-white/60">run_id</code> per user (deduplication). You can limit which flag types notify you.
            </p>
          </section>

          <section id="reference" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-white mb-4">agentwatch.init() parameters</h2>
            <div className="overflow-x-auto border border-white/[0.08] rounded-xl">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-white/[0.08] text-white/45 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 font-medium">Parameter</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="text-white/70">
                  {[
                    ["api_key", "AgentWatch key (aw_...) from the dashboard."],
                    ["server_url", "API base URL, no trailing slash."],
                    ["agent_name", 'Label in the UI (default "default").'],
                    ["deep_analysis", "Enable LLM judge for eligible flags (default False)."],
                    ["llm_provider", '"openai", "anthropic", or "groq" for the judge.'],
                    ["llm_api_key", "Provider API key for the judge."],
                    ["groq_api_key", "Optional; alternative to llm_api_key for Groq."],
                    ["llm_model", "Optional; defaults per provider."],
                    ["content_mode", "Extra content-focused server checks (default False)."],
                    ["redact_fields", "Optional list of field names to redact in trace text."],
                    ["silent", "If True, skip console messages from init."],
                  ].map(([k, d]) => (
                    <tr key={k} className="border-b border-white/[0.05]">
                      <td className="px-4 py-2.5 font-mono text-red-400/90 whitespace-nowrap">{k}</td>
                      <td className="px-4 py-2.5">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-6 text-sm text-white/45">
              <code className="text-white/55">agentwatch.watch(client)</code> — wraps the client; returns the same instance.
            </p>
            <p className="mt-2 text-sm text-white/45">
              <code className="text-white/55">agentwatch.flush(timeout_s=3.0)</code> — wait for pending trace uploads (use in short-lived processes).
            </p>
          </section>

          <footer className="pt-8 border-t border-white/[0.06] text-center text-white/35 text-sm">
            AgentWatch — production monitoring for AI agents
          </footer>
        </motion.article>
      </div>
    </div>
  );
}
