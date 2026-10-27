import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FolderGit2,
  GitBranch,
  Settings,
  FileCode,
  Cpu,
  GitPullRequest,
  Save,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { Repository } from '../types';

export const RepositoryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [repo, setRepo] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'config' | 'branches'>('overview');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states
  const [testCmd, setTestCmd] = useState('');
  const [baseBranch, setBaseBranch] = useState('main');
  const [requirePatchApproval, setRequirePatchApproval] = useState(true);
  const [requirePRApproval, setRequirePRApproval] = useState(true);
  const [timeoutSeconds, setTimeoutSeconds] = useState(60);

  useEffect(() => {
    const fetchRepo = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await api.getRepository(id);
        setRepo(data);
        if (data.configuration) {
          setTestCmd(data.configuration.test_command || 'pytest');
          setBaseBranch(data.configuration.base_branch || data.default_branch || 'main');
          setRequirePatchApproval(data.configuration.require_patch_approval ?? true);
          setRequirePRApproval(data.configuration.require_pr_approval ?? true);
          setTimeoutSeconds(data.configuration.timeout_seconds || 60);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRepo();
  }, [id]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      setSaving(true);
      await api.updateRepositoryConfig(id, {
        test_command: testCmd,
        base_branch: baseBranch,
        require_patch_approval: requirePatchApproval,
        require_pr_approval: requirePRApproval,
        timeout_seconds: Number(timeoutSeconds)
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to update repository settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading repository details...</div>;
  }

  if (!repo) {
    return <div className="p-8 text-center text-xs text-slate-400">Repository not found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-indigo-500 font-bold">{repo.owner}</span>
            <span className="text-slate-400">/</span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-mono">{repo.name}</h2>
            {repo.is_demo && (
              <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                DEMO MODE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{repo.description || 'No description provided.'}</p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={repo.html_url || `https://github.com/${repo.full_name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
          >
            Open on GitHub <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <Link
            to={`/issues?repo=${repo.full_name}`}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition"
          >
            Submit Issue to this Repo
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Overview & Stats
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'config'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Agent & Sandbox Configuration
        </button>
        <button
          onClick={() => setActiveTab('branches')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'branches'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Branches & Permissions
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-semibold block mb-1">Associated Agent Runs</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">{repo.agent_runs_count}</span>
          </div>
          <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-semibold block mb-1">Delivered Pull Requests</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">{repo.pull_requests_count}</span>
          </div>
          <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-semibold block mb-1">Default Base Branch</span>
            <span className="text-2xl font-extrabold text-indigo-500 font-mono">{repo.default_branch}</span>
          </div>
        </div>
      )}

      {/* Tab 2: Config */}
      {activeTab === 'config' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm max-w-2xl">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Repository Agent Settings
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Fine-tune test execution commands, sandbox limits, and human approval boundaries.
          </p>

          <form onSubmit={handleSaveConfig} className="space-y-5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sandbox Test Command:
              </label>
              <input
                type="text"
                value={testCmd}
                onChange={e => setTestCmd(e.target.value)}
                placeholder="e.g. pytest tests/ or npm test"
                className="w-full rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Executed within isolated sandbox with memory and timeout enforcement.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Base Working Branch:
              </label>
              <input
                type="text"
                value={baseBranch}
                onChange={e => setBaseBranch(e.target.value)}
                className="w-full rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sandbox Execution Timeout (Seconds):
              </label>
              <input
                type="number"
                min="10"
                max="300"
                value={timeoutSeconds}
                onChange={e => setTimeoutSeconds(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requirePatchApproval}
                  onChange={e => setRequirePatchApproval(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Require Human Approval before applying code patch to working branch
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requirePRApproval}
                  onChange={e => setRequirePRApproval(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Require Human Approval before opening GitHub Pull Request
                </span>
              </label>
            </div>

            <div className="pt-4 flex items-center justify-between">
              {saveSuccess ? (
                <span className="text-emerald-500 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Configuration saved!
                </span>
              ) : <span></span>}

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Branches */}
      {activeTab === 'branches' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm max-w-2xl space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Authorized Branches</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Agents only create branches prefixed with <code className="text-indigo-400">fix/</code> or <code className="text-indigo-400">agent/</code> and target authorized base branches.
          </p>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs font-mono">
            {['main', 'staging', 'develop'].map(b => (
              <div key={b} className="py-2.5 flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <GitBranch className="w-3.5 h-3.5 text-slate-400" /> {b}
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-sans font-semibold">
                  Authorized Base
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
