import { ReactNode } from "react";
import { useLocation, useRoute } from "wouter";
import { motion } from "framer-motion";
import {
  Shield, LayoutDashboard, Activity, Key, Bell, LogOut, Settings, ChevronRight, Zap
} from "lucide-react";
import { useAuth } from "../lib/auth-context";

const navItems = [
  { icon: <LayoutDashboard className="w-4 h-4" />, label: "Dashboard", path: "/dashboard" },
  { icon: <Activity className="w-4 h-4" />, label: "Traces", path: "/dashboard/traces" },
  { icon: <Bell className="w-4 h-4" />, label: "Alerts", path: "/dashboard/alerts" },
  { icon: <Key className="w-4 h-4" />, label: "API Keys", path: "/dashboard/keys" },
  { icon: <Settings className="w-4 h-4" />, label: "Settings", path: "/dashboard/settings" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#060606] flex">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-56 flex-shrink-0 bg-[#080808] border-r border-white/6 flex flex-col fixed h-full z-20"
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/5">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center group-hover:bg-red-500 transition-colors glow-red">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-black text-white leading-none">AgentWatch</div>
              <div className="text-[9px] text-red-500/70 font-mono mt-0.5">v1.0.0</div>
            </div>
          </button>
        </div>

        {/* Status badge */}
        <div className="px-5 py-3 border-b border-white/5">
          <div className="flex items-center gap-2 bg-emerald-500/8 border border-emerald-500/15 rounded-lg px-3 py-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-emerald-400 text-[10px] font-mono font-medium">All systems normal</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {navItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-red-600/20 border border-red-600/30 flex items-center justify-center text-red-400 text-xs font-bold flex-shrink-0">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">
                {user?.displayName || user?.email?.split("@")[0] || "User"}
              </div>
              <div className="text-white/30 text-[10px] truncate">{user?.email || "demo@agentwatch.io"}</div>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate("/"); }}
            className="w-full flex items-center gap-2 text-white/40 hover:text-white/70 text-xs py-1.5 px-2 rounded-lg hover:bg-white/5 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </motion.aside>

      {/* Main */}
      <main className="flex-1 ml-56 min-h-screen">
        {/* Top bar */}
        <div className="h-14 border-b border-white/5 bg-[#060606]/80 backdrop-blur-sm flex items-center px-8 sticky top-0 z-10">
          <div className="flex items-center gap-2 text-xs text-white/30">
            <Zap className="w-3.5 h-3.5 text-red-500" />
            <span className="font-mono">3 agents active</span>
            <span className="text-white/10">·</span>
            <span>Monitoring in real-time</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => navigate("/dashboard/keys")}
              className="flex items-center gap-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-600/20 text-red-400 text-xs px-3 py-1.5 rounded-lg font-mono transition-all"
            >
              <Key className="w-3 h-3" />
              Get API Key
            </button>
          </div>
        </div>

        <div className="p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, path }: { icon: ReactNode; label: string; path: string }) {
  const [isActive] = useRoute(path === "/dashboard" ? "/dashboard" : path + "/:rest*");
  const [, navigate] = useLocation();

  return (
    <button
      onClick={() => navigate(path)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        isActive
          ? "bg-red-600/15 text-red-400 border border-red-600/20"
          : "text-white/40 hover:text-white/70 hover:bg-white/5"
      }`}
    >
      <span className={isActive ? "text-red-400" : "text-white/30"}>{icon}</span>
      <span>{label}</span>
      {isActive && <ChevronRight className="w-3 h-3 ml-auto text-red-500/50" />}
    </button>
  );
}
