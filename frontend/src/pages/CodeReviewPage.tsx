import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileCode2,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  Cpu,
  Download,
  Copy,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { AgentRunSummary } from '../types';
import { DiffViewer } from '../components/workflow/DiffViewer';

export const CodeReviewPage: React.FC = () => {
  const [runs, setRuns] = useState<AgentRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [reviewData, setReviewData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        setLoading(true);
        const allRuns = await api.getAgentRuns();
        setRuns(allRuns);
        if (allRuns.length > 0) {
          setSelectedRunId(allRuns[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRuns();
  }, []);

  useEffect(() => {
    if (!selectedRunId) return;
    const fetchReview = async () => {
      try {
        const data = await api.getCodeReview(selectedRunId);
        setReviewData(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchReview();
  }, [selectedRunId]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-indigo-500" />
            Code Review & Diff Inspection
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit proposed code modifications, test execution results, and automated AI security findings
          </p>
        </div>

        {/* Workflow Selector */}
        {runs.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Select Workflow:</span>
            <select
              value={selectedRunId}
              onChange={e => setSelectedRunId(e.target.value)}
              className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 font-mono focus:outline-none focus:border-indigo-500"
            >
              {runs.map(r => (
                <option key={r.id} value={r.id}>
                  #{r.issue_number} ({r.repository_name})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading || !reviewData ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading code review...</div>
      ) : (
        <div className="space-y-6">
          {/* Review Scorecards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 block mb-1">AI Reviewer Confidence</span>
              <div className="text-2xl font-extrabold text-emerald-500 font-mono">
                {Math.round(reviewData.confidence_score * 100)}%
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {reviewData.confidence_reason || 'Verified against acceptance criteria'}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 block mb-1">Human Approval Status</span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                {reviewData.is_approved ? (
                  <span className="text-emerald-500 flex items-center gap-1.5 text-lg font-bold">
                    <CheckCircle className="w-5 h-5" /> Authorized by User
                  </span>
                ) : (
                  <span className="text-amber-500 flex items-center gap-1.5 text-lg font-bold">
                    <AlertTriangle className="w-5 h-5" /> Pending Approval Gate
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Human governance enforced
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 block mb-1">Sandbox Test Status</span>
              <div className="text-2xl font-extrabold text-emerald-500 font-mono">
                {reviewData.latest_test_execution?.passed_count || 0} Passed / {reviewData.latest_test_execution?.failed_count || 0} Failed
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Duration: {reviewData.latest_test_execution?.duration_seconds || 0}s
              </span>
            </div>
          </div>

          {/* Diff Viewer Component */}
          {reviewData.patch ? (
            <DiffViewer
              patchContent={reviewData.patch.patch_content}
              filesChanged={reviewData.patch.files_changed || []}
              changeSummary={reviewData.patch.change_summary}
            />
          ) : (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
              No patch generated for this run yet.
            </div>
          )}

          {/* Review Findings */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Automated Code Review Findings ({reviewData.review_findings?.length || 0})
            </h3>

            <div className="space-y-3">
              {reviewData.review_findings?.map((f: any) => (
                <div key={f.id} className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{f.title}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {f.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{f.description}</p>
                    {f.file_path && (
                      <span className="text-[11px] font-mono text-indigo-500 mt-2 block">
                        Target: {f.file_path} {f.line_number ? `(Line ${f.line_number})` : ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
