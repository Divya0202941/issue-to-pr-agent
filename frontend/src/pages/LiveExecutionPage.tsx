import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Cpu,
  GitPullRequest,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Clock,
  Terminal,
  FileCode,
  ShieldAlert,
  ExternalLink,
  ChevronRight,
  Play,
  Pause,
  Ban
} from 'lucide-react';
import { api, getEventSourceUrl } from '../services/api';
import { AgentRunDetail, AgentName } from '../types';
import { AgentPipelineGraph } from '../components/workflow/AgentPipelineGraph';
import { TerminalLogViewer } from '../components/workflow/TerminalLogViewer';
import { DiffViewer } from '../components/workflow/DiffViewer';
import { ApprovalModal } from '../components/workflow/ApprovalModal';

export const LiveExecutionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<AgentRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'logs' | 'patch' | 'tests' | 'review' | 'pr'>('logs');
  const [selectedAgent, setSelectedAgent] = useState<AgentName>('issue_analyzer');
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalType, setApprovalType] = useState<'patch' | 'pull_request'>('patch');
  const [actionLoading, setActionLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchRunDetail = async () => {
    if (!id) return;
    try {
      const data = await api.getAgentRun(id);
      setRun(data);
      setFetchError(null);
      if (data.current_agent) {
        setSelectedAgent(data.current_agent);
      }
    } catch (err: any) {
      console.error('Failed to load run detail:', err);
      setFetchError(err.message || 'Unable to retrieve workflow details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRunDetail();

    // Setup SSE streaming listener
    if (!id) return;
    const eventSource = new EventSource(getEventSourceUrl(id));

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'state_change' || payload.type === 'log') {
          fetchRunDetail();
        }
      } catch (_) {}
    };

    eventSource.addEventListener('state_change', () => fetchRunDetail());
    eventSource.addEventListener('update', () => fetchRunDetail());

    // Polling fallback every 3 seconds for active runs
    const interval = setInterval(() => {
      if (run && !['completed', 'failed', 'cancelled'].includes(run.status)) {
        fetchRunDetail();
      }
    }, 3000);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, [id]);

  const handleApprovePatch = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      await api.approvePatch(id, true);
      setApprovalModalOpen(false);
      fetchRunDetail();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPatch = async (reason?: string) => {
    if (!id) return;
    try {
      setActionLoading(true);
      await api.approvePatch(id, false, reason);
      setApprovalModalOpen(false);
      fetchRunDetail();
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprovePR = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      await api.approvePR(id, true);
      setApprovalModalOpen(false);
      fetchRunDetail();
    } catch (err: any) {
      alert(err.message || 'PR approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRun = async () => {
    if (!id || !confirm('Are you sure you want to cancel this autonomous workflow?')) return;
    try {
      await api.cancelRun(id);
      fetchRunDetail();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel run');
    }
  };

  const handleRetryRun = async () => {
    if (!id) return;
    try {
      await api.retryRun(id);
      fetchRunDetail();
    } catch (err: any) {
      alert(err.message || 'Failed to retry run');
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3">
        <Cpu className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="font-medium text-slate-600 dark:text-slate-300">Loading autonomous execution pipeline...</span>
      </div>
    );
  }

  if (fetchError && !run) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Unable to Load Workflow</h3>
        <p className="text-xs text-slate-500">{fetchError}</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => { setLoading(true); fetchRunDetail(); }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
          >
            Retry Loading
          </button>
          <Link
            to="/issues"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Back to Intake
          </Link>
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Workflow Not Found</h3>
        <p className="text-xs text-slate-500">The requested run ID does not exist or may have expired.</p>
        <Link
          to="/issues"
          className="inline-block px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
        >
          Return to Issue Intake
        </Link>
      </div>
    );
  }

  const isAwaitingPatchApproval = Boolean(
    run &&
    (!run.patch || !run.patch.is_approved) &&
    run.status === 'awaiting_patch_approval'
  );

  const isAwaitingPrApproval = Boolean(
    run &&
    (!run.pull_request || !run.pull_request.is_approved) &&
    run.status === 'awaiting_pr_approval'
  );

  return (
    <div className="space-y-6">
      {/* Top Workflow Summary Bar */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="font-mono text-xs font-bold text-indigo-500">
              {run.repository_name}
            </span>
            <span className="text-slate-400">/</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Issue #{run.issue_number}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
              ${run.status === 'completed'
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : run.status === 'failed'
                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                : run.status.includes('awaiting')
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse'
                : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 animate-pulse'}`}
            >
              {run.status.replace(/_/g, ' ')}
            </span>
            {run.is_demo && (
              <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                DEMO MODE
              </span>
            )}
          </div>

          <h2 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1">
            {run.issue_title}
          </h2>

          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span>Branch: <strong className="text-slate-700 dark:text-slate-300">{run.branch_name}</strong></span>
            <span>Confidence: <strong className="text-emerald-500">{Math.round(run.confidence_score * 100)}%</strong></span>
            {run.correction_attempt > 0 && (
              <span className="text-amber-500 font-semibold">Correction Loop: Attempt #{run.correction_attempt}</span>
            )}
          </div>
        </div>

        {/* Workflow Actions */}
        <div className="flex items-center gap-2 self-end md:self-center">
          {isAwaitingPatchApproval && (
            <button
              onClick={() => {
                setApprovalType('patch');
                setApprovalModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Approve Patch
            </button>
          )}

          {isAwaitingPrApproval && (
            <button
              onClick={() => {
                setApprovalType('pull_request');
                setApprovalModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
            >
              <GitPullRequest className="w-3.5 h-3.5" /> Authorize PR
            </button>
          )}

          {run.status === 'failed' && (
            <button
              onClick={handleRetryRun}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retry Step
            </button>
          )}

          {!['completed', 'failed', 'cancelled'].includes(run.status) && (
            <button
              onClick={handleCancelRun}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition flex items-center gap-1.5"
            >
              <Ban className="w-3.5 h-3.5" /> Cancel Workflow
            </button>
          )}
        </div>
      </div>

      {/* HUMAN APPROVAL GATE 1: Patch Approval Callout */}
      {isAwaitingPatchApproval && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Human Approval Required: Proposed Code Patch
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                The Fix Generator prepared a minimal patch. Inspect and approve before tests execute in the isolated sandbox.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setApprovalType('patch');
                setApprovalModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Reject Patch</span>
            </button>
            <button
              onClick={() => {
                setApprovalType('patch');
                setApprovalModalOpen(true);
              }}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 transition flex items-center gap-1.5 whitespace-nowrap"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Approve Patch</span>
            </button>
          </div>
        </div>
      )}

      {/* HUMAN APPROVAL GATE 2: PR Creation Callout */}
      {isAwaitingPrApproval && (
        <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-600/30">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Human Approval Required: Open Pull Request
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                All sandbox tests passed and the Reviewer Agent verified security. Ready to publish Pull Request on GitHub.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setApprovalType('pull_request');
              setApprovalModalOpen(true);
            }}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 transition flex items-center gap-1.5 whitespace-nowrap"
          >
            Authorize Pull Request <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pipeline Visual Graph */}
      <AgentPipelineGraph
        currentAgent={run.current_agent}
        status={run.status}
        executions={run.executions || []}
        correctionAttempt={run.correction_attempt}
        maxCorrections={run.max_correction_attempts}
        selectedAgent={selectedAgent}
        onSelectAgent={setSelectedAgent}
      />

      {/* Tabbed Inspection Panel */}
      <div className="space-y-4">
        {/* Tab Buttons */}
        <div className="border-b border-slate-200 dark:border-slate-800 flex gap-6 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'logs'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Live Logs & Telemetry ({run.logs?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('patch')}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'patch'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Code Patch & Diff {run.patch ? '✓' : ''}
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'tests'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Sandbox Test Execution ({run.test_executions?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('review')}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'review'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Review Findings ({run.review_findings?.length || 0})
          </button>

          {run.pull_request && (
            <button
              onClick={() => setActiveTab('pr')}
              className={`pb-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
                activeTab === 'pr'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <GitPullRequest className="w-3.5 h-3.5 text-emerald-500" />
              Pull Request Result
            </button>
          )}
        </div>

        {/* Tab 1: Terminal Logs */}
        {activeTab === 'logs' && (
          <TerminalLogViewer logs={run.logs || []} height="h-[440px]" />
        )}

        {/* Tab 2: Code Patch Diff */}
        {activeTab === 'patch' && (
          <div className="space-y-4">
            {isAwaitingPatchApproval && run.patch && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-amber-500/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Review & Authorize Code Patch
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Carefully inspect the unified diff below. Approving will run automated verification tests in the isolated sandbox.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => {
                      setApprovalType('patch');
                      setApprovalModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject Patch</span>
                  </button>
                  <button
                    onClick={() => {
                      setApprovalType('patch');
                      setApprovalModalOpen(true);
                    }}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 transition flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Approve Patch</span>
                  </button>
                </div>
              </div>
            )}

            {run.patch ? (
              <DiffViewer
                patchContent={run.patch.patch_content}
                filesChanged={run.patch.files_changed || []}
                changeSummary={run.patch.change_summary}
                isAwaitingApproval={isAwaitingPatchApproval}
                onApprove={() => {
                  setApprovalType('patch');
                  setApprovalModalOpen(true);
                }}
                onReject={() => {
                  setApprovalType('patch');
                  setApprovalModalOpen(true);
                }}
                actionLoading={actionLoading}
              />
            ) : (
              <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                Patch has not been generated yet. The Fix Generator will produce it in Step 3.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Sandbox Test Results */}
        {activeTab === 'tests' && (
          <div className="space-y-4">
            {run.test_executions?.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                Sandbox tests have not executed yet. They run automatically in Step 4.
              </div>
            ) : (
              run.test_executions?.map(te => (
                <div key={te.id} className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                        $ {te.test_command}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500">
                        {te.sandbox_type}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-xs">
                      <span className="text-emerald-500 font-bold">{te.passed_count} passed</span>
                      <span className={`${te.failed_count > 0 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                        {te.failed_count} failed
                      </span>
                      <span className="text-slate-400 font-mono">{te.duration_seconds}s</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#090D14] p-4 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {te.stdout || te.stderr || 'No stdout recorded.'}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 4: Reviewer Findings */}
        {activeTab === 'review' && (
          <div className="space-y-3">
            {run.review_findings?.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                No review findings reported yet.
              </div>
            ) : (
              run.review_findings?.map(f => (
                <div key={f.id} className="p-4 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                  <ShieldAlert className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    f.severity === 'critical' ? 'text-rose-500' : f.severity === 'warning' ? 'text-amber-500' : 'text-indigo-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{f.title}</h4>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md font-mono bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {f.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{f.description}</p>
                    {f.file_path && (
                      <span className="text-[11px] font-mono text-indigo-500 mt-2 block">
                        File: {f.file_path} {f.line_number ? `(Line ${f.line_number})` : ''}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 5: Pull Request Result */}
        {activeTab === 'pr' && run.pull_request && (
          <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <GitPullRequest className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-bold text-slate-900 dark:text-white">Pull Request #{run.pull_request.pr_number}</span>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase">
                  {run.pull_request.state}
                </span>
                {(run.is_demo || run.pull_request.is_demo) && (
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase">
                    Demo Simulation
                  </span>
                )}
              </div>

              {run.pull_request.html_url && (
                (run.is_demo || run.pull_request.is_demo) ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-amber-500 font-mono font-medium">
                      Simulated PR (Local Only)
                    </span>
                    <button
                      disabled
                      title="This is a simulated demo PR for demo repository acme-corp/auth-service. Because it was run in Zero-Token Demo Mode without GitHub credentials, no real PR was created on GitHub."
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed flex items-center gap-1.5"
                    >
                      Demo PR #{run.pull_request.pr_number} (Local Mock)
                    </button>
                  </div>
                ) : (
                  <a
                    href={run.pull_request.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition"
                  >
                    Inspect on GitHub <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )
              )}
            </div>

            {(run.is_demo || run.pull_request.is_demo) && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                  <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span>Zero-Token Demo Mode Simulation Notice</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  This pull request is an <strong>in-memory local simulation</strong> for the sample repository <code className="font-mono text-amber-600 dark:text-amber-400 font-bold">acme-corp/auth-service</code>.
                  Because it runs without requiring GitHub credentials, <strong>no actual pull request was created on the public GitHub website</strong> (which is why directly opening the URL returns a GitHub 404).
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  To create a real pull request on your own repository, configure a GitHub Personal Access Token in Settings and submit an issue from your connected GitHub repository.
                </p>
              </div>
            )}

            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {run.pull_request.title}
            </h3>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
              {run.pull_request.description}
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              Safety Guarantee: Automatic merge is disabled. A human team member must review and approve this PR on GitHub.
            </div>
          </div>
        )}
      </div>

      {/* Human Approval Modal */}
      <ApprovalModal
        isOpen={approvalModalOpen}
        type={approvalType}
        title={approvalType === 'patch' ? 'Authorize Code Patch Application' : 'Authorize Pull Request Creation'}
        description={
          approvalType === 'patch'
            ? 'Review the proposed code patch before changes are applied in the isolated test sandbox.'
            : 'All tests passed and code review confirmed zero critical vulnerabilities. Authorize the PR Agent to open the Pull Request.'
        }
        loading={actionLoading}
        onApprove={approvalType === 'patch' ? handleApprovePatch : handleApprovePR}
        onReject={handleRejectPatch}
        onClose={() => setApprovalModalOpen(false)}
      />
    </div>
  );
};
