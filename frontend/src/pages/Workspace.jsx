import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPaper, streamAnalysis } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import ReactFlow, { Background, Controls, MarkerType } from "reactflow";
import "reactflow/dist/style.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import AgentNode from "@/components/AgentNode";
import ResultsPanel from "@/components/ResultsPanel";
import ExecutionConsole from "@/components/ExecutionConsole";
import {
  Play, Loader2, ArrowLeft, FileText, Sparkles, Terminal, Copy, Download,
  FileJson, ScrollText, BookOpenText, RefreshCw
} from "lucide-react";

const AGENT_ORDER = [
  "parser", "summary", "keywords", "gaps", "novelty",
  "methodology", "score", "related", "questions", "report",
];

const nodeTypes = { agent: AgentNode };

export default function Workspace() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["paper", id],
    queryFn: () => getPaper(id),
  });
  const paper = data?.paper;
  const initialAnalysis = data?.analysis;

  // live state
  const [agents, setAgents] = useState({}); // id -> { status, output, duration_ms }
  const [logs, setLogs] = useState([]);
  const [current, setCurrent] = useState(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("results"); // results | logs | report
  const streamRef = useRef(null);

  // Hydrate from persisted analysis
  useEffect(() => {
    if (initialAnalysis) {
      setResult({
        summary: initialAnalysis.summary,
        keywords: initialAnalysis.keywords,
        gaps: initialAnalysis.gaps,
        novelty: initialAnalysis.novelty,
        methodology: initialAnalysis.methodology,
        score: initialAnalysis.score,
        questions: initialAnalysis.questions,
        related_papers: initialAnalysis.related_papers || [],
        final_report: initialAnalysis.final_report,
      });
      const seeded = {};
      AGENT_ORDER.forEach((a) => (seeded[a] = { status: "completed", duration_ms: 0 }));
      setAgents(seeded);
      setLogs(initialAnalysis.execution_log || []);
    }
  }, [initialAnalysis]);

  const startAnalysis = () => {
    if (running) return;
    setAgents({});
    setLogs([]);
    setCurrent(null);
    setResult(null);
    setRunning(true);
    setActiveTab("logs");
    toast.info("Analysis started — 10 agents dispatched.");
    const stop = streamAnalysis(id, {
      onEvent: (evt) => {
        setLogs((l) => [...l, { ...evt, ts: Date.now() }]);
        if (evt.type === "workflow_start") return;
        if (evt.type === "agent_start") {
          setCurrent(evt.agent);
          setAgents((a) => ({ ...a, [evt.agent]: { status: "running" } }));
        }
        if (evt.type === "agent_done") {
          setAgents((a) => ({
            ...a,
            [evt.agent]: { status: "completed", output: evt.output, duration_ms: evt.duration_ms },
          }));
        }
        if (evt.type === "workflow_done") {
          setResult(evt.state);
          setCurrent(null);
          setActiveTab("results");
          toast.success("Analysis complete!");
        }
        if (evt.type === "workflow_error") {
          toast.error("Workflow failed: " + evt.error);
          setRunning(false);
        }
      },
      onDone: () => {
        setRunning(false);
        qc.invalidateQueries({ queryKey: ["paper", id] });
        qc.invalidateQueries({ queryKey: ["papers"] });
        qc.invalidateQueries({ queryKey: ["stats"] });
      },
      onError: (e) => {
        toast.error("Stream error: " + e.message);
        setRunning(false);
      },
    });
    streamRef.current = stop;
  };

  useEffect(() => () => streamRef.current?.(), []);

  useEffect(() => {
    if (sp.get("autostart") === "1" && paper && !running && !initialAnalysis) {
      const t = setTimeout(startAnalysis, 300);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paper]);

  // Build React Flow nodes/edges
  const { nodes, edges } = useMemo(() => {
    const positions = AGENT_ORDER.map((a, i) => ({
      x: 40 + (i % 2) * 220,
      y: 20 + Math.floor(i / 2) * 110,
    }));
    const nodes = AGENT_ORDER.map((a, i) => ({
      id: a,
      type: "agent",
      position: positions[i],
      data: {
        agentId: a,
        status: agents[a]?.status || "pending",
        duration: agents[a]?.duration_ms,
        isCurrent: current === a,
      },
    }));
    const edges = [];
    for (let i = 0; i < AGENT_ORDER.length - 1; i++) {
      const from = AGENT_ORDER[i], to = AGENT_ORDER[i + 1];
      const active = agents[from]?.status === "completed" && (agents[to]?.status === "running" || agents[to]?.status === "completed");
      edges.push({
        id: `${from}-${to}`,
        source: from,
        target: to,
        animated: active,
        style: { stroke: active ? "#a78bfa" : "rgba(255,255,255,0.10)" },
        markerEnd: { type: MarkerType.ArrowClosed, color: active ? "#a78bfa" : "rgba(255,255,255,0.20)" },
      });
    }
    return { nodes, edges };
  }, [agents, current]);

  const copyReport = () => {
    const text = result?.final_report || "";
    navigator.clipboard.writeText(text);
    toast.success("Report copied.");
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(result || {}, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${paper?.title || "analysis"}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-purple-300" />
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <div className="font-display text-xl text-white">Paper not found</div>
        <Link to="/papers" className="mt-4 inline-flex text-sm text-purple-300 hover:underline">
          Back to papers
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link to="/papers" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors duration-200">
            <ArrowLeft className="h-3 w-3" /> back to papers
          </Link>
          <h1 className="font-display mt-2 text-xl font-light leading-tight tracking-tighter text-white sm:text-2xl md:text-3xl line-clamp-2">
            {paper.title}
          </h1>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500 font-mono">
            <span>{paper.pages} pages</span>
            <span>{paper.word_count?.toLocaleString()} words</span>
            <span className="hidden sm:inline">id · {paper.id.slice(0, 8)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {result && !running && (
            <>
              <button onClick={copyReport} data-testid="copy-report" className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/[0.06] transition-colors duration-200"><Copy className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Copy report</span><span className="sm:hidden">Copy</span></button>
              <button onClick={downloadJSON} data-testid="download-json" className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/[0.06] transition-colors duration-200"><Download className="h-3.5 w-3.5" /> JSON</button>
            </>
          )}
          <button
            onClick={startAnalysis}
            disabled={running}
            data-testid="run-analysis-btn"
            className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-medium text-[#09090B] hover:-translate-y-0.5 transition-transform duration-200 disabled:opacity-60 sm:px-4 sm:text-sm"
          >
            {running ? <><Loader2 className="h-4 w-4 animate-spin" /> <span className="hidden sm:inline">Running…</span></> : result ? <><RefreshCw className="h-4 w-4" /> Re-run</> : <><Play className="h-4 w-4" /> <span className="hidden sm:inline">Run analysis</span><span className="sm:hidden">Run</span></>}
          </button>
        </div>
      </div>

      {/* 3-pane responsive layout */}
      <div className="mt-6 grid gap-4 lg:grid-cols-12">
        {/* Left: paper preview — becomes full-width accordion on mobile */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#111113] p-4 sm:p-5 lg:col-span-3 order-1">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-zinc-400" />
            <div className="overline">Paper</div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-lg border border-white/[0.05] bg-[#0f0f11] p-3">
              <div className="overline">File</div>
              <div className="mt-1 truncate text-xs text-zinc-300 font-mono">{paper.file_name}</div>
            </div>
            <div className="rounded-lg border border-white/[0.05] bg-[#0f0f11] p-3">
              <div className="overline">Abstract</div>
              <div className="mt-2 text-[11px] leading-relaxed text-zinc-400 line-clamp-[10] lg:line-clamp-[18]">{paper.abstract}</div>
            </div>
          </div>
        </div>

        {/* Middle: React Flow */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0b0b0e] overflow-hidden lg:col-span-5 order-2">
          <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-300" />
              <div className="text-xs text-zinc-300">Agent workflow</div>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono">
              {running ? `running · ${current || "…"}` : result ? "complete" : "idle"}
            </div>
          </div>
          <div className="h-[360px] sm:h-[480px] lg:h-[620px]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              proOptions={{ hideAttribution: true }}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              panOnDrag
              zoomOnScroll
            >
              <Background gap={22} size={1} color="rgba(255,255,255,0.05)" />
              <Controls showInteractive={false} className="!bg-transparent !border-none" />
            </ReactFlow>
          </div>
        </div>

        {/* Right: tabs (results/logs/report) */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#111113] overflow-hidden flex flex-col min-h-[480px] lg:col-span-4 lg:min-h-[620px] order-3">
          <div className="flex items-center overflow-x-auto border-b border-white/[0.05]">
            {[
              { id: "results", label: "Results", icon: BookOpenText },
              { id: "logs", label: "Console", icon: Terminal },
              { id: "report", label: "Report", icon: ScrollText },
              { id: "json", label: "JSON", icon: FileJson },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                data-testid={`tab-${t.id}`}
                className={`relative flex shrink-0 items-center gap-1.5 px-3.5 py-3 text-xs transition-colors duration-200 sm:px-4 ${
                  activeTab === t.id ? "text-white" : "text-zinc-500 hover:text-zinc-200"
                }`}
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
                {activeTab === t.id && (
                  <motion.span layoutId="tab-underline" className="absolute inset-x-3 -bottom-px h-px bg-gradient-to-r from-purple-400 via-blue-400 to-pink-400" />
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-auto p-4 sm:p-5">
            <AnimatePresence mode="wait">
              {activeTab === "results" && (
                <motion.div key="r" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {result ? <ResultsPanel data={result} /> : <EmptyResults running={running} />}
                </motion.div>
              )}
              {activeTab === "logs" && (
                <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ExecutionConsole logs={logs} running={running} />
                </motion.div>
              )}
              {activeTab === "report" && (
                <motion.div key="rp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {result?.final_report ? (
                    <article className="prose prose-invert prose-sm max-w-none prose-headings:font-display prose-headings:tracking-tight prose-p:text-zinc-300 prose-strong:text-white prose-code:text-purple-300 prose-a:text-blue-400">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.final_report}</ReactMarkdown>
                    </article>
                  ) : (
                    <EmptyResults running={running} label="Report will appear once the swarm finishes." />
                  )}
                </motion.div>
              )}
              {activeTab === "json" && (
                <motion.pre key="j" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="font-mono text-[11px] leading-relaxed text-zinc-300 whitespace-pre-wrap break-words">
                  {JSON.stringify(result || {}, null, 2)}
                </motion.pre>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyResults({ running, label }) {
  return (
    <div className="flex h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 p-8 text-center">
      {running ? (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-purple-300" />
          <div className="mt-4 text-sm text-zinc-300">Agents are working…</div>
          <div className="mt-1 text-xs text-zinc-500">Watch the workflow graph for live progress.</div>
        </>
      ) : (
        <>
          <Sparkles className="h-6 w-6 text-zinc-500" />
          <div className="mt-4 text-sm text-zinc-300">Nothing yet</div>
          <div className="mt-1 text-xs text-zinc-500">{label || "Click 'Run analysis' to start the swarm."}</div>
        </>
      )}
    </div>
  );
}
