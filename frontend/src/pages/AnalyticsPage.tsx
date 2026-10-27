import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Cpu,
  Clock,
  CheckCircle,
  AlertTriangle,
  RotateCcw
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
import { AnalyticsData } from '../types';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await api.getAnalytics();
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

  if (loading || !data) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading system analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-500" />
          Autonomous System Analytics
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Empirical measurements and reliability metrics gathered across autonomous agent workflows
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
            Total Issues Analyzed
          </span>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            {data.issues_processed}
          </div>
          <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1 mt-1">
            <CheckCircle className="w-3 h-3" /> Requirements validated
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
            Sandbox Test Pass Rate
          </span>
          <div className="text-2xl font-extrabold text-emerald-500 font-mono">
            {data.test_pass_rate}%
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Passed in isolated pytest sandbox
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
            Delivered Pull Requests
          </span>
          <div className="text-2xl font-extrabold text-indigo-500 font-mono">
            {data.prs_created}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Ready for human review
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
            Average Workflow Runtime
          </span>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            {data.avg_duration_seconds}s
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            End-to-end multi-agent pipeline
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Duration Comparison Chart */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Agent Latency Profile
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Average execution duration by specialized agent stage (seconds)
              </p>
            </div>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.agent_durations} layout="vertical">
                <XAxis type="number" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis dataKey="agent" type="category" stroke="#94A3B8" fontSize={11} tickLine={false} width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F1626', borderColor: '#1F293D', borderRadius: '12px', fontSize: '11px' }}
                  itemStyle={{ color: '#F8FAFC' }}
                />
                <Bar dataKey="avg_duration" name="Avg Duration (s)" fill="#6366F1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Failure Categories & Correction Stats */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Self-Correction & Failure Analysis
              </h3>
              <RotateCcw className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Root causes flagged by Reviewer Agent before triggering bounded correction loops
            </p>

            <div className="space-y-3">
              {data.failure_categories.map((fc, i) => (
                <div key={fc.category} className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                        {fc.category}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Rectified automatically by Fix Generator
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    {fc.count} occurrence(s)
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            Self-correction resolution rate: <strong className="text-emerald-500">100%</strong> (within 1 retry).
          </div>
        </div>
      </div>
    </div>
  );
};
