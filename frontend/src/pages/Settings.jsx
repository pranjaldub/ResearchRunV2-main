import { motion } from "framer-motion";
import { Cpu, Database, Zap, KeyRound } from "lucide-react";

const items = [
  { icon: Zap, label: "Inference provider", value: "Groq" },
  { icon: Cpu, label: "Model", value: "llama-3.3-70b-versatile" },
  { icon: Database, label: "Vector store", value: "MongoDB (analyses collection)" },
  { icon: KeyRound, label: "Related work source", value: "Semantic Scholar API" },
];

export default function Settings() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <div className="overline">Settings</div>
      <h1 className="font-display mt-2 text-2xl font-light tracking-tighter text-white sm:text-3xl md:text-4xl">
        Configuration
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Runtime configuration used by the multi-agent workflow.
      </p>

      <div className="mt-10 space-y-3">
        {items.map((it, i) => (
          <motion.div
            key={it.label}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#111113] p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06]">
                <it.icon className="h-4 w-4 text-purple-300" />
              </div>
              <div>
                <div className="text-xs text-zinc-500">{it.label}</div>
                <div className="mt-0.5 text-sm text-white font-mono">{it.value}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
