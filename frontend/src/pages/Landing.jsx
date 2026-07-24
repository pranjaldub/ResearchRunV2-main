import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles, ArrowRight, Github, PlayCircle, Bot, ScanSearch, Layers,
  Network, LineChart, Shield, Cpu, Zap, FileText, Workflow, GitBranch, Blocks,
  BookOpen, Lightbulb, MessageSquare, CheckCircle2
} from "lucide-react";

const AGENTS = [
  { name: "Document Parser", icon: FileText, desc: "Extracts structure, metadata & sections from PDFs." },
  { name: "Summarizer", icon: BookOpen, desc: "TL;DR, contributions, methodology & findings." },
  { name: "Keyword Extractor", icon: ScanSearch, desc: "Concepts, datasets, equations & metrics." },
  { name: "Research Gap Agent", icon: Layers, desc: "Surfaces open problems & limitations." },
  { name: "Novelty Analyst", icon: Sparkles, desc: "Rates novelty against prior work." },
  { name: "Methodology Reviewer", icon: Shield, desc: "Strengths, weaknesses & reviewer notes." },
  { name: "Paper Scoring Agent", icon: LineChart, desc: "Impact, clarity & complexity scoring." },
  { name: "Related Paper Discovery", icon: Network, desc: "Semantic Scholar retrieval + ranking." },
  { name: "Question Generator", icon: Lightbulb, desc: "Future directions & thesis topics." },
  { name: "Final Report Composer", icon: MessageSquare, desc: "Unified markdown report." },
];

const FEATURES = [
  { title: "Multi-agent orchestration", desc: "10 specialist agents cooperate via LangGraph state.", icon: Bot },
  { title: "Groq-powered inference", desc: "Sub-second Llama 3.3 70B responses across the pipeline.", icon: Zap },
  { title: "Live workflow visualisation", desc: "Watch each node run, retry, and emit structured JSON.", icon: Workflow },
  { title: "Structured outputs", desc: "Every stage validated by Pydantic. No hallucinated shapes.", icon: Blocks },
  { title: "Semantic Scholar retrieval", desc: "Related work discovery from 220M+ paper index.", icon: Network },
  { title: "Streaming + persistence", desc: "SSE token streaming, Mongo-backed history.", icon: GitBranch },
];

const STACK = [
  "FastAPI", "LangGraph", "Groq", "Llama 3.3 70B", "Pydantic", "MongoDB",
  "React 19", "React Flow", "Framer Motion", "Recharts", "Tailwind", "Semantic Scholar",
];

