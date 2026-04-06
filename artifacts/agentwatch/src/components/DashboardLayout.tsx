import { ReactNode, useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Activity, Key, Bell, LogOut, Settings, ChevronRight, Zap, BookOpen
} from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { useAuth } from "../lib/auth-context";
import { getStoredApiKey } from "../lib/api";

const navItems = [
  { icon: <LayoutDashboard className="w-4 h-4" />, label: "Dashboard", path: "/dashboard" },
  { icon: <Activity className="w-4 h-4" />,        label: "Traces",    path: "/dashboard/traces" },
  { icon: <Bell className="w-4 h-4" />,            label: "Alerts",    path: "/dashboard/alerts" },
  { icon: <Key className="w-4 h-4" />,             label: "API Keys",  path: "/dashboard/keys" },
  { icon: <Settings className="w-4 h-4" />,        label: "Settings",  path: "/dashboard/settings" },
  { icon: <BookOpen className="w-4 h-4" />,        label: "Docs",      path: "/docs" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const initial = user?.email?.charAt(0).toUpperCase() || "U";
  const [hasApiKey, setHasApiKey] = useState(!!getStoredApiKey());
  useEffect(() => {
    setHasApiKey(!!getStoredApiKey());
    const t = setInterval(() => setHasApiKey(!!getStoredApiKey()), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#060606] flex">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-56 flex-shrink-0 flex flex-col fixed h-full z-20 border-r border-white/[0.06]"
        style={{ background: "linear-gradient(180deg, #090909 0%, #070707 100%)" }}
      >
        {/* Top glow accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-600/40 to-transparent" />

        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/[0.05]">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2.5 group w-full"
          >
            <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center glow-red ring-1 ring-white/10 bg-white/[0.03] group-hover:ring-red-500/30 transition-all group-hover:scale-105">
              <BrandLogo size={26} className="w-[1.625rem] h-[1.625rem]" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-black text-white leading-none">AgentWatch</div>
              <div className="text-[9px] text-red-500/60 font-mono mt-0.5 tracking-wider">v1.0.0 · BETA</div>
            </div>
          </button>
        </div>

        {/* Status badge */}
        <div className="px-4 py-3 border-b border-white/[0.04]">
          {!hasApiKey ? (
            <button
              type="button"
              onClick={() => navigate("/dashboard/keys")}
              className="w-full flex items-center gap-2 bg-amber-500/[0.08] border border-amber-500/[0.15] rounded-lg px-3 py-2 text-left"
            >
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
              <span className="text-amber-400/80 text-[10px] font-mono font-medium">Add API key</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-500/[0.07] border border-emerald-500/[0.15] rounded-lg px-3 py-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-emerald-400/80 text-[10px] font-mono font-medium">API connected</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </nav>

        {/* Bottom glow */}
        <div className="absolute bottom-[100px] left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

        {/* User section */}
        <div className="border-t border-white/[0.05] p-4">
          <div className="flex items-center gap-3 mb-3 p-2 rounded-xl hover:bg-white/[0.03] transition-colors cursor-default">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600/40 to-red-900/40 border border-red-600/30 flex items-center justify-center text-red-300 text-xs font-black flex-shrink-0">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate">
                {user?.displayName || user?.email?.split("@")[0] || "User"}
              </div>
              <div className="text-white/30 text-[10px] truncate">{user?.email || "—"}</div>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate("/"); }}
            className="w-full flex items-center gap-2 text-white/35 hover:text-red-400 text-xs py-2 px-3 rounded-lg hover:bg-red-600/8 transition-all group"
          >
            <LogOut className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            Sign out
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 ml-56 min-h-screen">
        {/* Top bar */}
        <div className="h-14 border-b border-white/[0.05] bg-[#060606]/90 backdrop-blur-md flex items-center px-8 sticky top-0 z-10">
          <div className="flex items-center gap-2 text-xs text-white/25">
            <Zap className="w-3.5 h-3.5 text-red-500/70" />
            <span className="font-mono">3 agents active</span>
            <span className="text-white/10 mx-1">·</span>
            <span>Monitoring in real-time</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => navigate("/dashboard/keys")}
              className="flex items-center gap-1.5 bg-red-600/10 hover:bg-red-600/18 border border-red-600/20 hover:border-red-600/35 text-red-400 text-xs px-3 py-1.5 rounded-lg font-mono transition-all"
            >
              <Key className="w-3 h-3" />
              Get API Key
            </button>
          </div>
        </div>

        <div className="p-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, path }: { icon: ReactNode; label: string; path: string }) {
  const routePattern =
    path === "/dashboard"
      ? "/dashboard"
      : path === "/docs"
        ? "/docs"
        : path + "/:rest*";
  const [isActive] = useRoute(routePattern);
  const [, navigate] = useLocation();

  return (
    <button
      onClick={() => navigate(path)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative group ${
        isActive
          ? "bg-red-600/12 text-red-400 border border-red-600/18 shadow-sm"
          : "text-white/35 hover:text-white/65 hover:bg-white/[0.04] border border-transparent"
      }`}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-red-500 rounded-full" />
      )}
      <span className={`transition-colors ${isActive ? "text-red-400" : "text-white/25 group-hover:text-white/50"}`}>
        {icon}
      </span>
      <span>{label}</span>
      {isActive && <ChevronRight className="w-3 h-3 ml-auto text-red-500/40" />}
    </button>
  );
}
