import { motion, useScroll, useTransform } from "framer-motion";
import { useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";
import {
  Zap, Eye, AlertTriangle, ArrowRight, Activity,
  Code2, ChevronRight, Terminal, Cpu, GitBranch, Lock
} from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";

const TERMINAL_LINES = [
  { delay: 0,    text: "$ pip install agentwatch-io",            color: "text-white/60" },
  { delay: 800,  text: "Successfully installed agentwatch-1.0.0", color: "text-emerald-400/80" },
  { delay: 1400, text: "",                                       color: "" },
  { delay: 1600, text: "import agentwatch",                      color: "text-purple-400" },
  { delay: 2000, text: "agentwatch.init(api_key='aw_prod_...')",  color: "text-white/70" },
  { delay: 2600, text: "",                                       color: "" },
  { delay: 2800, text: "# LLM call intercepted ✓",              color: "text-white/30" },
  { delay: 3200, text: "🔍 Analyzing trace run_8f3a...",         color: "text-amber-400" },
  { delay: 4000, text: "⚠  hallucination detected [HIGH]",       color: "text-red-400" },
  { delay: 4600, text: "→  no tool call made to verify action",   color: "text-red-400/70" },
  { delay: 5200, text: "📨 Alert dispatched to #alerts",         color: "text-blue-400" },
  { delay: 5800, text: "✓  Trace saved · run_8f3a · 920ms",      color: "text-emerald-400" },
];

function TerminalWindow() {
  const [visibleLines, setVisibleLines] = useState<number[]>([]);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    TERMINAL_LINES.forEach((line, i) => {
      setTimeout(() => {
        setVisibleLines((prev) => [...prev, i]);
      }, line.delay);
    });
    const loop = setTimeout(() => {
      setVisibleLines([]);
      started.current = false;
    }, 8000);
    return () => clearTimeout(loop);
  }, []);

  useEffect(() => {
    if (visibleLines.length === 0 && started.current === false) {
      started.current = false;
      const timer = setTimeout(() => {
        started.current = true;
        TERMINAL_LINES.forEach((line, i) => {
          setTimeout(() => {
            setVisibleLines((prev) => [...prev, i]);
          }, line.delay);
        });
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [visibleLines]);

  return (
    <div className="relative w-full max-w-lg">
      <div className="absolute -inset-4 bg-red-600/10 rounded-3xl blur-2xl" />
      <div className="relative red-border-glow rounded-2xl overflow-hidden bg-[#080808]">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/6 bg-[#0a0a0a]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-amber-500/40" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/40" />
          </div>
          <div className="flex items-center gap-1.5 mx-auto">
            <Terminal className="w-3 h-3 text-white/30" />
            <span className="text-white/30 text-xs font-mono">agentwatch terminal</span>
          </div>
        </div>
        <div className="p-5 font-mono text-xs space-y-1 min-h-[280px]">
          {TERMINAL_LINES.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={visibleLines.includes(i) ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`leading-relaxed ${line.color}`}
            >
              {line.text || "\u00A0"}
            </motion.div>
          ))}
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
            className="inline-block w-2 h-3.5 bg-red-500/80 ml-0.5 align-middle"
          />
        </div>
      </div>

      {/* Floating badges */}
      <motion.div
        animate={{ y: [-4, 4, -4] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-4 -right-6 bg-[#0f0f0f] border border-red-500/30 rounded-xl px-3 py-2 shadow-xl shadow-red-900/30"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-red-400 text-[11px] font-mono font-bold">FLAGGED</span>
        </div>
        <div className="text-white/40 text-[10px] mt-0.5">hallucination · high</div>
      </motion.div>

      <motion.div
        animate={{ y: [4, -4, 4] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -bottom-4 -left-6 bg-[#0f0f0f] border border-emerald-500/25 rounded-xl px-3 py-2 shadow-xl"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-emerald-400 text-[11px] font-mono font-bold">920ms</span>
        </div>
        <div className="text-white/40 text-[10px] mt-0.5">latency · p95</div>
      </motion.div>
    </div>
  );
}

const features = [
  {
    icon: <AlertTriangle className="w-5 h-5" />,
    title: "Hallucination Detection",
    desc: "Catch when your agent claims to do something it never actually did — before users notice.",
    tag: "HIGH PRIORITY",
    color: "red",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Latency Spikes",
    desc: "Automatic baseline detection flags steps that take 3× longer than normal.",
    tag: "PERFORMANCE",
    color: "amber",
  },
  {
    icon: <Eye className="w-5 h-5" />,
    title: "LLM analysis",
    desc: "Run an LLM judge on any flagged trace for root cause analysis and fix suggestions.",
    tag: "AI POWERED",
    color: "purple",
  },
  {
    icon: <Code2 className="w-5 h-5" />,
    title: "2-Line Integration",
    desc: "One import. AgentWatch silently wraps all LLM calls with zero friction.",
    tag: "DEVELOPER FIRST",
    color: "blue",
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  red:    { bg: "bg-red-600/10",    border: "border-red-600/20",    text: "text-red-400",    glow: "rgba(239,68,68,0.15)" },
  amber:  { bg: "bg-amber-500/10",  border: "border-amber-500/20",  text: "text-amber-400",  glow: "rgba(245,158,11,0.12)" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400", glow: "rgba(168,85,247,0.12)" },
  blue:   { bg: "bg-blue-500/10",   border: "border-blue-500/20",   text: "text-blue-400",   glow: "rgba(59,130,246,0.12)" },
};

export default function Landing() {
  const [, navigate] = useLocation();
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const heroY = useTransform(scrollY, [0, 300], [0, -40]);

  return (
    <div className="min-h-screen bg-[#060606] text-white overflow-x-hidden relative">
      {/* Grid background */}
      <div className="fixed inset-0 grid-bg opacity-60 pointer-events-none" />

      {/* Glow orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="glow-orb w-[700px] h-[500px] bg-red-600/8 top-[-100px] left-[40%] -translate-x-1/2" />
        <div className="glow-orb w-[300px] h-[300px] bg-red-800/6 top-[60%] left-[-50px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-4 border-b border-white/[0.06] backdrop-blur-sm bg-[#060606]/60">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2.5"
        >
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center animate-pulse-ring glow-red ring-1 ring-white/10 bg-white/[0.03]">
            <BrandLogo size={30} className="w-[1.875rem] h-[1.875rem]" />
          </div>
          <span className="text-base font-black tracking-tight">AgentWatch</span>
          <span className="text-[10px] font-mono bg-red-600/15 text-red-400 border border-red-600/25 px-1.5 py-0.5 rounded-md">
            BETA
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-5"
        >
          <button
            type="button"
            onClick={() => navigate("/docs")}
            className="text-sm text-white/50 hover:text-white transition-colors"
          >
            Docs
          </button>
          <button
            onClick={() => navigate("/signin")}
            className="text-sm text-white/50 hover:text-white transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="text-sm bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-semibold transition-all hover:shadow-lg hover:shadow-red-600/30 hover:-translate-y-0.5"
          >
            Get Started
          </button>
        </motion.div>
      </nav>

      {/* Hero */}
      <motion.section
        style={{ opacity: heroOpacity, y: heroY }}
        className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-10 flex items-center gap-16"
      >
        {/* Left */}
        <div className="flex-1 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2.5 bg-red-600/10 border border-red-600/20 text-red-400 text-xs font-mono px-3.5 py-2 rounded-full mb-8"
          >
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            AI-Driven Monitoring · Production Ready
            <span className="ml-1 text-red-400/50">→</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-[64px] font-black tracking-tighter leading-[0.92] mb-6"
          >
            <span className="text-white">Your AI Agents,</span>
            <br />
            <span className="gradient-text text-glow-red">
              Watched Over.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-white/45 text-lg leading-relaxed mb-10 max-w-xl"
          >
            From hallucination detection to latency spikes — AgentWatch monitors every step your AI agents take in production, flagging issues before they reach your users.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex items-center gap-4 mb-14"
          >
            <button
              onClick={() => navigate("/signup")}
              className="group flex items-center gap-2.5 bg-red-600 hover:bg-red-500 text-white px-6 py-3.5 rounded-xl font-bold text-sm transition-all hover:shadow-2xl hover:shadow-red-600/35 hover:-translate-y-0.5"
            >
              Start Monitoring Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => navigate("/signin")}
              className="flex items-center gap-2 bg-white/4 hover:bg-white/8 border border-white/10 hover:border-white/20 text-white/80 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all"
            >
              View Demo
              <ChevronRight className="w-4 h-4 text-white/40" />
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-8 pt-8 border-t border-white/[0.06]"
          >
            {[
              { value: "3M+",  label: "Traces Monitored" },
              { value: "95%",  label: "Detection Rate" },
              { value: "<2%",  label: "False Positives" },
              { value: "2-line", label: "Integration" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-black text-white">{s.value}</div>
                <div className="text-white/35 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right: Terminal */}
        <motion.div
          initial={{ opacity: 0, x: 40, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex-shrink-0 hidden lg:flex"
        >
          <TerminalWindow />
        </motion.div>
      </motion.section>

      {/* Dashboard preview */}
      <motion.section
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 max-w-5xl mx-auto px-8 mb-24"
      >
        <div className="red-border-glow rounded-2xl overflow-hidden">
          {/* Browser chrome */}
          <div className="bg-[#0c0c0c] px-4 py-3 border-b border-white/[0.06] flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-amber-500/35" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/35" />
            </div>
            <div className="flex-1 mx-3 bg-white/[0.04] border border-white/[0.06] rounded-md py-1.5 px-3 text-[11px] text-white/25 font-mono flex items-center gap-2">
              <Lock className="w-3 h-3" />
              agentwatch.io/dashboard
            </div>
            <div className="flex gap-2">
              {[1,2,3].map(i => <div key={i} className="w-4 h-3 bg-white/5 rounded-sm" />)}
            </div>
          </div>

          <div className="bg-[#080808]">
            {/* Stat cards */}
            <div className="p-5 grid grid-cols-4 gap-3">
              {[
                { label: "Total Traces", value: "1,247", color: "text-white",       bg: "bg-white/[0.03]" },
                { label: "Flagged",      value: "23",    color: "text-red-400",     bg: "bg-red-600/[0.06]" },
                { label: "Healthy",      value: "1,224", color: "text-emerald-400", bg: "bg-emerald-500/[0.06]" },
                { label: "Flags Today",  value: "5",     color: "text-amber-400",   bg: "bg-amber-500/[0.06]" },
              ].map((c) => (
                <div key={c.label} className={`${c.bg} border border-white/[0.07] rounded-xl p-4`}>
                  <div className="text-white/35 text-[11px] mb-2">{c.label}</div>
                  <div className={`text-2xl font-black ${c.color}`}>{c.value}</div>
                </div>
              ))}
            </div>

            {/* Table preview */}
            <div className="px-5 pb-5">
              <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-[11px] text-white/50 font-medium">Recent Agent Runs</span>
                </div>
                {[
                  { status: "flagged", run: "run_8f3a", agent: "support-bot",  flag: "hallucination",   sev: "high" },
                  { status: "ok",      run: "run_3e9c", agent: "support-bot",  flag: "",                sev: "" },
                  { status: "flagged", run: "run_2b1d", agent: "email-agent",  flag: "error_swallowed", sev: "high" },
                  { status: "ok",      run: "run_1a8f", agent: "email-agent",  flag: "",                sev: "" },
                ].map((row, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-center gap-4 border-b border-white/[0.03] text-[11px] last:border-0">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${row.status === "ok" ? "bg-emerald-500" : "bg-red-500"}`} />
                    <span className="font-mono text-white/35 w-20">{row.run}...</span>
                    <span className="text-white/55 flex-1">{row.agent}</span>
                    {row.flag ? (
                      <span className="bg-red-600/15 text-red-400 border border-red-600/20 px-2 py-0.5 rounded font-mono">{row.flag}</span>
                    ) : (
                      <span className="text-white/20">—</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Feature cards */}
      <section className="relative z-10 max-w-6xl mx-auto px-8 py-16 border-t border-white/[0.05]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14"
        >
          <p className="text-xs font-mono text-red-500/60 tracking-widest mb-3">CAPABILITIES</p>
          <h2 className="text-4xl font-black text-white mb-2">End-to-End</h2>
          <p className="text-4xl font-black gradient-text">AI Agent Observability</p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => {
            const c = colorMap[f.color];
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="relative bg-white/[0.025] border border-white/[0.08] rounded-2xl p-6 cursor-default overflow-hidden group"
                style={{ boxShadow: `0 0 0 0 ${c.glow}` }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 30px ${c.glow}, 0 0 0 1px rgba(239,68,68,0.1)`;
                  (e.currentTarget as HTMLDivElement).style.borderColor = `rgba(239,68,68,0.2)`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 0 ${c.glow}`;
                  (e.currentTarget as HTMLDivElement).style.borderColor = '';
                }}
              >
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)`, transform: 'translate(30%, -30%)' }}
                />
                <div className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center ${c.text} mb-4 transition-all group-hover:scale-110`}>
                  {f.icon}
                </div>
                <div className={`text-[9px] font-mono ${c.text} mb-2 tracking-widest opacity-60`}>{f.tag}</div>
                <h3 className="text-white font-bold text-sm mb-2">{f.title}</h3>
                <p className="text-white/40 text-xs leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* How it works ticker */}
      <section className="relative z-10 border-y border-white/[0.05] py-4 overflow-hidden bg-[#060606]/80 backdrop-blur-sm">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...Array(2)].map((_, rep) => (
            <span key={rep} className="flex items-center">
              {[
                "Hallucination Detection",
                "Latency Spike Alerts",
                "Deep AI Analysis",
                "Error Swallowing",
                "Empty Output Detection",
                "Slack & Email Alerts",
                "2-Line Python SDK",
                "Real-time Monitoring",
              ].map((item, i) => (
                <span key={i} className="flex items-center gap-3 mx-6">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  <span className="text-white/40 text-sm font-medium">{item}</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </section>

      {/* CTA — solid black (no red wash) */}
      <section className="relative z-10 max-w-4xl mx-auto px-8 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-black p-14"
        >
          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-red-600/10 border border-red-600/20 text-red-400 text-xs font-mono px-3 py-1.5 rounded-full mb-6">
              <GitBranch className="w-3 h-3" />
              Free forever for open source
            </div>
            <h2 className="text-5xl font-black text-white mb-4 tracking-tight">
              Start monitoring today.
            </h2>
            <p className="text-white/45 mb-8 text-lg">
              No credit card required. Production-grade from day one.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => navigate("/signup")}
                className="group flex items-center gap-2.5 bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-xl font-bold text-sm transition-all hover:shadow-2xl hover:shadow-red-600/40 hover:-translate-y-1"
              >
                Create Free Account
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={() => navigate("/signin")}
                className="text-sm text-white/40 hover:text-white/70 transition-colors"
              >
                Already have an account →
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer — solid black so red glow does not read through */}
      <footer className="relative z-30 bg-black border-t border-white/[0.06] px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-md overflow-hidden flex items-center justify-center opacity-90">
            <BrandLogo size={20} className="w-5 h-5" />
          </div>
          <span className="text-white/25 text-xs">AgentWatch · Production reliability for AI agents</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-white/20 text-xs">Privacy</span>
          <span className="text-white/20 text-xs">Docs</span>
          <span className="text-white/20 text-xs font-mono">v1.0.0</span>
        </div>
      </footer>
    </div>
  );
}