export default function Landing() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      {/* Ambient blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/4 h-[600px] w-[600px] rounded-full bg-purple-600/15 blur-[130px]" />
        <div className="absolute top-40 right-0 h-[500px] w-[500px] rounded-full bg-blue-500/12 blur-[130px]" />
        <div className="absolute top-[600px] left-0 h-[500px] w-[500px] rounded-full bg-pink-500/8 blur-[130px]" />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-white/[0.04] bg-[#09090B]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link to="/" className="flex items-center gap-2.5" data-testid="landing-brand">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-[15px] font-semibold tracking-tight text-white">Research Run</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors duration-200">Features</a>
            <a href="#agents" className="text-sm text-zinc-400 hover:text-white transition-colors duration-200">Agents</a>
            <a href="#workflow" className="text-sm text-zinc-400 hover:text-white transition-colors duration-200">Workflow</a>
            <a href="#stack" className="text-sm text-zinc-400 hover:text-white transition-colors duration-200">Stack</a>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com"
              target="_blank" rel="noreferrer"
              data-testid="landing-github"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-zinc-300 hover:bg-white/[0.06] transition-colors duration-200"
            >
              <Github className="h-3.5 w-3.5" /> GitHub
            </a>
            <Link
              to="/dashboard"
              data-testid="landing-nav-launch"
              className="inline-flex items-center gap-1.5 rounded-full bg-white text-[#09090B] px-3 py-1.5 text-xs font-medium hover:bg-white/90 transition-colors duration-200 sm:px-3.5"
            >
              <span className="hidden sm:inline">Launch app</span><span className="sm:hidden">Launch</span> <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28 lg:pt-32 lg:pb-36">
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-purple-500" />
          </span>
          <span className="tracking-wide">Live · Groq inference · 10 agents</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05 }}
          className="font-display mt-6 max-w-4xl text-3xl font-light leading-[1.05] tracking-tighter text-white sm:text-5xl lg:text-6xl"
        >
          The AI-powered <span className="grad-text font-semibold">literature review</span> platform for serious researchers.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
          className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg"
        >
          Upload a research paper and let a swarm of specialized AI agents collaboratively
          analyze, evaluate, summarize, discover related work, identify gaps, and generate
          future research directions — in real time.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}
          className="mt-9 flex flex-wrap items-center gap-3"
        >
          <Link
            to="/upload"
            data-testid="hero-start-analysis"
            className="group relative inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#09090B] shadow-[0_10px_40px_-10px_rgba(255,255,255,0.4)] hover:-translate-y-0.5 transition-transform duration-200"
          >
            Start Analysis <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
          <a
            href="https://github.com"
            target="_blank" rel="noreferrer"
            data-testid="hero-github"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm text-zinc-200 hover:bg-white/[0.06] transition-colors duration-200"
          >
            <Github className="h-4 w-4" /> GitHub
          </a>
          <Link
            to="/dashboard"
            data-testid="hero-live-demo"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm text-zinc-200 hover:bg-white/[0.06] transition-colors duration-200"
          >
            <PlayCircle className="h-4 w-4" /> Live demo
          </Link>
        </motion.div>

        {/* Floating pipeline preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
          className="relative mt-16"
        >
          <div className="relative grid grid-cols-2 gap-4 rounded-2xl border border-white/[0.06] bg-[#0b0b0e]/70 p-4 backdrop-blur-xl md:grid-cols-5">
            {AGENTS.slice(0, 5).map((a, i) => (
              <motion.div
                key={a.name}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.08 }}
                className="relative overflow-hidden rounded-xl border border-white/[0.05] bg-[#111113] p-4"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.04]">
                    <a.icon className="h-3.5 w-3.5 text-purple-300" />
                  </div>
                  <div className="text-xs text-zinc-400">Agent {i + 1}</div>
                </div>
                <div className="mt-2.5 font-display text-[13px] font-medium text-white">{a.name}</div>
                <div className="mt-1 text-[11px] leading-relaxed text-zinc-500 line-clamp-2">{a.desc}</div>
                <div className="mt-3 flex items-center gap-1 text-[10px] text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> ready
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-28">
        <div className="max-w-2xl">
          <div className="overline">Features</div>
          <h2 className="font-display mt-3 text-2xl font-light tracking-tighter text-white sm:text-3xl lg:text-4xl">
            An intelligent workspace, not a chatbot.
          </h2>
          <p className="mt-4 text-base text-zinc-400">
            Research Run turns literature review into a structured, transparent workflow.
            Every claim, gap, and score is produced by a specialist agent you can inspect.
          </p>
        </div>
        <div className="mt-10 grid gap-3 sm:mt-12 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#111113] p-6 transition-colors duration-300 hover:border-white/[0.14]"
              data-testid={`feature-card-${i}`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/[0.06]">
                <f.icon className="h-4 w-4 text-purple-300" />
              </div>
              <div className="mt-5 font-display text-lg font-medium text-white">{f.title}</div>
              <div className="mt-2 text-sm leading-relaxed text-zinc-400">{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Agents */}
      <section id="agents" className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-28">
        <div className="flex items-end justify-between gap-8">
          <div className="max-w-2xl">
            <div className="overline">The Swarm</div>
            <h2 className="font-display mt-3 text-2xl font-light tracking-tighter text-white sm:text-3xl lg:text-4xl">
              Ten agents. One coherent report.
            </h2>
          </div>
          <div className="hidden shrink-0 text-right text-xs text-zinc-500 md:block">
            <div className="font-mono">LangGraph · streaming SSE</div>
            <div className="mt-1 font-mono">Pydantic validated JSON</div>
          </div>
        </div>
        <div className="mt-10 grid gap-3 sm:mt-12 sm:grid-cols-2 lg:grid-cols-5">
          {AGENTS.map((a, i) => (
            <motion.div
              key={a.name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: (i % 5) * 0.05 }}
              className="rounded-xl border border-white/[0.05] bg-[#111113] p-4 hover:border-white/[0.12] transition-colors duration-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.04]">
                  <a.icon className="h-4 w-4 text-purple-300" />
                </div>
                <span className="font-mono text-[10px] text-zinc-600">0{i+1}</span>
              </div>
              <div className="mt-3 font-display text-[13px] font-medium text-white">{a.name}</div>
              <div className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">{a.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Workflow visualization */}
      <section id="workflow" className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-28">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
          <div>
            <div className="overline">Workflow</div>
            <h2 className="font-display mt-3 text-2xl font-light tracking-tighter text-white sm:text-3xl lg:text-4xl">
              Watch every reasoning step happen live.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-400">
              A React Flow graph renders each agent as a node. Edges pulse when tokens
              stream, colors mark running · completed · failed states, and every JSON
              output is inspectable inline. It feels like watching a compiler build a paper.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-zinc-300">
              {["Streaming SSE per agent", "Structured JSON viewer", "Retry on validation failure", "Persistent execution log"].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-purple-400" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0b0b0e] p-6">
            <div className="grid-bg absolute inset-0 opacity-40" />
            <div className="relative space-y-3">
              {AGENTS.slice(0, 6).map((a, i) => (
                <motion.div
                  key={a.name}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-[#111113]/80 p-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10">
                    <a.icon className="h-3.5 w-3.5 text-purple-300" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-white">{a.name}</div>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/[0.04]">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${65 + i * 5}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, delay: i * 0.15 }}
                        className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500"
                      />
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-400">✓</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tech stack */}
      <section id="stack" className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-28">
        <div className="text-center">
          <div className="overline">Tech Stack</div>
          <h2 className="font-display mt-3 text-2xl font-light tracking-tighter text-white sm:text-3xl lg:text-4xl">
            Built with a modern AI-native stack.
          </h2>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2.5">
          {STACK.map((s) => (
            <span key={s} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-xs text-zinc-300">
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-28">
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#111113] to-[#0b0b0e] p-8 sm:p-12 md:p-20 sm:rounded-3xl">
          <div className="grid-bg absolute inset-0 opacity-40" />
          <div className="relative">
            <h3 className="font-display text-2xl font-light tracking-tighter text-white sm:text-3xl lg:text-4xl">
              Turn a PDF into a full review in 60 seconds.
            </h3>
            <p className="mt-4 max-w-xl text-zinc-400">
              No boilerplate, no chat interface, no wasted tokens. Just structured research intelligence.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/upload"
                data-testid="cta-upload"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#09090B] hover:-translate-y-0.5 transition-transform duration-200"
              >
                Upload a paper <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/dashboard"
                data-testid="cta-dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm text-white hover:bg-white/[0.06] transition-colors duration-200"
              >
                Explore the workspace
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.05]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:px-6 md:flex-row">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Cpu className="h-3.5 w-3.5" /> Research Run · Multi-agent literature review
          </div>
          <div className="text-xs text-zinc-500">© {new Date().getFullYear()} · built with Groq & LangGraph</div>
        </div>
      </footer>
    </div>
  );
}
