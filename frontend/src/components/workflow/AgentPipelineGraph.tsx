import React from 'react';
import {
  FileText,
  Search,
  Code,
  CheckCircle,
  ShieldAlert,
  GitPullRequest,
  Check,
  AlertTriangle,
  RotateCcw,
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { AgentExecution, AgentName, WorkflowStatus } from '../../types';

interface AgentPipelineGraphProps {
  currentAgent: AgentName;
  status: WorkflowStatus;
  executions: AgentExecution[];
  correctionAttempt: number;
  maxCorrections: number;
  onSelectAgent?: (agentName: AgentName) => void;
  selectedAgent?: AgentName;
}

export const AgentPipelineGraph: React.FC<AgentPipelineGraphProps> = ({
  currentAgent,
  status,
  executions,
  correctionAttempt,
  maxCorrections,
  onSelectAgent,
  selectedAgent
}) => {
  const agents: { name: AgentName; title: string; subtitle: string; icon: any }[] = [
    { name: 'issue_analyzer', title: 'Issue Analyzer', subtitle: 'Understand requirements', icon: FileText },
    { name: 'code_locator', title: 'Code Locator', subtitle: 'Semantic code mapping', icon: Search },
    { name: 'fix_generator', title: 'Fix Generator', subtitle: 'Minimal patch creation', icon: Code },
    { name: 'test_agent', title: 'Test Agent', subtitle: 'Isolated sandbox tests', icon: CheckCircle },
    { name: 'reviewer', title: 'Reviewer', subtitle: 'Self-correction loop', icon: ShieldAlert },
    { name: 'pr_agent', title: 'PR Agent', subtitle: 'Ready for human review', icon: GitPullRequest },
  ];

  const getAgentStatus = (name: AgentName) => {
    const exec = executions.find(e => e.agent_name === name);
    if (exec) {
      return exec.status;
    }
    if (currentAgent === name && !['completed', 'failed', 'cancelled'].includes(status)) {
      return 'running';
    }
    return 'pending';
  };

  const getAgentExecution = (name: AgentName) => {
    return executions.find(e => e.agent_name === name);
  };

  return (
    <div className="w-full rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            Autonomous Engineering Pipeline
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Six specialized AI agents collaborating from issue intake to pull request
          </p>
        </div>

        {/* Correction Loop Indicator */}
        {correctionAttempt > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold animate-pulse">
            <RotateCcw className="w-3.5 h-3.5 animate-spin" />
            <span>
              Bounded Correction Loop: Attempt {correctionAttempt} / {maxCorrections}
            </span>
          </div>
        )}
      </div>

      {/* Nodes Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 relative">
        {agents.map((agent, index) => {
          const Icon = agent.icon;
          const agentStatus = getAgentStatus(agent.name);
          const exec = getAgentExecution(agent.name);
          const isSelected = selectedAgent === agent.name;
          const isCurrent = currentAgent === agent.name;

          let badgeColor = 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
          if (agentStatus === 'completed') badgeColor = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
          if (agentStatus === 'running') badgeColor = 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 animate-pulse';
          if (agentStatus === 'failed') badgeColor = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30';

          return (
            <div
              key={agent.name}
              onClick={() => onSelectAgent?.(agent.name)}
              className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all cursor-pointer group
                ${isSelected
                  ? 'border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-[#0E1524]'
                }`}
            >
              {/* Connector Arrow for Desktop */}
              {index < agents.length - 1 && (
                <div className="hidden lg:block absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 text-slate-300 dark:text-slate-700">
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}

              {/* Node Header */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all
                      ${agentStatus === 'completed'
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                        : agentStatus === 'running'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 animate-pulse'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${badgeColor}`}>
                    {agentStatus}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  {agent.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {agent.subtitle}
                </p>
              </div>

              {/* Node Footer Duration */}
              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3" />
                  {exec ? `${exec.duration_seconds}s` : '--'}
                </span>
                <span className="text-slate-400 dark:text-slate-500 font-mono">
                  Step {index + 1}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
