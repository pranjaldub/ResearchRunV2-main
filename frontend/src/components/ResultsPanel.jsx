import { motion } from "framer-motion";
import {
  Gauge, Sparkles, Layers, ShieldCheck, ShieldAlert, Lightbulb,
  Quote, KeyRound, BookOpen, FunctionSquare, Database, Ruler,
  ExternalLink, Network, ChevronDown
} from "lucide-react";
import { useState } from "react";

function Section({ icon: Icon, title, children, tid }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/[0.05] bg-[#0f0f11] p-4"
      data-testid={tid}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-purple-300" />
        <div className="overline">{title}</div>
      </div>
      <div className="mt-3">{children}</div>
    </motion.section>
  );
}

function Bullets({ items }) {
  if (!items || items.length === 0) return <div className="text-xs text-zinc-500">—</div>;
  return (
    <ul className="space-y-1.5">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-zinc-300">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-purple-400" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function ScoreGauge({ label, value, color }) {
  const v = Math.max(0, Math.min(10, Number(value) || 0));
  return (
    <div className="rounded-lg border border-white/[0.05] bg-[#111113] p-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</div>
        <div className="font-mono text-xs text-white">{v.toFixed(1)}</div>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${v * 10}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

function Chips({ items, tone = "purple" }) {
  if (!items || items.length === 0) return <div className="text-xs text-zinc-500">—</div>;
  const toneCls =
    tone === "blue" ? "border-blue-400/20 bg-blue-400/[0.06] text-blue-200" :
    tone === "pink" ? "border-pink-400/20 bg-pink-400/[0.06] text-pink-200" :
    "border-purple-400/20 bg-purple-400/[0.06] text-purple-200";
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t, i) => (
        <span key={i} className={`rounded-full border px-2.5 py-1 text-[11px] ${toneCls}`}>{t}</span>
      ))}
    </div>
  );
}

function RelatedCard({ p, i }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
      className="rounded-lg border border-white/[0.05] bg-[#111113] p-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-white leading-snug line-clamp-2">{p.title}</div>
          <div className="mt-1 text-[11px] text-zinc-500 font-mono">
            {(p.authors || []).slice(0, 3).join(", ")} {p.authors?.length > 3 ? "et al." : ""} · {p.year || "—"} · {p.citation_count || 0} cites
          </div>
        </div>
        {p.url && (
          <a href={p.url} target="_blank" rel="noreferrer" className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] p-1.5 text-zinc-400 hover:text-white transition-colors duration-200">
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      {p.abstract && (
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            className="mt-2 inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors duration-200"
          >
            {open ? "Hide abstract" : "Show abstract"} <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </button>
          {open && <div className="mt-2 text-[11px] leading-relaxed text-zinc-400">{p.abstract}</div>}
        </>
      )}
    </motion.div>
  );
}

