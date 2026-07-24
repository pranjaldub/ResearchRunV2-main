import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { semanticSearch, searchPapers } from "@/lib/api";
import { Search as SearchIcon, ExternalLink, BookOpen, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function Search() {
  const [q, setQ] = useState("");
  const [scope, setScope] = useState("external"); // external | mine

  const local = useQuery({
    queryKey: ["search-mine", q],
    queryFn: () => searchPapers(q),
    enabled: scope === "mine" && q.length > 1,
  });
  const external = useQuery({
    queryKey: ["search-external", q],
    queryFn: () => semanticSearch(q),
    enabled: scope === "external" && q.length > 2,
  });

  const results = scope === "mine" ? (local.data?.results || []) : (external.data?.results || []);
  const loading = scope === "mine" ? local.isFetching : external.isFetching;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <div className="overline">Search</div>
      <h1 className="font-display mt-2 text-2xl font-light tracking-tighter text-white sm:text-3xl md:text-4xl">
        Semantic research search
      </h1>
      <p className="mt-2 text-sm text-zinc-400">Search 220M+ papers via Semantic Scholar or your own library.</p>

      <div className="mt-8 rounded-2xl border border-white/[0.06] bg-[#111113] p-2">
        <div className="flex items-center gap-2 rounded-xl bg-[#0f0f11] px-4 py-3">
          <SearchIcon className="h-4 w-4 text-zinc-500" />
          <input
            data-testid="search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. 'diffusion models for protein folding'"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-purple-300" />}
        </div>
        <div className="mt-2 flex items-center gap-1 px-2 pb-2">
          {[
            { id: "external", label: "Semantic Scholar" },
            { id: "mine", label: "My library" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setScope(t.id)}
              data-testid={`scope-${t.id}`}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors duration-200 ${scope === t.id ? "bg-white/[0.08] text-white" : "text-zinc-500 hover:text-zinc-300"}`}
            >{t.label}</button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {q.length < 2 && (
          <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-zinc-500">
            Type a query to begin.
          </div>
        )}
        {results.map((p, i) => (
          <motion.div
            key={p.paper_id || p.id || i}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
            className="rounded-xl border border-white/[0.05] bg-[#111113] p-4 hover:border-white/[0.14] transition-colors duration-200"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[14px] font-medium text-white leading-snug">{p.title}</div>
                <div className="mt-1 text-[11px] text-zinc-500 font-mono">
                  {(p.authors || []).slice(0, 4).join(", ")} · {p.year || "—"} · {p.citation_count || 0} cites {p.venue ? ` · ${p.venue}` : ""}
                </div>
                {p.abstract && <div className="mt-2 text-[12px] leading-relaxed text-zinc-400 line-clamp-3">{p.abstract}</div>}
              </div>
              {scope === "mine" ? (
                <Link to={`/paper/${p.id}`} className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] p-2 text-zinc-400 hover:text-white transition-colors duration-200">
                  <BookOpen className="h-3.5 w-3.5" />
                </Link>
              ) : (
                p.url && (
                  <a href={p.url} target="_blank" rel="noreferrer" className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] p-2 text-zinc-400 hover:text-white transition-colors duration-200">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
