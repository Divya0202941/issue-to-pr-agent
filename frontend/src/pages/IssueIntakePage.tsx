import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Search,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Check,
  GitBranch,
  FolderGit2,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { Issue, Repository } from '../types';

interface DemoScenario {
  id: string;
  title: string;
  issueNumber: number;
  repo: string;
  url: string;
  baseBranch: string;
  description: string;
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'validation-empty-input',
    title: 'Fix incorrect validation for empty user input',
    issueNumber: 101,
    repo: 'acme-corp/auth-service',
    url: 'https://github.com/acme-corp/auth-service/issues/101',
    baseBranch: 'main',
    description: 'Empty username & whitespace validation bypass in validate_user().'
  },
  {
    id: 'jwt-clock-skew',
    title: 'Enforce maximum clock skew leeway in JWT check',
    issueNumber: 102,
    repo: 'acme-corp/auth-service',
    url: 'https://github.com/acme-corp/auth-service/issues/102',
    baseBranch: 'main',
    description: 'Allow 5-second clock skew tolerance on token expiration verification.'
  },
  {
    id: 'gateway-rate-limit',
    title: 'Rate limiting reverse proxy connection leak',
    issueNumber: 1,
    repo: 'acme-corp/api-gateway',
    url: 'https://github.com/acme-corp/api-gateway/issues/1',
    baseBranch: 'main',
    description: 'Upstream connection pooling and leaky bucket rate limiter.'
  }
];

