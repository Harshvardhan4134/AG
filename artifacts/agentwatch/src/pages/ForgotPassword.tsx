import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, Loader2, AlertTriangle, Mail, CheckCircle } from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";
import { useAuth } from "../lib/auth-context";
import { isFirebaseConfigured } from "../lib/firebase";

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      const msg =
        code === "auth/user-not-found"
          ? "No account uses this email. Check the address or sign up."
          : code === "auth/invalid-email"
            ? "Enter a valid email address."
            : (err as Error).message || "Could not send reset email.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060606] flex items-center justify-center p-8 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-red-950/10 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <button
          type="button"
          onClick={() => navigate("/signin")}
          className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to sign in
        </button>

        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center glow-red ring-1 ring-white/10 bg-white/[0.03]">
            <BrandLogo size={30} className="w-[1.875rem] h-[1.875rem]" />
          </div>
          <span className="font-black text-white text-lg">AgentWatch</span>
        </div>

        <h1 className="text-2xl font-black text-white mb-1">Reset password</h1>
        <p className="text-white/40 text-sm mb-8">
          {sent
            ? "Check your inbox for a link to choose a new password."
            : "Enter your account email and we will send a reset link."}
        </p>

        {!isFirebaseConfigured && (
          <div className="flex items-start gap-3 bg-amber-500/[0.07] border border-amber-500/20 rounded-xl px-4 py-3.5 mb-6">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-400/80 text-xs">
              Set VITE_FIREBASE_* in <span className="font-mono">.env.local</span>.
            </p>
          </div>
        )}

        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-5 mb-6"
          >
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-emerald-300 text-sm font-medium mb-1">Email sent</p>
                <p className="text-emerald-400/70 text-xs leading-relaxed">
                  If an account exists for that address, you will receive instructions shortly. Check spam if you do
                  not see it.
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-3 bg-red-600/10 border border-red-600/25 rounded-xl px-4 py-3.5">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-white/50 text-xs font-medium mb-2">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full bg-white/[0.04] border border-white/[0.09] hover:border-white/[0.14] text-white placeholder-white/[0.18] rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/25 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm transition-all hover:shadow-xl hover:shadow-red-600/25"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Send reset link
            </button>
          </form>
        )}

        <p className="text-center text-white/30 text-sm mt-8">
          <button
            type="button"
            onClick={() => navigate("/signin")}
            className="text-red-400 hover:text-red-300 transition-colors font-semibold"
          >
            Return to sign in
          </button>
        </p>
      </motion.div>
    </div>
  );
}
