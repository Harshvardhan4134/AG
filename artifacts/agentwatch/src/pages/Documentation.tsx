import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  ArrowLeft, Code2, Cpu, Layers, Bell, LayoutDashboard,
  GitBranch, Sparkles, Lock, AlertTriangle
} from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";
import { useAuth } from "../lib/auth-context";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "architecture", label: "How it fits together" },
  { id: "install", label: "Install" },
  { id: "instrument", label: "Instrument your agent" },
  { id: "rules", label: "Rule-based analysis" },
  { id: "llm-analysis", label: "LLM analysis (judge)" },
  { id: "runs", label: "Runs & steps" },
  { id: "dashboard", label: "Dashboard & API keys" },
  { id: "alerts", label: "Alerts" },
  { id: "reference", label: "init() reference" },
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
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">AgentWatch usage guide</h1>
            <p className="text-white/45 text-lg">
              End-to-end reference: tracing, rule checks, optional LLM judge analysis, storage, runs, dashboard, and alerts.
            </p>
          </div>

          <section id="overview" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-red-500" />
              Overview
            </h2>
            <p className="mb-4">
              AgentWatch captures each LLM step from your Python process, sends it to the AgentWatch API, runs{" "}
              <strong className="text-white/90">deterministic rule checks</strong> on the server, optionally runs an{" "}
              <strong className="text-white/90">LLM judge</strong> when a step is flagged, persists traces and flags in
              Firestore, and can notify you via email or Slack.
            </p>
            <p className="text-white/50 text-sm">
              The marketing “two lines” are <code className="text-red-400/90">init</code> only — you must{" "}
              <strong className="text-white/70">wrap your OpenAI, Anthropic, or Groq client</strong> so calls are
              intercepted (see Instrumentation).
            </p>
          </section>

          <section id="architecture" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Cpu className="w-5 h-5 text-red-500" />
              How it fits together
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-white/70">
              <li>
                <strong className="text-white/85">Python SDK</strong> — monkey-patches LLM clients, builds trace payloads,
                POSTs to <code className="text-white/60">/v1/trace</code> with your AgentWatch API key.
              </li>
              <li>
                <strong className="text-white/85">API (FastAPI)</strong> — validates key, saves trace, runs rules, optional
                LLM analysis, saves flags, dispatches alerts (deduplicated per run).
              </li>
              <li>
                <strong className="text-white/85">Dashboard</strong> — sign in to your account, then use your{" "}
                <code className="text-white/60">aw_</code> key (saved in the browser) to load traces and runs. Each user
                has separate keys and data.
              </li>
            </ul>
          </section>

          <section id="install" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Code2 className="w-5 h-5 text-red-500" />
              Install
            </h2>
            <p className="mb-3 text-white/60 text-sm">From your repo root (or publish to PyPI later):</p>
            <Code>{`cd agentwatch-sdk
pip install -e .

# Dependencies: requests (HTTP to AgentWatch API)`}</Code>
          </section>

          <section id="instrument" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <GitBranch className="w-5 h-5 text-red-500" />
              Instrument your agent
            </h2>
            <p className="mb-4">
              Call <code className="text-red-400/90">agentwatch.init()</code> once at startup, then wrap the client you
              use for completions.
            </p>
            <Code>{`import agentwatch
import openai

agentwatch.init(
    api_key="aw_...",                    # from dashboard → API Keys
    server_url="https://your-api.com",   # or http://localhost:8000
    agent_name="support-bot",
)

client = agentwatch.watch(openai.OpenAI())

resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello"}],
)
# Each completion is traced asynchronously (non-blocking).`}</Code>
            <p className="mt-4 text-sm text-white/50">
              For Anthropic: <code className="text-white/60">agentwatch.watch(anthropic.Anthropic())</code> and use{" "}
              <code className="text-white/60">messages.create</code>.
            </p>
            <p className="mt-4 text-sm text-white/50">
              For Groq (OpenAI-compatible chat API):{" "}
              <code className="text-white/60">pip install groq</code> then{" "}
              <code className="text-white/60">agentwatch.watch(Groq())</code> — same{" "}
              <code className="text-white/60">chat.completions.create</code> shape; traces include Groq timing fields when
              the API returns them.
            </p>
          </section>

          <section id="rules" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Rule-based analysis
            </h2>
            <p className="mb-3">
              Every trace is evaluated on the server with fast, deterministic checks (no AgentWatch LLM cost):
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/70 mb-4">
              <li>
                <strong className="text-white/85">Hallucination</strong> — action-like language in the model output with
                no tool calls recorded.
              </li>
              <li>
                <strong className="text-white/85">Error swallowed</strong> — tool result looks like an error, but the
                assistant output does not acknowledge failure.
              </li>
              <li>
                <strong className="text-white/85">Latency spike</strong> — step latency vs recent rolling average for the
                same agent (needs enough history).
              </li>
              <li>
                <strong className="text-white/85">Empty output</strong> — blank model output.
              </li>
            </ul>
            <p className="text-sm text-white/45 mb-4">
              Flags are stored per trace; the run is grouped for the dashboard (see Runs &amp; steps).
            </p>
            <p className="mb-2 text-sm text-white/55">
              <strong className="text-white/80">Content mode</strong> — pass{" "}
              <code className="text-red-400/90">content_mode=True</code> to{" "}
              <code className="text-white/60">init()</code> to add four writing-focused checks: repeated sentences / repeated
              5-word phrases, very short outputs, common prompt-injection phrases in the input, and a simple off-topic
              heuristic for long outputs.
            </p>
          </section>

          <section id="llm-analysis" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-400" />
              LLM analysis (judge)
            </h2>
            <p className="mb-4">
              When <strong className="text-white/90">rule checks fire</strong> on a trace, the API can optionally call{" "}
              <strong className="text-white/90">your</strong> OpenAI, Anthropic, or Groq API with a structured “judge” prompt. It
              returns JSON: verdict, confidence, what went wrong, root cause, suggested fix. Your LLM key is sent only in
              the request to your provider from the AgentWatch API process — it is{" "}
              <strong className="text-white/90">not logged or stored</strong> by AgentWatch.
            </p>
            <Code>{`import os

agentwatch.init(
    api_key="aw_...",
    server_url="https://your-api.com",
    agent_name="my-agent",
    deep_analysis=True,
    llm_provider="openai",       # or "anthropic" / "groq"
    llm_api_key=os.environ["OPENAI_API_KEY"],
    llm_model="gpt-4o-mini",     # optional; sensible defaults if omitted
)

# Groq judge — use your existing Groq key:
# llm_provider="groq", llm_api_key=os.environ["GROQ_API_KEY"], llm_model="llama-3.3-70b-versatile"
# (or pass groq_api_key=... instead of llm_api_key)`}</Code>
            <p className="mt-4 text-sm text-white/50">
              If <code className="text-white/60">deep_analysis</code> is True but no judge API key is set, only rule-based
              flags run. LLM analysis runs only when there is at least one flag for that trace.
            </p>
          </section>

          <section id="runs" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <LayoutDashboard className="w-5 h-5 text-red-500" />
              Runs &amp; steps
            </h2>
            <p className="mb-3">
              Each trace has a <code className="text-red-400/90">run_id</code> (UUID by default). All steps in one agent
              execution share the same <code className="text-red-400/90">run_id</code> so the dashboard can show a timeline.
              You can pass <code className="text-white/60">aw_run_id</code> on the OpenAI call to correlate manually.
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
              <strong className="text-white/85">Sign in</strong> to the dashboard (localhost or your deployed URL). Each
              account has its own <strong className="text-white/85">API keys</strong> and only sees traces and stats for
              that account — nothing is shared between users. Under <strong className="text-white/85">API Keys</strong>,
              create a key and use it in <code className="text-red-400/90">agentwatch.init(api_key=...)</code>. Save the
              key in the dashboard (browser local storage) so the app can load your data. The AgentWatch key identifies
              your tenant; it is not your OpenAI/Anthropic key.
            </p>
            <p className="text-sm text-white/45">
              Set <code className="text-white/60">VITE_API_URL</code> in <code className="text-white/60">.env.local</code>{" "}
              to your FastAPI base URL.
            </p>
          </section>

          <section id="alerts" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-red-500" />
              Alerts
            </h2>
            <p className="mb-3">
              In <strong className="text-white/85">Alerts</strong>, configure email (Resend on the server) and/or Slack
              webhook. The API sends at most one alert per flagged <code className="text-white/60">run_id</code> per user
              (deduplication). You can restrict which flag types trigger notifications.
            </p>
          </section>

          <section id="reference" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-white mb-4">agentwatch.init() reference</h2>
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
                    ["api_key", 'AgentWatch key starting with aw_ (from dashboard).'],
                    ["server_url", "FastAPI base URL, no trailing slash."],
                    ["agent_name", 'Logical name shown in UI (default "default").'],
                    ["deep_analysis", "Enable LLM judge when flags fire (default False)."],
                    ["llm_provider", "Judge provider: openai, anthropic, or groq."],
                    ["llm_api_key", "Provider key for judge (OpenAI / Anthropic / Groq)."],
                    ["groq_api_key", "Optional; same as putting the Groq key in llm_api_key."],
                    ["llm_model", "Optional; defaults per provider (e.g. gpt-4o-mini, Haiku, Llama 3.3)."],
                    ["content_mode", "Extra content-creation rule checks on the server (default False)."],
                    ["redact_fields", "Optional list of field names to redact in trace text."],
                    ["silent", "If True, skip console connection messages."],
                  ].map(([k, d]) => (
                    <tr key={k} className="border-b border-white/[0.05]">
                      <td className="px-4 py-2.5 font-mono text-red-400/90 whitespace-nowrap">{k}</td>
                      <td className="px-4 py-2.5">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-6 text-sm text-white/40">
              <code className="text-white/55">agentwatch.watch(client)</code> — returns the same client instance with
              completions wrapped for tracing.
            </p>
          </section>

          <footer className="pt-8 border-t border-white/[0.06] text-center text-white/35 text-sm">
            AgentWatch · production reliability for AI agents
          </footer>
        </motion.article>
      </div>
    </div>
  );
}
