import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Cpu,
  CheckCircle,
  XCircle,
  GitPullRequest,
  CheckSquare,
  Clock,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  PlusCircle,
  ShieldCheck,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { api } from '../services/api';
import { AgentRunSummary, AnalyticsData, Issue } from '../types';

export const DashboardPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recentRuns, setRecentRuns] = useState<AgentRunSummary[]>([]);
  const [recentIssues, setRecentIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [analyticsData, runsData, issuesData] = await Promise.all([
          api.getAnalytics(),
          api.getAgentRuns(),
          api.getIssues()
        ]);
        setAnalytics(analyticsData);
        setRecentRuns(runsData.slice(0, 5));
        setRecentIssues(issuesData.slice(0, 5));
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444'];

  const handleLaunchSampleScenario = async () => {
    navigate('/issues?scenario=validation-empty-input');
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Banner / Callout */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-indigo-900/60 via-indigo-950/40 to-slate-900 border border-indigo-500/20 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
              Autonomous Engineering
            </span>
            <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Demo Mode Enabled
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Engineering Operations Overview
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Live telemetry and performance analytics from the 6-agent issue-to-pull-request automation pipeline.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLaunchSampleScenario}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" /> Replay Demo Scenario
          </button>
          <Link
            to="/issues"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" /> New Issue Run
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Agent Runs</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            {analytics?.total_runs || 0}
          </div>
          <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> {analytics?.successful_runs || 0} completed successfully
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pull Requests Created</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <GitPullRequest className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            {analytics?.prs_created || 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Awaiting human review & merge
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sandbox Test Pass Rate</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-500 font-mono">
            {analytics?.test_pass_rate || 100}%
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Passed in isolated pytest sandbox
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Avg Execution Time</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            {analytics?.avg_duration_seconds || 2.5}s
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Across all 6 agent stages
          </span>
        </div>
      </div>

      {/* Activity Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Activity Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Workflow Activity Trend</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Agent runs and pull requests over the past 7 days</p>
            </div>
            <span className="text-[11px] font-mono text-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg">
              Telemetry (7D)
            </span>
          </div>

          <div className="h-64 w-full">
            {analytics?.weekly_activity ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.weekly_activity}>
                  <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F1626', borderColor: '#1F293D', borderRadius: '12px', fontSize: '11px' }}
                    itemStyle={{ color: '#F8FAFC' }}
                  />
                  <Bar dataKey="runs" name="Agent Runs" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="prs" name="PRs Opened" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">No chart data</div>
            )}
          </div>
        </div>

        {/* Pipeline Distribution Chart */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Status Breakdown</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Distribution of workflow outcomes</p>
            
            <div className="h-44 w-full flex items-center justify-center">
              {analytics?.runs_by_status ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.runs_by_status}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                    >
                      {analytics.runs_by_status.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F1626', borderColor: '#1F293D', borderRadius: '12px', fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
            {analytics?.runs_by_status?.map((item, idx) => (
              <div key={item.status} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400 capitalize">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  {item.status.replace('_', ' ')}
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Agent Runs Table */}
      <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Agent Workflows</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Click a workflow to inspect live telemetry and review findings</p>
          </div>
          <Link
            to="/agent-runs"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            View all runs <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#0E1524] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-5">Repository</th>
                <th className="py-3 px-5">Issue</th>
                <th className="py-3 px-5">Current Agent</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Confidence</th>
                <th className="py-3 px-5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {recentRuns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No workflows recorded yet.
                  </td>
                </tr>
              ) : (
                recentRuns.map(run => (
                  <tr key={run.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-5 font-mono font-medium text-slate-900 dark:text-white">
                      {run.repository_name}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="font-semibold text-slate-900 dark:text-white">#{run.issue_number}</span>{' '}
                      <span className="text-slate-500 dark:text-slate-400 line-clamp-1">{run.issue_title}</span>
                    </td>
                    <td className="py-3.5 px-5 capitalize font-mono text-[11px] text-indigo-500">
                      {run.current_agent.replace('_', ' ')}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize
                        ${run.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : run.status === 'failed'
                          ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 animate-pulse'}`}
                      >
                        {run.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-mono font-semibold">
                      {Math.round(run.confidence_score * 100)}%
                    </td>
                    <td className="py-3.5 px-5">
                      <Link
                        to={`/agent-runs/${run.id}`}
                        className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Monitor <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
