import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Shield, Zap, Eye, AlertTriangle, ArrowRight, Activity, Code2, ChevronRight } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function Landing() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden grid-bg relative">
      {/* Radial glow background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-red-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-red-900/10 rounded-full blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="w-7 h-7 rounded bg-red-600 flex items-center justify-center animate-pulse-ring">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">AgentWatch</span>
          <span className="ml-2 text-[10px] font-mono bg-red-600/20 text-red-400 border border-red-600/30 px-1.5 py-0.5 rounded">
            BETA
          </span>
        </motion.div>

        <div className="flex items-center gap-6">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate("/signin")}
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            Sign In
          </motion.button>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            onClick={() => navigate("/signup")}
            className="text-sm bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-medium transition-all hover:shadow-lg hover:shadow-red-600/25"
          >
            Get Started
          </motion.button>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 max-w-6xl mx-auto px-8 pt-24 pb-16">
        <motion.div
          custom={0}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="inline-flex items-center gap-2 bg-red-600/10 border border-red-600/20 text-red-400 text-xs font-mono px-3 py-1.5 rounded-full mb-8"
        >
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          AI-Driven Monitoring · Production Ready
        </motion.div>

        <div className="max-w-4xl">
          <motion.h1
            custom={1}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="text-6xl md:text-7xl font-black tracking-tighter leading-none mb-6"
          >
            <span className="text-white">Your AI Agents,</span>
            <br />
            <span className="gradient-text text-glow-red">
              Watched Over.
            </span>
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="text-white/50 text-xl leading-relaxed max-w-2xl mb-10"
          >
            From hallucination detection to latency spikes — AgentWatch monitors every step your AI agents take in production, flagging issues before they reach your users.
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="flex items-center gap-4 flex-wrap"
          >
            <button
              onClick={() => navigate("/signup")}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:shadow-xl hover:shadow-red-600/30 hover:-translate-y-0.5"
            >
              Start Monitoring Free
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate("/signin")}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all"
            >
              View Demo Dashboard
              <ChevronRight className="w-4 h-4 text-white/40" />
            </button>
          </motion.div>
        </div>

        {/* Stats row */}
        <motion.div
          custom={4}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="flex items-center gap-8 mt-16 pt-8 border-t border-white/5"
        >
          {[
            { label: "Happy Agents Monitored", value: "3M+" },
            { label: "Avg Detection Rate", value: "95%" },
            { label: "False Positive Rate", value: "<2%" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-white/40 text-xs mt-0.5">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Dashboard preview mock */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 max-w-5xl mx-auto px-8 mb-20"
      >
        <div className="red-border-glow rounded-2xl overflow-hidden">
          <div className="bg-[#0d0d0d] p-4 border-b border-white/5 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-white/10" />
              <div className="w-3 h-3 rounded-full bg-white/10" />
              <div className="w-3 h-3 rounded-full bg-white/10" />
            </div>
            <div className="flex-1 mx-4 bg-white/5 rounded-md py-1 px-3 text-xs text-white/30 font-mono">
              agentwatch.io/dashboard
            </div>
          </div>
          <div className="bg-[#080808] p-6 grid grid-cols-4 gap-4">
            {[
              { label: "Total Traces", value: "1,247", color: "text-white" },
              { label: "Flagged", value: "23", color: "text-red-400" },
              { label: "Healthy", value: "1,224", color: "text-emerald-400" },
              { label: "Flags Today", value: "5", color: "text-amber-400" },
            ].map((card) => (
              <div key={card.label} className="bg-white/3 border border-white/8 rounded-xl p-4">
                <div className="text-white/40 text-xs mb-2">{card.label}</div>
                <div className={`text-2xl font-black ${card.color}`}>{card.value}</div>
              </div>
            ))}
          </div>
          <div className="bg-[#080808] px-6 pb-6">
            <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs text-white/60 font-medium">Recent Agent Runs</span>
              </div>
              {[
                { status: "flagged", run: "run_8f3a", agent: "support-bot", flags: "hallucination" },
                { status: "ok", run: "run_3e9c", agent: "support-bot", flags: "" },
                { status: "flagged", run: "run_2b1d", agent: "email-agent", flags: "error_swallowed" },
              ].map((row, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-4 border-b border-white/3 text-xs">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${row.status === "ok" ? "bg-emerald-500" : "bg-red-500"}`} />
                  <span className="font-mono text-white/40 w-24">{row.run}...</span>
                  <span className="text-white/60 flex-1">{row.agent}</span>
                  {row.flags && (
                    <span className="bg-red-600/15 text-red-400 border border-red-600/20 px-2 py-0.5 rounded text-[10px] font-mono">{row.flags}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Features */}
      <div className="relative z-10 max-w-6xl mx-auto px-8 py-20 border-t border-white/5">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl font-black text-white mb-2"
        >
          End-to-End
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl font-black gradient-text mb-16"
        >
          AI Agent Observability
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: <AlertTriangle className="w-5 h-5" />,
              title: "Hallucination Detection",
              desc: "Catch when your agent claims to do something it never actually did — before your users notice.",
              tag: "HIGH PRIORITY",
            },
            {
              icon: <Zap className="w-5 h-5" />,
              title: "Latency Spikes",
              desc: "Automatic baseline detection flags when agent steps take 3x longer than normal.",
              tag: "PERFORMANCE",
            },
            {
              icon: <Eye className="w-5 h-5" />,
              title: "Deep Analysis",
              desc: "Run an LLM judge on any flagged trace to get root cause analysis and fix suggestions.",
              tag: "AI POWERED",
            },
            {
              icon: <Code2 className="w-5 h-5" />,
              title: "2-Line Integration",
              desc: "Drop one import in your code. AgentWatch silently wraps all LLM calls — zero friction.",
              tag: "DEVELOPER FIRST",
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-white/3 border border-white/8 rounded-2xl p-6 card-hover group"
            >
              <div className="w-10 h-10 rounded-xl bg-red-600/15 border border-red-600/20 flex items-center justify-center text-red-400 mb-4 group-hover:bg-red-600/25 transition-colors">
                {f.icon}
              </div>
              <div className="text-[9px] font-mono text-red-500/70 mb-2 tracking-widest">{f.tag}</div>
              <h3 className="text-white font-bold mb-2">{f.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="relative z-10 max-w-4xl mx-auto px-8 py-20 text-center"
      >
        <div className="bg-white/2 border border-white/8 rounded-3xl p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-red-600/5 to-transparent" />
          <h2 className="relative text-4xl font-black text-white mb-4">
            Start monitoring today.
          </h2>
          <p className="relative text-white/50 mb-8 text-lg">
            Free forever for side projects. No credit card required.
          </p>
          <button
            onClick={() => navigate("/signup")}
            className="relative bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-xl font-bold text-sm transition-all hover:shadow-2xl hover:shadow-red-600/40 hover:-translate-y-1"
          >
            Create Free Account →
          </button>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="relative z-10 border-t border-white/5 px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-red-600/80 flex items-center justify-center">
            <Shield className="w-3 h-3 text-white" />
          </div>
          <span className="text-white/30 text-xs">AgentWatch · Production reliability for AI agents</span>
        </div>
        <span className="text-white/20 text-xs font-mono">v1.0.0</span>
      </div>
    </div>
  );
}
