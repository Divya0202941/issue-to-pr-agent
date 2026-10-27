import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  CheckCircle,
  FolderGit2,
  Cpu,
  ShieldCheck,
  Play,
  ArrowRight,
  ArrowLeft,
  Lock,
  GitBranch
} from 'lucide-react';

export const OnboardingPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const navigate = useNavigate();

  const steps = [
    { num: 1, title: 'Welcome', desc: 'Overview of the platform' },
    { num: 2, title: 'GitHub Integration', desc: 'Authorize repository access' },
    { num: 3, title: 'Target Repository', desc: 'Select default repository' },
    { num: 4, title: 'AI Intelligence', desc: 'Select model provider' },
    { num: 5, title: 'Sandbox Verification', desc: 'Verify isolated execution' },
    { num: 6, title: 'Ready to Run', desc: 'Launch first autonomous run' },
  ];

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      {/* Top Header */}
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-600/25">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Guided Setup Wizard
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure your autonomous engineering workspace in 6 quick steps
        </p>
      </div>

      {/* Stepper Progress Bar */}
      <div className="flex items-center justify-between relative px-4">
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-slate-800 -z-0"></div>
        {steps.map(s => {
          const isDone = s.num < currentStep;
          const isCurrent = s.num === currentStep;
          return (
            <div
              key={s.num}
              onClick={() => setCurrentStep(s.num)}
              className="relative z-10 flex flex-col items-center cursor-pointer group"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${isDone
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : isCurrent
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20 shadow-md shadow-indigo-600/30'
                    : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-400'
                  }`}
              >
                {isDone ? <CheckCircle className="w-4 h-4" /> : s.num}
              </div>
              <span className={`text-[10px] mt-1.5 font-semibold hidden sm:block
                ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
              >
                {s.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step Content Card */}
      <div className="p-8 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        {currentStep === 1 && (
          <div className="space-y-4 text-center py-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Welcome to Issue to PR Agent
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
              Issue to PR Agent is an autonomous engineering platform designed to turn GitHub issues into thoroughly tested, review-ready pull requests through 6 coordinated AI agents.
            </p>
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 font-semibold max-w-md mx-auto">
              ✓ Demo Mode is active. You can explore the entire workflow without configuring external credentials.
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-indigo-500" />
              Step 2: Connect GitHub
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              For production usage, connect a GitHub personal access token with <code className="text-indigo-400">repo</code> scope. For exploration, Demo Mode simulates realistic API operations safely.
            </p>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Current Status:</span>
                <span className="text-emerald-500 font-bold">Connected (Demo Workspace)</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400">Tokens are stored securely and never passed into execution sandboxes.</p>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-indigo-500" />
              Step 3: Select Target Repository
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select which repository the agent will target for issue triage and branch creation:
            </p>
            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs space-y-1">
              <span className="font-bold text-slate-900 dark:text-white block">acme-corp/auth-service (Active)</span>
              <span className="text-slate-500 dark:text-slate-400 block">Default Base Branch: main • Test Command: pytest</span>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-500" />
              Step 4: AI Model Selection
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The platform supports OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, Google Gemini 1.5 Pro, and an offline deterministic mock provider:
            </p>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <span className="font-bold text-emerald-500 block">Active: Offline Contextual Engine</span>
              <span className="text-slate-500 dark:text-slate-400 block">Zero API cost. Deterministic regression scenario verification.</span>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              Step 5: Sandbox Isolation & Human Governance
            </h3>
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <p className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800">
                ✓ Non-root isolated subprocess with 60s timeout enforcement.
              </p>
              <p className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800">
                ✓ Secrets and tokens are redacted from all telemetry logs.
              </p>
              <p className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800">
                ✓ Human approval is strictly enforced before patch application and PR creation.
              </p>
            </div>
          </div>
        )}

        {currentStep === 6 && (
          <div className="space-y-4 text-center py-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              You're Ready to Automate
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Everything is set up. You can now submit any GitHub issue URL or replay the sample regression scenario.
            </p>
            <div className="pt-2">
              <Link
                to="/issues?scenario=validation-empty-input"
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/25 transition inline-flex items-center gap-2"
              >
                Launch First Workflow <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-800">
          {currentStep > 1 ? (
            <button
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          ) : (
            <div></div>
          )}

          {currentStep < 6 ? (
            <button
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
            >
              Next Step <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Link
              to="/dashboard"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white transition"
            >
              Finish Setup & Open Dashboard
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
