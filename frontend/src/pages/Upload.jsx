import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { uploadPaper } from "@/lib/api";
import { UploadCloud, FileText, Sparkles, ArrowRight, X, Loader2 } from "lucide-react";

export default function Upload() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploaded, setUploaded] = useState(null);
  const [uploading, setUploading] = useState(false);
  const nav = useNavigate();

  const handleFile = useCallback((f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are supported.");
      return;
    }
    setFile(f);
    setUploaded(null);
    setProgress(0);
  }, []);

  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const doUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const paper = await uploadPaper(file, setProgress);
      toast.success("PDF parsed successfully.");
      setUploaded(paper);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const analyze = () => {
    if (!uploaded) return;
    nav(`/paper/${uploaded.id}?autostart=1`);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <div className="overline">Upload</div>
      <h1 className="font-display mt-2 text-2xl font-light tracking-tighter text-white sm:text-3xl md:text-4xl">
        Drop a paper, run the swarm.
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        We'll parse the PDF, extract text, and route it through ten specialist agents.
      </p>

      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="mt-10"
      >
        <label
          data-testid="upload-dropzone"
          htmlFor="pdf-input"
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`group relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed p-6 text-center transition-colors duration-300 sm:min-h-[280px] sm:p-10 ${
            dragging ? "border-purple-400/60 bg-purple-500/[0.06]" : "border-white/10 bg-[#111113] hover:border-white/20"
          }`}
        >
          <div className="grid-bg absolute inset-0 opacity-30" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/20 to-blue-500/20">
            <UploadCloud className="h-6 w-6 text-purple-300" />
          </div>
          <div className="relative mt-5 font-display text-lg font-medium text-white">
            {file ? file.name : "Drag & drop your PDF here"}
          </div>
          <div className="relative mt-1 text-xs text-zinc-500">
            or click to browse · max 25 MB · extractable text only
          </div>
          <input
            id="pdf-input"
            type="file"
            accept="application/pdf"
            className="hidden"
            data-testid="upload-input"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>

        <AnimatePresence>
          {file && !uploaded && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-4 flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#111113] p-4"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04]"><FileText className="h-4 w-4 text-zinc-300" /></div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white">{file.name}</div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/[0.05]">
                  <motion.div
                    animate={{ width: `${uploading ? progress : 0}%` }}
                    className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500"
                  />
                </div>
              </div>
              <button
                onClick={() => { setFile(null); setProgress(0); }}
                className="rounded-full border border-white/10 p-1.5 text-zinc-400 hover:text-white transition-colors duration-200"
                data-testid="upload-clear"
              ><X className="h-3.5 w-3.5" /></button>
              <button
                onClick={doUpload}
                disabled={uploading}
                data-testid="upload-submit"
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-[#09090B] hover:-translate-y-0.5 transition-transform duration-200 disabled:opacity-50"
              >
                {uploading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Parsing…</> : <>Parse PDF</>}
              </button>
            </motion.div>
          )}

          {uploaded && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="mt-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111113] p-6"
              data-testid="upload-success-card"
            >
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <div className="overline">Ready to analyze</div>
                  <div className="font-display mt-2 text-xl font-medium text-white line-clamp-2">{uploaded.title}</div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500 font-mono">
                    <span>{uploaded.pages} pages</span>
                    <span>{uploaded.word_count.toLocaleString()} words</span>
                    <span>id: {uploaded.id.slice(0, 8)}</span>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-zinc-400 line-clamp-4">
                    {uploaded.abstract}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <button
                    onClick={analyze}
                    data-testid="upload-analyze-btn"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#09090B] hover:-translate-y-0.5 transition-transform duration-200"
                  >
                    Analyze <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
