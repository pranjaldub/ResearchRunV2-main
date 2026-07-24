import { Handle, Position } from "reactflow";
import {
  FileText, BookOpen, ScanSearch, Layers, Sparkles, Shield, LineChart,
  Network, Lightbulb, MessageSquare, Loader2, CheckCircle2, Clock,
} from "lucide-react";

const AGENT_META = {
  parser:     { name: "Parser",       icon: FileText,       hue: "purple" },
  summary:    { name: "Summarizer",   icon: BookOpen,       hue: "purple" },
  keywords:   { name: "Keywords",     icon: ScanSearch,     hue: "blue" },
  gaps:       { name: "Research Gap", icon: Layers,         hue: "pink" },
  novelty:    { name: "Novelty",      icon: Sparkles,       hue: "purple" },
  methodology:{ name: "Methodology",  icon: Shield,         hue: "blue" },
  score:      { name: "Scoring",      icon: LineChart,      hue: "pink" },
  related:    { name: "Related Work", icon: Network,        hue: "blue" },
  questions:  { name: "Questions",    icon: Lightbulb,      hue: "purple" },
  report:     { name: "Final Report", icon: MessageSquare,  hue: "pink" },
};

export default function AgentNode({ data }) {
  const meta = AGENT_META[data.agentId] || { name: data.agentId, icon: Sparkles, hue: "purple" };
  const Icon = meta.icon;
  const status = data.status || "pending";

  const ring =
    status === "running" ? "pulse-glow" :
    status === "completed" ? "done-ring" :
    status === "failed" ? "failed-ring" : "";

  const dotColor =
    status === "running" ? "bg-purple-400" :
    status === "completed" ? "bg-emerald-400" :
    status === "failed" ? "bg-red-400" : "bg-zinc-600";

  return (
    <div className={`relative w-[200px] rounded-xl border border-white/[0.08] bg-[#0f0f11] p-3 ${ring}`}>
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2.5">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br ${
          meta.hue === "blue" ? "from-blue-500/20 to-cyan-500/20" :
          meta.hue === "pink" ? "from-pink-500/20 to-purple-500/20" :
          "from-purple-500/20 to-blue-500/20"
        }`}>
          <Icon className="h-3.5 w-3.5 text-white" strokeWidth={1.6} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium text-white truncate">{meta.name}</div>
          <div className="mt-0.5 flex items-center gap-1 text-[9px] text-zinc-500 font-mono">
            <span className={`h-1 w-1 rounded-full ${dotColor}`} />
            {status}
            {status === "completed" && data.duration != null && <span className="ml-1 opacity-70">· {(data.duration / 1000).toFixed(1)}s</span>}
          </div>
        </div>
        {status === "running" && <Loader2 className="h-3 w-3 animate-spin text-purple-300" />}
        {status === "completed" && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
        {status === "pending" && <Clock className="h-3 w-3 text-zinc-600" />}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
