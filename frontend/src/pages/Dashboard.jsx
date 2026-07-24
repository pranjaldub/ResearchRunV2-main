import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { getStats, listPapers } from "@/lib/api";
import {
  FileText, Layers, Sparkles, Gauge, ArrowUpRight, FilePlus2, Pin, Clock
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar, CartesianGrid, Cell,
} from "recharts";

function Stat({ icon: Icon, label, value, hint, tid }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111113] p-5"
      data-testid={tid}
    >
      <div className="flex items-center justify-between">
        <div className="overline">{label}</div>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03]">
          <Icon className="h-3.5 w-3.5 text-purple-300" />
        </div>
      </div>
      <div className="mt-3 font-display text-3xl font-light tracking-tighter text-white">{value}</div>
      {hint && <div className="mt-1.5 text-xs text-zinc-500">{hint}</div>}
      <div className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-purple-500/10 blur-2xl" />
    </motion.div>
  );
}

export default function Dashboard() {
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: getStats });
  const { data: papersData } = useQuery({ queryKey: ["papers"], queryFn: listPapers });
  const papers = papersData?.papers || [];
  const pinned = papers.filter((p) => p.pinned);

  const chartData = (stats?.recent_analyses || [])
    .slice()
    .reverse()
    .map((a, i) => ({
      idx: i + 1,
      score: (a.score?.paper_score || 0) * 10,
      novelty: (a.novelty?.novelty_score || 0) * 10,
    }));

  const scoreBar = [
    { name: "Impact", v: 0 },
    { name: "Novelty", v: 0 },
    { name: "Clarity", v: 0 },
    { name: "Rigor", v: 0 },
  ];
  const recent = stats?.recent_analyses || [];
  if (recent.length) {
    const avg = (k) =>
      Math.round(
        (recent.reduce((s, a) => s + (a.score?.[k] || 0), 0) / recent.length) * 10
      );
    scoreBar[0].v = avg("impact_score");
    scoreBar[1].v = Math.round(
      (recent.reduce((s, a) => s + (a.novelty?.novelty_score || 0), 0) / recent.length) * 10
    );
    scoreBar[2].v = avg("clarity_score");
    scoreBar[3].v = avg("complexity_score");
  }
  const barColors = ["#a78bfa", "#60a5fa", "#f472b6", "#34d399"];

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10 lg:px-10 lg:py-14">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="overline">Workspace</div>
          <h1 className="font-display mt-2 text-3xl font-light tracking-tighter text-white sm:text-4xl">
            Welcome back, researcher.
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Your multi-agent lab. Upload a paper to start a fresh literature review run.
          </p>
        </div>
        <Link
          to="/upload"
          data-testid="dashboard-new-analysis"
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#09090B] hover:-translate-y-0.5 transition-transform duration-200"
        >
          <FilePlus2 className="h-4 w-4" /> New analysis
        </Link>
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-3 sm:gap-4 sm:mt-10 grid-cols-2 lg:grid-cols-4">
        <Stat icon={FileText} label="Papers" value={stats?.total_papers ?? 0} hint="uploaded to workspace" tid="stat-papers" />
        <Stat icon={Layers} label="Research gaps" value={stats?.gaps_found ?? 0} hint="found by agents" tid="stat-gaps" />
        <Stat icon={Sparkles} label="Keywords" value={stats?.keywords_generated ?? 0} hint="extracted concepts" tid="stat-keywords" />
        <Stat icon={Gauge} label="Avg. score" value={(stats?.average_score ?? 0).toFixed(1)} hint="paper quality (0-10)" tid="stat-score" />
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-[#111113] p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="overline">Analysis quality over time</div>
              <div className="font-display mt-1 text-lg font-medium text-white">Paper vs novelty score</div>
            </div>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.length ? chartData : [{ idx: 1, score: 0, novelty: 0 }]}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="idx" stroke="#52525b" fontSize={11} />
                <YAxis stroke="#52525b" fontSize={11} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "rgba(9,9,11,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }} />
                <Area type="monotone" dataKey="score" stroke="#a78bfa" strokeWidth={2} fill="url(#g1)" />
                <Area type="monotone" dataKey="novelty" stroke="#60a5fa" strokeWidth={2} fill="url(#g2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-[#111113] p-4 sm:p-6">
          <div className="overline">Average sub-scores</div>
          <div className="font-display mt-1 text-lg font-medium text-white">Distribution</div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreBar} layout="vertical" margin={{ left: 8 }}>
                <XAxis type="number" stroke="#52525b" fontSize={11} domain={[0, 100]} />
                <YAxis type="category" dataKey="name" stroke="#a1a1aa" fontSize={12} width={70} />
                <Tooltip contentStyle={{ background: "rgba(9,9,11,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }} />
                <Bar dataKey="v" radius={[6, 6, 6, 6]}>
                  {scoreBar.map((_, i) => <Cell key={i} fill={barColors[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent + Pinned */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-[#111113] p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="overline">Recent papers</div>
              <div className="font-display mt-1 text-lg font-medium text-white">Analysis history</div>
            </div>
            <Link to="/papers" className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors duration-200">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {papers.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">
                No papers yet. Upload your first PDF to begin.
              </div>
            )}
            {papers.slice(0, 6).map((p) => (
              <Link
                key={p.id}
                to={`/paper/${p.id}`}
                data-testid={`recent-paper-${p.id}`}
                className="group flex items-center gap-4 rounded-xl border border-white/[0.05] bg-[#0f0f11] p-4 hover:border-white/[0.14] transition-colors duration-200"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                  <FileText className="h-4 w-4 text-zinc-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">{p.title}</div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-zinc-500">
                    <span className="font-mono">{p.pages} pages</span>
                    <span className={`inline-flex items-center gap-1 ${p.status === "completed" ? "text-emerald-400" : p.status === "analyzing" ? "text-purple-300" : "text-zinc-500"}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {p.status}
                    </span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-zinc-600 group-hover:text-white transition-colors duration-200" />
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-[#111113] p-6">
          <div className="overline">Pinned</div>
          <div className="font-display mt-1 text-lg font-medium text-white">Favourites</div>
          <div className="mt-4 space-y-2">
            {pinned.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-zinc-500">
                Pin papers to keep them handy.
              </div>
            )}
            {pinned.map((p) => (
              <Link key={p.id} to={`/paper/${p.id}`} className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-[#0f0f11] p-3 hover:border-white/[0.14] transition-colors duration-200">
                <Pin className="h-3.5 w-3.5 text-purple-300" />
                <div className="min-w-0 flex-1 truncate text-sm text-white">{p.title}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
