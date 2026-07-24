import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

function fmtTime(ts) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

const AGENT_LABEL = {
  parser: "parser", summary: "summarizer", keywords: "keywords",
  gaps: "research-gap", novelty: "novelty", methodology: "methodology",
  score: "scoring", related: "related-work", questions: "questions", report: "report",
};

export default function ExecutionConsole({ logs, running }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  return (
    <div className="flex h-[540px] flex-col">
      <div ref={ref} className="flex-1 overflow-auto rounded-lg border border-white/[0.05] bg-black/40 p-3 font-mono text-[11px] leading-relaxed">
        {logs.length === 0 && (
          <div className="text-zinc-600">// waiting for events...</div>
        )}
        {logs.map((l, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
            className="flex gap-2 py-0.5"
          >
            <span className="text-zinc-600 shrink-0">{fmtTime(l.ts || Date.now())}</span>
            {l.type === "workflow_start" && <span className="text-purple-300">▶ workflow started · {l.agents?.length || 0} agents queued</span>}
            {l.type === "agent_start" && <span className="text-blue-300">→ agent <b className="text-white">{AGENT_LABEL[l.agent] || l.agent}</b> running…</span>}
            {l.type === "agent_done" && <span className="text-emerald-400">✓ agent <b className="text-white">{AGENT_LABEL[l.agent] || l.agent}</b> completed <span className="text-zinc-500">· {((l.duration_ms||0)/1000).toFixed(2)}s</span></span>}
            {l.type === "agent_log" && <span className="text-yellow-300">! {l.agent}: {l.message}</span>}
            {l.type === "workflow_done" && <span className="text-emerald-400">✓ workflow complete</span>}
            {l.type === "workflow_error" && <span className="text-red-400">✗ error: {l.error}</span>}
          </motion.div>
        ))}
        {running && (
          <div className="mt-1 text-purple-300 blink-cursor">streaming</div>
        )}
      </div>
    </div>
  );
}
