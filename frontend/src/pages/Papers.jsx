import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listPapers, deletePaper, pinPaper } from "@/lib/api";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { FileText, Trash2, Pin, PinOff, ArrowUpRight, Clock, Layers } from "lucide-react";

export default function Papers() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["papers"], queryFn: listPapers });
  const papers = data?.papers || [];

  const onDelete = async (id) => {
    await deletePaper(id);
    toast.success("Paper deleted.");
    qc.invalidateQueries({ queryKey: ["papers"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  };

  const onPin = async (id, pinned) => {
    await pinPaper(id, !pinned);
    qc.invalidateQueries({ queryKey: ["papers"] });
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-14">
      <div className="flex items-end justify-between">
        <div>
          <div className="overline">Library</div>
          <h1 className="font-display mt-2 text-2xl font-light tracking-tighter text-white sm:text-3xl md:text-4xl">
            My Papers
          </h1>
        </div>
        <div className="text-xs text-zinc-500 font-mono">{papers.length} total</div>
      </div>

      {papers.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-white/10 p-10 text-center sm:p-14">
          <FileText className="mx-auto h-8 w-8 text-zinc-600" />
          <div className="mt-4 font-display text-lg text-white">No papers yet</div>
          <p className="mt-1 text-sm text-zinc-500">Upload your first PDF to run the agent swarm.</p>
          <Link to="/upload" className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#09090B]">
            Upload a paper
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {papers.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111113] p-5 hover:border-white/[0.14] transition-colors duration-300"
              data-testid={`paper-card-${p.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04]">
                  <FileText className="h-4 w-4 text-zinc-300" />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onPin(p.id, p.pinned)}
                    data-testid={`pin-${p.id}`}
                    className="rounded-full p-1.5 text-zinc-500 hover:bg-white/[0.05] hover:text-purple-300 transition-colors duration-200"
                  >
                    {p.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => onDelete(p.id)}
                    data-testid={`delete-${p.id}`}
                    className="rounded-full p-1.5 text-zinc-500 hover:bg-white/[0.05] hover:text-red-400 transition-colors duration-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <Link to={`/paper/${p.id}`} className="block">
                <div className="mt-4 font-display text-[15px] font-medium leading-snug text-white line-clamp-2">
                  {p.title}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 font-mono">
                  <span className="inline-flex items-center gap-1"><Layers className="h-3 w-3" /> {p.pages} pages</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(p.created_at).toLocaleDateString()}</span>
                </div>
                <div className={`mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[10px] ${
                  p.status === "completed" ? "text-emerald-400" : p.status === "analyzing" ? "text-purple-300" : p.status === "failed" ? "text-red-400" : "text-zinc-400"
                }`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" /> {p.status}
                </div>
                <div className="mt-4 flex items-center justify-end text-xs text-zinc-500 group-hover:text-white transition-colors duration-200">
                  Open workspace <ArrowUpRight className="ml-1 h-3 w-3" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
