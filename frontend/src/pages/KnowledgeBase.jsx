import { useQuery } from "@tanstack/react-query";
import { getHistory } from "@/lib/api";
import { motion } from "framer-motion";
import { Database, KeyRound, Layers, Sparkles } from "lucide-react";

export default function KnowledgeBase() {
  const { data } = useQuery({ queryKey: ["history"], queryFn: getHistory });
  const history = data?.history || [];

  const allKeywords = new Map();
  const allConcepts = new Map();
  const allGaps = [];
  history.forEach((h) => {
    (h.keywords?.keywords || []).forEach((k) => allKeywords.set(k, (allKeywords.get(k) || 0) + 1));
    (h.keywords?.concepts || []).forEach((k) => allConcepts.set(k, (allConcepts.get(k) || 0) + 1));
    (h.gaps?.gaps || []).forEach((g) => allGaps.push(g));
  });
  const kw = [...allKeywords.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);
  const conc = [...allConcepts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-14">
      <div className="overline">Knowledge base</div>
      <h1 className="font-display mt-2 text-2xl font-light tracking-tighter text-white sm:text-3xl md:text-4xl">
        Cross-paper intelligence
      </h1>
      <p className="mt-2 text-sm text-zinc-400">Aggregated concepts, keywords, and gaps across your entire library.</p>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/[0.06] bg-[#111113] p-4 sm:p-6">
          <div className="flex items-center gap-2"><KeyRound className="h-3.5 w-3.5 text-purple-300" /><div className="overline">Top keywords</div></div>
          <div className="mt-4 flex flex-wrap gap-2">
            {kw.length === 0 && <div className="text-xs text-zinc-500">Analyze papers to populate this.</div>}
            {kw.map(([k, c]) => (
              <span key={k} className="rounded-full border border-purple-400/20 bg-purple-400/[0.06] px-2.5 py-1 text-xs text-purple-100" style={{ fontSize: `${Math.min(16, 11 + c)}px` }}>
                {k} <span className="ml-1 text-zinc-500 font-mono text-[10px]">×{c}</span>
              </span>
            ))}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/[0.06] bg-[#111113] p-4 sm:p-6">
          <div className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-blue-300" /><div className="overline">Concepts</div></div>
          <div className="mt-4 flex flex-wrap gap-2">
            {conc.length === 0 && <div className="text-xs text-zinc-500">—</div>}
            {conc.map(([k, c]) => (
              <span key={k} className="rounded-full border border-blue-400/20 bg-blue-400/[0.06] px-2.5 py-1 text-xs text-blue-100">
                {k} <span className="ml-1 text-zinc-500 font-mono text-[10px]">×{c}</span>
              </span>
            ))}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/[0.06] bg-[#111113] p-4 sm:p-6 lg:col-span-2">
          <div className="flex items-center gap-2"><Layers className="h-3.5 w-3.5 text-pink-300" /><div className="overline">Aggregated research gaps</div></div>
          <ul className="mt-4 space-y-2">
            {allGaps.length === 0 && <li className="text-xs text-zinc-500">—</li>}
            {allGaps.slice(0, 40).map((g, i) => (
              <li key={i} className="flex gap-2 rounded-lg border border-white/[0.05] bg-[#0f0f11] p-3 text-[13px] text-zinc-300">
                <Database className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pink-300" />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </motion.section>
      </div>
    </div>
  );
}
