import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
  GitPullRequest,
  CheckCircle2,
  Lock,
  Terminal,
  Activity,
  Code2,
  RotateCcw,
  ChevronDown,
  Layers,
  Server
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const LandingPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  const agents = [
    { name: 'Issue Analyzer', role: 'Deconstructs issue requirements and sets acceptance criteria', icon: '01' },
    { name: 'Code Locator', role: 'AST and semantic mapping of affected files and symbols', icon: '02' },
    { name: 'Fix Generator', role: 'Generates minimal targeted patches adhering to conventions', icon: '03' },
    { name: 'Test Agent', role: 'Synthesizes unit tests and validates in an isolated sandbox', icon: '04' },
    { name: 'Reviewer', role: 'Performs safety audits and drives bounded self-correction loops', icon: '05' },
    { name: 'PR Agent', role: 'Prepares commits, branches, and review-ready GitHub Pull Requests', icon: '06' },
  ];

  const features = [
    { title: 'Intelligent Issue Understanding', desc: 'Extracts acceptance criteria, constraints, and edge cases from issue threads.', icon: Code2 },
    { title: 'Semantic Code Discovery', desc: 'Identifies relevant symbols and references without indexing noise.', icon: SearchIcon },
    { title: 'Minimal Patch Generation', desc: 'Creates targeted unified diffs instead of rewriting files unnecessarily.', icon: Terminal },
    { title: 'Automated Test Generation', desc: 'Generates regression tests targeting newly added branches and edge cases.', icon: CheckCircle2 },
    { title: 'Isolated Sandbox Execution', desc: 'Executes tests safely with strict timeouts, memory limits, and non-root isolation.', icon: Lock },
    { title: 'Bounded Self-Correction Loops', desc: 'Automatically rectifies test failures and reviewer feedback up to configurable limits.', icon: RotateCcw },
    { title: 'Transparent Telemetry & Logs', desc: 'Inspect live streaming logs, stdout/stderr, and duration metrics in real-time.', icon: Activity },
    { title: 'Human-in-the-Loop Gates', desc: 'Configurable approval boundaries ensure no code is committed or merged without human sign-off.', icon: ShieldCheck },
  ];

  const faqs = [
    {
      q: 'How does the agent pipeline work?',
      a: 'A developer supplies a GitHub issue URL. Six specialized agents sequentially analyze the issue, locate relevant code files, generate a minimal patch, write targeted tests, run the tests in an isolated sandbox, perform safety review, and assemble a review-ready PR.'
    },
    {
      q: 'Does the agent ever merge code automatically?',
      a: 'Never. Automatic merging is strictly prohibited. Every Pull Request created by the platform is ready for human review and requires your standard team approval process before merging.'
    },
    {
      q: 'What happens when tests fail in the sandbox?',
      a: 'The Reviewer Agent detects the failure, compiles actionable diagnostic feedback, and sends it back to the Fix Generator. The system attempts bounded self-corrections (default 3 attempts) to resolve the issue automatically before escalating.'
    },
    {
      q: 'Which programming languages are supported?',
      a: 'Python and pytest are supported natively out of the box with isolated sandbox execution. Additional languages (JavaScript/TypeScript, Go, Rust) are supported via customizable repository test commands.'
    },
    {
      q: 'How are credentials and GitHub tokens protected?',
      a: 'GitHub tokens and API keys are stored encrypted on the server and never exposed to the frontend. Execution sandboxes are scrubbed and secrets are automatically redacted from all execution logs.'
    },
    {
      q: 'Can I test the application without entering API keys or GitHub tokens?',
      a: 'Yes! The platform includes a fully featured Demo Mode with sample repositories, pre-seeded scenarios, and safe interactive sandbox simulations that require zero credentials.'
    }
  ];

  function SearchIcon(props: any) {
    return (
      <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F17] text-white selection:bg-indigo-500 selection:text-white font-sans">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#0B0F17]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight">Issue to PR Agent</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#workflow" className="hover:text-indigo-400 transition">Workflow</a>
            <a href="#features" className="hover:text-indigo-400 transition">Features</a>
            <a href="#security" className="hover:text-indigo-400 transition">Security</a>
            <a href="#faq" className="hover:text-indigo-400 transition">FAQ</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition flex items-center gap-1.5"
            >
              Start Building <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-indigo-600/10 blur-[140px] pointer-events-none rounded-full"></div>
        
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-700/60 text-indigo-400 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Autonomous AI Engineering Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            From Issue to Pull Request.{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-indigo-300 bg-clip-text text-transparent">
              Let AI Handle the Engineering.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Turn GitHub issues into tested, review-ready code changes with six specialized AI agents working together in an observable, human-governed pipeline.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/issues"
              className="px-6 py-3 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30 transition flex items-center gap-2"
            >
              Submit GitHub Issue <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/dashboard"
              className="px-6 py-3 rounded-xl font-bold text-sm bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition flex items-center gap-2"
            >
              Explore Live Demo
            </Link>
          </div>

          {/* Interactive Pipeline Preview Graphic */}
          <div className="mt-16 max-w-5xl mx-auto rounded-2xl border border-slate-800 bg-[#0E1524] p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-6 text-left">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-xs text-slate-400 ml-2 font-mono">workflow-pipeline.agent.json</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                All 6 Agents Synchronized
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {agents.map((agent, i) => (
                <div key={agent.name} className="p-3.5 rounded-xl bg-[#111827] border border-slate-800 text-left">
                  <span className="text-[10px] font-mono text-indigo-400 font-bold block mb-1">
                    STEP {agent.icon}
                  </span>
                  <p className="text-xs font-bold text-white leading-tight">{agent.name}</p>
                  <p className="text-[10px] text-slate-400 mt-1 leading-snug">{agent.role}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-amber-400">
                <RotateCcw className="w-3.5 h-3.5" /> Bounded self-correction loop enabled
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Human merge approval required
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Six Agents Pipeline Section */}
      <section id="workflow" className="py-20 border-t border-slate-800 bg-[#0E1524]/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
              Coordinated Architecture
            </h2>
            <h3 className="text-3xl font-extrabold text-white mt-2">
              Six Specialized AI Agents. One Cohesive Result.
            </h3>
            <p className="text-sm text-slate-400 mt-3">
              Unlike generic chatbots that guess code solutions in isolation, Issue to PR Agent utilizes a coordinated pipeline of dedicated engineering agents with strict boundaries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent, idx) => (
              <div
                key={agent.name}
                className="p-6 rounded-2xl bg-[#111827] border border-slate-800 hover:border-slate-700 transition group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-700/60 text-indigo-400 font-mono font-bold flex items-center justify-center text-sm mb-4 group-hover:scale-105 transition-transform">
                  0{idx + 1}
                </div>
                <h4 className="text-base font-bold text-white mb-2">{agent.name}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{agent.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section id="features" className="py-20 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
              Engineered for Production
            </h2>
            <h3 className="text-3xl font-extrabold text-white mt-2">
              Features Built for Serious Software Teams
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="p-5 rounded-2xl bg-[#0E1524] border border-slate-800/80">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1.5">{f.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Security & Sandbox Section */}
      <section id="security" className="py-20 border-t border-slate-800 bg-[#0E1524]/60">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto rounded-3xl bg-[#111827] border border-slate-800 p-8 sm:p-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Enterprise Security Architecture</h3>
                <p className="text-xs text-slate-400">Zero untrusted code runs on the host system</p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-slate-800">
                <strong className="text-white block mb-1">1. Isolated Execution Sandboxes</strong>
                Permitted test commands execute in unprivileged subprocess containers with CPU, memory, and timeout bounds.
              </div>
              <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-slate-800">
                <strong className="text-white block mb-1">2. Secret & Token Redaction</strong>
                GitHub tokens, private keys, and passwords are automatically scrubbed from all execution logs and telemetry.
              </div>
              <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-slate-800">
                <strong className="text-white block mb-1">3. Human Merge Authority</strong>
                Automatic merging is strictly prohibited. You retain total governance over branch protection and PR review.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-white">Frequently Asked Questions</h3>
          </div>

          <div className="space-y-4">
            {faqs.map(faq => (
              <div key={faq.q} className="p-5 rounded-2xl bg-[#0E1524] border border-slate-800">
                <h4 className="text-sm font-bold text-white mb-2">{faq.q}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 bg-[#090D14] text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-300">Issue to PR Agent</span>
          </div>

          <p className="text-center sm:text-left">
            "From GitHub Issue to Pull Request, Automatically." Built for modern engineering teams.
          </p>

          <Link
            to="/dashboard"
            className="text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            Launch Platform →
          </Link>
        </div>
      </footer>
    </div>
  );
};
