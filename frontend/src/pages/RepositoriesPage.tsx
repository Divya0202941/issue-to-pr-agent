import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderGit2,
  Search,
  Plus,
  GitBranch,
  Star,
  GitFork,
  ExternalLink,
  ShieldCheck,
  Cpu,
  GitPullRequest,
  Filter,
  CheckCircle,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { Repository } from '../types';

export const RepositoriesPage: React.FC = () => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newBaseBranch, setNewBaseBranch] = useState('main');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRepos = async () => {
    try {
      setLoading(true);
      const data = await api.getRepositories();
      setRepositories(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  const handleConnectRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName.includes('/')) {
      alert('Please provide repository in format: owner/repository-name');
      return;
    }
    try {
      setSubmitting(true);
      await api.connectRepository(newRepoName.trim(), newBaseBranch.trim(), true);
      setShowModal(false);
      setNewRepoName('');
      fetchRepos();
    } catch (err: any) {
      alert(err.message || 'Failed to connect repository');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRepos = repositories.filter(r =>
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.language && r.language.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-indigo-500" />
            Connected Repositories
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage target repositories authorized for autonomous AI branch and PR operations
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Connect Repository
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Filter repositories by name or language..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Repository Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredRepos.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
          <FolderGit2 className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">No repositories match your filter</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Connect a repository to begin automating issues.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRepos.map(repo => (
            <div
              key={repo.id}
              className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <Link
                    to={`/repositories/${repo.id}`}
                    className="text-base font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition font-mono truncate"
                  >
                    {repo.full_name}
                  </Link>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {repo.is_demo && (
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        DEMO
                      </span>
                    )}
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      {repo.is_private ? 'Private' : 'Public'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                  {repo.description || 'No description provided.'}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  {repo.language && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                      {repo.language}
                    </span>
                  )}
                  <span className="flex items-center gap-1 font-mono">
                    <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                    {repo.default_branch}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Cpu className="w-3.5 h-3.5 text-slate-400" />
                    {repo.agent_runs_count} runs
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <GitPullRequest className="w-3.5 h-3.5 text-slate-400" />
                    {repo.pull_requests_count} PRs
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <a
                  href={repo.html_url || `https://github.com/${repo.full_name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 font-medium"
                >
                  GitHub <ExternalLink className="w-3 h-3" />
                </a>

                <Link
                  to={`/repositories/${repo.id}`}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Configure & View Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connect Repo Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Connect Repository
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Authorize a GitHub repository for autonomous issue triage and automated PR delivery.
            </p>

            <form onSubmit={handleConnectRepo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Repository Full Name (owner/repo):
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. facebook/react or acme-corp/service"
                  value={newRepoName}
                  onChange={e => setNewRepoName(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default Working Base Branch:
                </label>
                <input
                  type="text"
                  value={newBaseBranch}
                  onChange={e => setNewBaseBranch(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
                >
                  {submitting ? 'Connecting...' : 'Authorize & Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
