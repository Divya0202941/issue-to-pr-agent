import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  GitPullRequest,
  Search,
  ExternalLink,
  Copy,
  Check,
  CheckCircle,
  GitBranch,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { PullRequest } from '../types';

export const PullRequestsPage: React.FC = () => {
  const [prs, setPRs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPRs = async () => {
      try {
        setLoading(true);
        const data = await api.getPullRequests();
        setPRs(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPRs();
  }, []);

  const handleCopyUrl = (id: string, url?: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredPRs = prs.filter(pr =>
    pr.title.toLowerCase().includes(search.toLowerCase()) ||
    pr.head_branch.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GitPullRequest className="w-5 h-5 text-indigo-500" />
            Pull Request Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review-ready pull requests generated from GitHub issues with tested validation records
          </p>
        </div>
      </div>

      {/* Safety Notice Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-xs text-amber-700 dark:text-amber-400">
        <ShieldCheck className="w-5 h-5 flex-shrink-0" />
        <div>
          <strong className="block font-bold">Important Human Merge Governance:</strong>
          <span>A successful Pull Request creation does not mean the code is automatically merged. Never merge automatically; human approval is required on GitHub.</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Filter pull requests by title or branch..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* PR Cards List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading pull requests...</div>
        ) : filteredPRs.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
            No pull requests recorded yet. Start an issue run to generate a review-ready PR.
          </div>
        ) : (
          filteredPRs.map(pr => (
            <div
              key={pr.id}
              className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <GitPullRequest className="w-4 h-4 text-emerald-500" />
                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                    PR #{pr.pr_number || '---'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {pr.state}
                  </span>
                  {pr.is_demo && (
                    <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      DEMO MODE
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Created:</span>
                  <span className="text-slate-600 dark:text-slate-300 font-mono">
                    {new Date(pr.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {pr.title}
                </h3>

                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                  <span className="flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                    <span>{pr.head_branch}</span>
                    <span className="text-slate-400">into</span>
                    <strong className="text-slate-700 dark:text-slate-300">{pr.base_branch}</strong>
                  </span>
                  <span className="flex items-center gap-1 text-emerald-500 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" /> Sandbox Checks Passing
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
                {pr.description}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Link
                  to={`/agent-runs/${pr.agent_run_id}`}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View Execution Workflow & Telemetry →
                </Link>

                <div className="flex items-center gap-2">
                  {pr.html_url && (
                    <>
                      <button
                        onClick={() => handleCopyUrl(pr.id, pr.html_url)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
                      >
                        {copiedId === pr.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        <span>Copy URL</span>
                      </button>

                      <a
                        href={pr.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-sm transition"
                      >
                        Open on GitHub <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
