import { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, FilePlus2, FileText, Database, Search,
  Workflow as WorkflowIcon, Settings, Sparkles, ArrowUpRight, Menu, X
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, tid: "nav-dashboard" },
  { to: "/upload", label: "New Analysis", icon: FilePlus2, tid: "nav-upload" },
  { to: "/papers", label: "My Papers", icon: FileText, tid: "nav-papers" },
  { to: "/knowledge", label: "Knowledge Base", icon: Database, tid: "nav-knowledge" },
  { to: "/search", label: "Research Search", icon: Search, tid: "nav-search" },
  { to: "/workflow", label: "Workflow", icon: WorkflowIcon, tid: "nav-workflow" },
  { to: "/settings", label: "Settings", icon: Settings, tid: "nav-settings" },
];

function SidebarContent({ onNavigate }) {
  const nav = useNavigate();
  return (
    <div className="flex h-full flex-col">
      <button
        data-testid="sidebar-brand"
        onClick={() => { nav("/"); onNavigate?.(); }}
        className="flex items-center gap-2.5 px-6 pt-7 pb-5 text-left group"
      >
        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <div className="font-display text-[15px] font-semibold tracking-tight text-white">Research Run</div>
          <div className="overline mt-0.5">Multi-agent workspace</div>
        </div>
      </button>

      <nav className="mt-2 flex flex-col gap-0.5 px-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            data-testid={item.tid}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-200 ${
                isActive
                  ? "bg-white/[0.06] text-white"
                  : "text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-100"
              }`
            }
          >
            <item.icon className="h-4 w-4" strokeWidth={1.7} />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto p-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-xl border border-white/10 bg-[#111113] p-4"
        >
          <div className="overline">Powered by</div>
          <div className="mt-1 font-display text-lg font-semibold text-white">Groq Inference</div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Ultra-fast Llama across 10 orchestrated research agents.
          </p>
          <div className="mt-3 flex items-center gap-1 text-xs text-purple-400">
            <span>Live inference</span>
            <ArrowUpRight className="h-3 w-3" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function AppShell() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();

  const currentLabel = NAV.find((n) => loc.pathname.startsWith(n.to))?.label || "Research Run";

  return (
    <div className="relative min-h-screen w-full">
      {/* Ambient gradient blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[420px] w-[420px] rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-[420px] w-[420px] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[360px] w-[360px] rounded-full bg-pink-500/5 blur-[120px]" />
      </div>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-white/[0.05] bg-[#09090B]/85 px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-2">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                data-testid="mobile-menu-btn"
                aria-label="Open menu"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-zinc-200"
              >
                <Menu className="h-4 w-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-r border-white/5 bg-[#0b0b0e]/95 p-0 text-white [&>button]:hidden">
              <div className="flex items-center justify-end p-2">
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  data-testid="mobile-menu-close"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-zinc-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <SidebarContent onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <button onClick={() => nav("/")} className="flex items-center gap-2" data-testid="mobile-brand">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-display text-sm font-semibold text-white">Research Run</span>
          </button>
        </div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{currentLabel}</div>
      </div>

      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:w-60 lg:w-72 shrink-0 flex-col border-r border-white/5 bg-[#0b0b0e]/60 backdrop-blur-xl">
          <SidebarContent />
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
