import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Eye, EyeOff, Loader2, FlaskConical, AlertTriangle, CheckCircle, Zap } from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";
import { useAuth } from "../lib/auth-context";
import { isFirebaseConfigured } from "../lib/firebase";

export default function SignIn() {
  const [, navigate] = useLocation();
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate("/dashboard");
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060606] flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col w-[480px] flex-shrink-0 relative overflow-hidden border-r border-white/[0.06]">
        {/* Background effects */}
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-red-900/10 via-transparent to-transparent" />
        <div className="absolute top-[-80px] left-[-80px] w-[400px] h-[400px] bg-red-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-red-900/15 rounded-full blur-[80px]" />

        <div className="relative z-10 flex flex-col h-full p-10">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-auto">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center glow-red ring-1 ring-white/10 bg-white/[0.03]">
              <BrandLogo size={30} className="w-[1.875rem] h-[1.875rem]" />
            </div>
            <span className="font-black text-white text-lg">AgentWatch</span>
          </div>

          {/* Main content */}
          <div className="mb-auto">
            <h2 className="text-4xl font-black text-white leading-tight mb-4">
              Monitor your AI agents
              <br />
              <span className="gradient-text">in production.</span>
            </h2>
            <p className="text-white/40 text-sm leading-relaxed mb-10">
              Catch hallucinations, latency spikes, and silent failures before they reach your users.
            </p>

            {/* Feature list */}
            <div className="space-y-4">
              {[
                { icon: <AlertTriangle className="w-4 h-4" />, color: "text-red-400", bg: "bg-red-600/10 border-red-600/20", text: "Hallucination detection in real-time" },
                { icon: <Zap className="w-4 h-4" />,           color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", text: "Latency spike alerts + LLM analysis" },
                { icon: <CheckCircle className="w-4 h-4" />,   color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", text: "2-line Python SDK · zero friction" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className={`w-8 h-8 rounded-lg ${item.bg} border flex items-center justify-center ${item.color} flex-shrink-0`}>
                    {item.icon}
                  </div>
                  <span className="text-white/60 text-sm">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Decorative mini dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7 }}
            className="mt-auto"
          >
            <div className="red-border-glow rounded-xl overflow-hidden bg-[#080808]/80 backdrop-blur-sm">
              <div className="px-4 py-3 border-b border-white/[0.05] flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-white/40 text-[11px] font-mono">Live monitoring</span>
              </div>
              <div className="p-3 space-y-2">
                {[
                  { run: "run_8f3a", agent: "support-bot", flag: "hallucination", status: "flagged" },
                  { run: "run_3e9c", agent: "support-bot", flag: "",              status: "ok" },
                  { run: "run_2b1d", agent: "email-agent", flag: "error_swallowed", status: "flagged" },
                ].map((r, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5 text-[11px]">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.status === "ok" ? "bg-emerald-500" : "bg-red-500"}`} />
                    <span className="font-mono text-white/30 w-16">{r.run}</span>
                    <span className="text-white/50 flex-1">{r.agent}</span>
                    {r.flag && (
                      <span className="bg-red-600/15 text-red-400/90 border border-red-600/20 px-1.5 py-0.5 rounded font-mono text-[10px]">{r.flag}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-red-950/10 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center glow-red ring-1 ring-white/10 bg-white/[0.03]">
              <BrandLogo size={30} className="w-[1.875rem] h-[1.875rem]" />
            </div>
            <span className="font-black text-white text-lg">AgentWatch</span>
          </div>

          <h1 className="text-2xl font-black text-white mb-1">Welcome back</h1>
          <p className="text-white/40 text-sm mb-8">Sign in to your dashboard</p>

          {!isFirebaseConfigured && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-start gap-3 bg-amber-500/[0.07] border border-amber-500/20 rounded-xl px-4 py-3.5 mb-6"
            >
              <FlaskConical className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-400 text-xs font-bold mb-0.5">Configuration required</p>
                <p className="text-amber-400/65 text-xs leading-relaxed">
                  Set VITE_FIREBASE_* and VITE_API_URL in <span className="font-mono">.env.local</span>.
                </p>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 bg-red-600/10 border border-red-600/25 rounded-xl px-4 py-3.5 mb-6"
            >
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-xs">{error}</p>
            </motion.div>
          )}

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-white py-3 rounded-xl font-medium text-sm transition-all mb-5 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/[0.07]" />
            <span className="text-white/20 text-xs">or</span>
            <div className="flex-1 h-px bg-white/[0.07]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/50 text-xs font-medium mb-2">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full bg-white/[0.04] border border-white/[0.09] hover:border-white/[0.14] text-white placeholder-white/[0.18] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/25 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-white/50 text-xs font-medium">Password</label>
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-xs text-white/35 hover:text-red-400/90 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-white/[0.04] border border-white/[0.09] hover:border-white/[0.14] text-white placeholder-white/[0.18] rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/25 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/55 transition-colors p-1"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm transition-all hover:shadow-xl hover:shadow-red-600/25 hover:-translate-y-0.5"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign In
            </button>
          </form>

          <p className="text-center text-white/30 text-sm mt-6">
            No account?{" "}
            <button
              onClick={() => navigate("/signup")}
              className="text-red-400 hover:text-red-300 transition-colors font-semibold"
            >
              Create one free
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