export default function ResultsPanel({ data }) {
  const s = data?.summary || {};
  const k = data?.keywords || {};
  const g = data?.gaps || {};
  const n = data?.novelty || {};
  const m = data?.methodology || {};
  const sc = data?.score || {};
  const q = data?.questions || {};
  const rel = data?.related_papers || [];

  return (
    <div className="space-y-4">
      {/* Scores */}
      <Section icon={Gauge} title="Scores" tid="results-scores">
        <div className="grid grid-cols-2 gap-2">
          <ScoreGauge label="Paper" value={sc.paper_score} color="linear-gradient(90deg,#a78bfa,#60a5fa)" />
          <ScoreGauge label="Novelty" value={n.novelty_score} color="linear-gradient(90deg,#60a5fa,#22d3ee)" />
          <ScoreGauge label="Clarity" value={sc.clarity_score} color="linear-gradient(90deg,#f472b6,#a78bfa)" />
          <ScoreGauge label="Complexity" value={sc.complexity_score} color="linear-gradient(90deg,#34d399,#60a5fa)" />
        </div>
        {sc.justification && <div className="mt-3 text-xs leading-relaxed text-zinc-400">{sc.justification}</div>}
      </Section>

      {/* Summary */}
      <Section icon={BookOpen} title="Summary" tid="results-summary">
        {s.tldr && (
          <div className="rounded-lg border border-white/[0.05] bg-[#111113] p-3">
            <div className="overline">TL;DR</div>
            <div className="mt-1.5 text-[13px] leading-relaxed text-zinc-200">{s.tldr}</div>
          </div>
        )}
        {s.abstract && (
          <div className="mt-3 text-[13px] leading-relaxed text-zinc-400">{s.abstract}</div>
        )}
      </Section>

      {(s.key_contributions?.length || s.findings?.length || s.methodology) && (
        <Section icon={Sparkles} title="Contributions & findings" tid="results-contributions">
          {s.methodology && (
            <div className="mb-3 rounded-lg border border-white/[0.05] bg-[#111113] p-3">
              <div className="overline">Methodology</div>
              <div className="mt-1.5 text-[13px] leading-relaxed text-zinc-300">{s.methodology}</div>
            </div>
          )}
          {s.key_contributions?.length > 0 && (
            <>
              <div className="overline mb-1.5">Key contributions</div>
              <Bullets items={s.key_contributions} />
            </>
          )}
          {s.findings?.length > 0 && (
            <div className="mt-4">
              <div className="overline mb-1.5">Findings</div>
              <Bullets items={s.findings} />
            </div>
          )}
        </Section>
      )}

      {/* Methodology review */}
      <div className="grid gap-4 md:grid-cols-2">
        <Section icon={ShieldCheck} title="Strengths" tid="results-strengths">
          <Bullets items={m.strengths} />
        </Section>
        <Section icon={ShieldAlert} title="Weaknesses" tid="results-weaknesses">
          <Bullets items={m.weaknesses} />
        </Section>
      </div>
      {m.reviewer_comments && (
        <Section icon={Quote} title="Reviewer comments" tid="results-reviewer">
          <div className="text-[13px] leading-relaxed text-zinc-300 italic">"{m.reviewer_comments}"</div>
        </Section>
      )}

      {/* Gaps */}
      <Section icon={Layers} title="Research gaps & open problems" tid="results-gaps">
        {g.gaps?.length > 0 && (<>
          <div className="overline mb-1.5">Gaps</div>
          <Bullets items={g.gaps} />
        </>)}
        {g.open_problems?.length > 0 && (
          <div className="mt-3">
            <div className="overline mb-1.5">Open problems</div>
            <Bullets items={g.open_problems} />
          </div>
        )}
        {g.limitations?.length > 0 && (
          <div className="mt-3">
            <div className="overline mb-1.5">Limitations</div>
            <Bullets items={g.limitations} />
          </div>
        )}
      </Section>

      {/* Novelty */}
      {n.reasoning && (
        <Section icon={Sparkles} title="Novelty analysis" tid="results-novelty">
          <div className="text-[13px] leading-relaxed text-zinc-300">{n.reasoning}</div>
          {n.similar_work?.length > 0 && (
            <div className="mt-3">
              <div className="overline mb-1.5">Similar work</div>
              <Bullets items={n.similar_work} />
            </div>
          )}
        </Section>
      )}

      {/* Keywords */}
      <Section icon={KeyRound} title="Keywords & concepts" tid="results-keywords">
        <div className="space-y-3">
          {k.keywords?.length > 0 && <div><div className="overline mb-1.5">Keywords</div><Chips items={k.keywords} tone="purple" /></div>}
          {k.concepts?.length > 0 && <div><div className="overline mb-1.5">Concepts</div><Chips items={k.concepts} tone="blue" /></div>}
          {k.datasets?.length > 0 && <div><div className="overline mb-1.5 flex items-center gap-1"><Database className="h-3 w-3" /> Datasets</div><Chips items={k.datasets} tone="pink" /></div>}
          {k.metrics?.length > 0 && <div><div className="overline mb-1.5 flex items-center gap-1"><Ruler className="h-3 w-3" /> Metrics</div><Chips items={k.metrics} tone="blue" /></div>}
          {k.equations?.length > 0 && (
            <div>
              <div className="overline mb-1.5 flex items-center gap-1"><FunctionSquare className="h-3 w-3" /> Equations</div>
              <div className="space-y-1.5">
                {k.equations.map((e, i) => (
                  <div key={i} className="rounded-md border border-white/[0.05] bg-black/40 px-2.5 py-1.5 font-mono text-[11px] text-zinc-300">{e}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Future work */}
      {(q.questions?.length || q.future_work?.length || q.thesis_topics?.length || q.improvements?.length) ? (
        <Section icon={Lightbulb} title="Future research" tid="results-future">
          {q.questions?.length > 0 && (<><div className="overline mb-1.5">Research questions</div><Bullets items={q.questions} /></>)}
          {q.future_work?.length > 0 && (<div className="mt-3"><div className="overline mb-1.5">Future work</div><Bullets items={q.future_work} /></div>)}
          {q.thesis_topics?.length > 0 && (<div className="mt-3"><div className="overline mb-1.5">Thesis topics</div><Bullets items={q.thesis_topics} /></div>)}
          {q.improvements?.length > 0 && (<div className="mt-3"><div className="overline mb-1.5">Improvements</div><Bullets items={q.improvements} /></div>)}
        </Section>
      ) : null}

      {/* Related papers */}
      {rel.length > 0 && (
        <Section icon={Network} title={`Related papers · ${rel.length}`} tid="results-related">
          <div className="space-y-2">
            {rel.map((p, i) => <RelatedCard key={i} p={p} i={i} />)}
          </div>
        </Section>
      )}
    </div>
  );
}
