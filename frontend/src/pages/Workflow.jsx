import { useQuery } from "@tanstack/react-query";
import { listAgents } from "@/lib/api";
import { motion } from "framer-motion";
import { Workflow as WorkflowIcon, ArrowRight } from "lucide-react";

export default function Workflow() {
  const { data } = useQuery({ queryKey: ["agents"], queryFn: listAgents });
  const agents = data?.agents || [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <div className="overline">Workflow</div>
      <h1 className="font-display mt-2 text-2xl font-light tracking-tighter text-white sm:text-3xl md:text-4xl">
        LangGraph orchestration
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Every uploaded paper travels through this deterministic 10-node graph. Each agent
        emits Pydantic-validated JSON and streams progress via SSE.
      </p>

      <div className="mt-10 space-y-3">
        {agents.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
            className="rounded-2xl border border-white/[0.06] bg-[#111113] p-5"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                <WorkflowIcon className="h-4 w-4 text-purple-300" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-zinc-500">0{i + 1}</span>
                  <div className="font-display text-[15px] font-medium text-white">{a.name}</div>
                </div>
                <div className="mt-1 text-xs text-zinc-500">{a.description}</div>
              </div>
              {i < agents.length - 1 && <ArrowRight className="h-4 w-4 text-zinc-600" />}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
