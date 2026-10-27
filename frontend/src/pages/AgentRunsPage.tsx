import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Cpu,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  RotateCcw,
  GitBranch,
  ShieldCheck,
  AlertTriangle,
  Play
} from 'lucide-react';
import { api } from '../services/api';
import { AgentRunSummary } from '../types';

export const AgentRunsPage: React.FC = () => {
  const [runs, setRuns] = useState<AgentRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const data = await api.getAgentRuns();
      setRuns(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const filteredRuns = runs.filter(run => {
    const matchesSearch =
      run.repository_name.toLowerCase().includes(search.toLowerCase()) ||
      run.issue_title.toLowerCase().includes(search.toLowerCase()) ||
      run.branch_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || run.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-500" />
            Agent Execution Workflows
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor real-time agent pipelines, approval gates, and bounded correction loops
          </p>
        </div>

        <Link
          to="/issues"
          className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Play className="w-3.5 h-3.5" /> Start New Workflow
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by repo, issue title, or branch..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="running_tests">Running Tests</option>
          <option value="awaiting_patch_approval">Awaiting Patch Approval</option>
          <option value="awaiting_pr_approval">Awaiting PR Approval</option>
          <option value="correction_required">Correction Required</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Runs Table */}
      <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#0E1524] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-5">Repository & Issue</th>
                <th className="py-3 px-5">Current Agent</th>
                <th className="py-3 px-5">Working Branch</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Confidence</th>
                <th className="py-3 px-5">Started</th>
                <th className="py-3 px-5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading agent workflows...
                  </td>
                </tr>
              ) : filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No matching agent workflows found.
                  </td>
                </tr>
              ) : (
                filteredRuns.map(run => {
                  let statusBadge = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
                  if (run.status === 'completed') statusBadge = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
                  if (run.status === 'failed') statusBadge = 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
                  if (run.status.includes('awaiting')) statusBadge = 'bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold';
                  if (['running_tests', 'generating_patch', 'analyzing_issue'].includes(run.status)) {
                    statusBadge = 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 animate-pulse font-bold';
                  }

                  return (
                    <tr key={run.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-5">
                        <span className="font-mono font-bold text-slate-900 dark:text-white block">
                          {run.repository_name}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          #{run.issue_number}: {run.issue_title}
                        </span>
                      </td>

                      <td className="py-3.5 px-5 capitalize font-mono text-[11px] text-indigo-500 font-medium">
                        {run.current_agent.replace('_', ' ')}
                      </td>

                      <td className="py-3.5 px-5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {run.branch_name}
                      </td>

                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${statusBadge}`}>
                          {run.status.replace(/_/g, ' ')}
                        </span>
                        {run.correction_attempt > 0 && (
                          <span className="block text-[10px] text-amber-500 font-mono mt-0.5">
                            Retry #{run.correction_attempt}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-5 font-mono font-semibold">
                        {Math.round(run.confidence_score * 100)}%
                      </td>

                      <td className="py-3.5 px-5 text-slate-400 text-[11px]">
                        {new Date(run.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="py-3.5 px-5">
                        <Link
                          to={`/agent-runs/${run.id}`}
                          className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          View Live <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
