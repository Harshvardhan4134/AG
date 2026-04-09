import { motion } from "framer-motion";
import { Github, Wand2, ArrowRight } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";

const stagger = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

export default function Help() {
  return (
    <DashboardLayout>
      <motion.div initial="hidden" animate="show" variants={stagger} className="max-w-3xl">
        <h1 className="text-2xl font-black text-white">Help Me Wire It</h1>
        <p className="text-white/40 text-sm mt-2">
          This page is the start of the integration assistant. It will scan your setup and generate copy-paste
          instructions.
        </p>

        <div className="mt-8 grid gap-4">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-600/20 flex items-center justify-center">
                <Wand2 className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <div className="text-white font-semibold">Integration wizard (coming next)</div>
                <div className="text-white/40 text-sm mt-1">
                  Answer a few questions (runtime, provider, framework) and get the exact env vars + code snippet.
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-white/20" />
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Github className="w-5 h-5 text-white/70" />
              </div>
              <div className="flex-1">
                <div className="text-white font-semibold">GitHub repo analyser (planned)</div>
                <div className="text-white/40 text-sm mt-1">
                  Paste a GitHub URL and AgentWatch will find LLM call sites and tell you exactly where to wire
                  instrumentation.
                </div>
                <div className="mt-3 text-[11px] font-mono text-white/35">
                  API endpoint planned: <span className="text-white/55">POST /v1/analyse-repo</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-white/20" />
            </div>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}