export const IssueIntakePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [issueUrl, setIssueUrl] = useState('https://github.com/acme-corp/auth-service/issues/101');
  const [baseBranch, setBaseBranch] = useState('main');
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('acme-corp/auth-service');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    is_valid: boolean;
    owner?: string;
    repo?: string;
    issue_number?: number;
    error?: string;
  } | null>(null);
  const [fetchedIssue, setFetchedIssue] = useState<Issue | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('validation-empty-input');
  const [scenarioLoadedFeedback, setScenarioLoadedFeedback] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);

  // Validate an issue URL and fetch its preview
  const handleValidateUrl = useCallback(async (urlToValidate: string) => {
    if (!urlToValidate || !urlToValidate.trim()) return null;
    const cleanUrl = urlToValidate.trim();
    try {
      setValidating(true);
      const res = await api.validateIssueUrl(cleanUrl);
      setValidationResult(res);

      if (res.is_valid && res.owner && res.repo) {
        const matchingFullName = `${res.owner}/${res.repo}`;
        setSelectedRepo(matchingFullName);
        
        // Auto-switch mode based on owner: acme-corp is demo; real repos default to Live GitHub mode
        if (res.owner === 'acme-corp') {
          setIsDemoMode(true);
        } else {
          setIsDemoMode(false);
        }

        try {
          const issueData = await api.fetchIssue(cleanUrl);
          setFetchedIssue(issueData);
        } catch {
          // Fallback minimal preview if fetch fails
          setFetchedIssue({
            id: `issue-${res.issue_number}`,
            repository_id: matchingFullName,
            issue_number: res.issue_number || 101,
            title: res.issue_number === 101
              ? 'Fix incorrect validation for empty user input'
              : `Issue #${res.issue_number}`,
            body: 'Validated GitHub issue ready for autonomous patch generation.',
            author: 'demo-user',
            state: 'open',
            labels: ['bug', 'automated-triage'],
            html_url: cleanUrl,
            is_demo: true,
            created_at: new Date().toISOString()
          });
        }
      } else {
        setFetchedIssue(null);
      }
      return res;
    } catch (err: any) {
      setValidationResult({ is_valid: false, error: err.message || 'Validation request failed' });
      setFetchedIssue(null);
      return null;
    } finally {
      setValidating(false);
    }
  }, []);

  // Load repositories on mount
  useEffect(() => {
    const loadRepos = async () => {
      try {
        const repos = await api.getRepositories();
        setRepositories(repos);
        // Default to acme-corp/auth-service if present, or first available repo
        const defaultRepo = repos.find(r => r.full_name === 'acme-corp/auth-service') || repos[0];
        if (defaultRepo) {
          setSelectedRepo(defaultRepo.full_name);
        }
      } catch (err) {
        console.error('Error fetching repositories:', err);
      }
    };
    loadRepos();
  }, []);

  // Handle URL query parameters or trigger initial validation
  useEffect(() => {
    const scenarioParam = searchParams.get('scenario');
    const repoParam = searchParams.get('repo');

    if (scenarioParam) {
      const match = DEMO_SCENARIOS.find(s => s.id === scenarioParam);
      if (match) {
        loadScenario(match);
        return;
      }
    }

    if (repoParam) {
      const customUrl = `https://github.com/${repoParam}/issues/1`;
      setIssueUrl(customUrl);
      setSelectedRepo(repoParam);
      handleValidateUrl(customUrl);
      return;
    }

    // Default mount validation
    handleValidateUrl(issueUrl);
  }, [searchParams, handleValidateUrl]);

  // Load a full scenario
  const loadScenario = (scenario: DemoScenario) => {
    setActiveScenarioId(scenario.id);
    setIssueUrl(scenario.url);
    setSelectedRepo(scenario.repo);
    setBaseBranch(scenario.baseBranch);
    setIsDemoMode(true);
    setScenarioLoadedFeedback(true);

    // Run validation immediately
    handleValidateUrl(scenario.url);

    setTimeout(() => {
      setScenarioLoadedFeedback(false);
    }, 2500);
  };

  // Dropdown change handler
  const handleRepoChange = (repoFullName: string) => {
    setSelectedRepo(repoFullName);
    // Find matching scenario or generate URL for selected repository
    const matchingScenario = DEMO_SCENARIOS.find(s => s.repo === repoFullName);
    if (matchingScenario) {
      setIssueUrl(matchingScenario.url);
      setBaseBranch(matchingScenario.baseBranch);
      setActiveScenarioId(matchingScenario.id);
      setIsDemoMode(true);
      handleValidateUrl(matchingScenario.url);
    } else {
      const customUrl = `https://github.com/${repoFullName}/issues/1`;
      setIssueUrl(customUrl);
      setIsDemoMode(false);
      handleValidateUrl(customUrl);
    }
  };

  // Form submission handler
  const handleStartWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();

    let validRes = validationResult;
    if (!validRes || !validRes.is_valid) {
      // Validate on the fly
      validRes = await handleValidateUrl(issueUrl);
      if (!validRes?.is_valid) {
        alert(validRes?.error || 'Please provide a valid GitHub issue URL (e.g. https://github.com/owner/repo/issues/123).');
        return;
      }
    }

    try {
      setSubmitting(true);
      const run = await api.createAgentRun(issueUrl.trim(), baseBranch.trim(), undefined, isDemoMode);
      navigate(`/agent-runs/${run.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to start agent run');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
            Intake Phase
          </span>
          {isDemoMode ? (
            <span className="text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              Zero-Token Demo Simulation
            </span>
          ) : (
            <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Live GitHub Integration
            </span>
          )}
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          GitHub Issue Intake & Triage
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Supply any GitHub issue URL to trigger autonomous multi-agent code analysis, patch generation, and test validation.
        </p>
      </div>

      {/* Interactive Scenario Cards Selector */}
      <div className="p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>Select a Pre-Configured Demo Scenario:</span>
          </div>
          {scenarioLoadedFeedback && (
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
              <Check className="w-3.5 h-3.5" /> Scenario Loaded!
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {DEMO_SCENARIOS.map(sc => {
            const isSelected = activeScenarioId === sc.id;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => loadScenario(sc)}
                className={`p-3 rounded-xl text-left transition-all border text-xs flex flex-col justify-between
                  ${isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                    : 'bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold
                      ${isSelected ? 'bg-indigo-700/80 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                      #{sc.issueNumber}
                    </span>
                    <span className={`text-[10px] font-mono ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {sc.repo.split('/')[1]}
                    </span>
                  </div>
                  <strong className="block font-semibold leading-tight line-clamp-2">
                    {sc.title}
                  </strong>
                </div>
                <div className="mt-2 pt-2 border-t border-current/10 flex items-center justify-between text-[11px]">
                  <span className={isSelected ? 'text-indigo-200' : 'text-slate-400'}>
                    Click to load
                  </span>
                  {isSelected ? (
                    <Check className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Primary Load This Scenario Button */}
        <div className="pt-1 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Selected: <strong className="font-semibold text-slate-800 dark:text-slate-200">{DEMO_SCENARIOS.find(s => s.id === activeScenarioId)?.title}</strong>
          </span>
          <button
            type="button"
            id="load-scenario-btn"
            onClick={() => {
              const current = DEMO_SCENARIOS.find(s => s.id === activeScenarioId) || DEMO_SCENARIOS[0];
              loadScenario(current);
            }}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
          >
            {scenarioLoadedFeedback ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Scenario Loaded</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load This Scenario</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Submission Form */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <form onSubmit={handleStartWorkflow} className="space-y-4">
          {/* Issue URL with explicit Validate Button */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              GitHub Issue URL:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="url"
                  required
                  value={issueUrl}
                  onChange={e => {
                    setIssueUrl(e.target.value);
                  }}
                  placeholder="https://github.com/owner/repository/issues/123"
                  className="w-full rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs text-slate-900 dark:text-white font-mono placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
                <div className="absolute right-3 top-2.5">
                  {validating ? (
                    <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                  ) : validationResult?.is_valid ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : validationResult && !validationResult.is_valid ? (
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                  ) : null}
                </div>
              </div>

              {/* Explicit Validate Issue Button */}
              <button
                type="button"
                onClick={() => handleValidateUrl(issueUrl)}
                disabled={validating || !issueUrl.trim()}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition flex-shrink-0 disabled:opacity-50"
              >
                {validating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Validating...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Validate Issue</span>
                  </>
                )}
              </button>
            </div>

            {/* Validation Feedback */}
            {validationResult && !validationResult.is_valid && (
              <p className="text-[11px] text-rose-500 mt-1.5 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{validationResult.error || 'Invalid GitHub issue URL format.'}</span>
              </p>
            )}
            {validationResult?.is_valid && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Issue URL verified: {validationResult.owner}/{validationResult.repo} #{validationResult.issue_number}</span>
              </p>
            )}
          </div>

          {/* Target Repository & Base Branch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <FolderGit2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Target Repository:</span>
              </label>
              <select
                value={selectedRepo}
                onChange={e => handleRepoChange(e.target.value)}
                className="w-full rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
              >
                {repositories.map(r => (
                  <option key={r.id} value={r.full_name}>
                    {r.full_name} {r.is_demo ? '(Demo)' : ''}
                  </option>
                ))}
                {!repositories.some(r => r.full_name === selectedRepo) && (
                  <option value={selectedRepo}>{selectedRepo} (Demo)</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-indigo-500" />
                <span>Working Base Branch:</span>
              </label>
              <input
                type="text"
                value={baseBranch}
                onChange={e => setBaseBranch(e.target.value)}
                className="w-full rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Execution Mode Selector Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 dark:text-slate-200">Execution Mode:</span>
                {isDemoMode ? (
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase">
                    Zero-Token Demo Simulation
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">
                    Live GitHub Mode (Real PR)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isDemoMode
                  ? 'Simulates patch generation and Pull Request creation safely offline without creating branches on GitHub.'
                  : 'Uses your configured GitHub Personal Access Token to commit the patch and open a genuine Pull Request on GitHub.'}
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 select-none flex-shrink-0 font-medium">
              <input
                type="checkbox"
                checked={isDemoMode}
                onChange={e => setIsDemoMode(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs">Run as Offline Demo</span>
            </label>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Human approval required before patch commit or PR creation.
            </span>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25 cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Initializing Agent Pipeline...' : 'Start Autonomous Workflow'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Live Issue Preview Card */}
      {fetchedIssue && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">Issue Preview from GitHub</span>
              <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md">
                #{fetchedIssue.issue_number}
              </span>
              <span className="text-[10px] font-mono text-indigo-500 font-semibold">
                ({selectedRepo})
              </span>
            </div>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase">
              {fetchedIssue.state}
            </span>
          </div>

          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {fetchedIssue.title}
          </h3>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
            {fetchedIssue.body || 'No description body.'}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-400 mr-1">Labels:</span>
              {fetchedIssue.labels?.map(label => (
                <span key={label} className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50">
                  {label}
                </span>
              ))}
            </div>
            <a
              href={fetchedIssue.html_url || issueUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-indigo-500 hover:text-indigo-400 flex items-center gap-1 font-medium"
            >
              <span>View Source on GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
