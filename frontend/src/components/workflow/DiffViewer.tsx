import React, { useState } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Download,
  Split,
  Maximize2,
  FileText,
  Plus,
  Minus,
  CheckCircle,
  XCircle,
  ShieldCheck
} from 'lucide-react';
import { ChangedFile } from '../../types';

interface DiffViewerProps {
  patchContent: string;
  filesChanged: ChangedFile[];
  changeSummary?: string;
  isAwaitingApproval?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  actionLoading?: boolean;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  patchContent,
  filesChanged,
  changeSummary,
  isAwaitingApproval = false,
  onApprove,
  onReject,
  actionLoading = false
}) => {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [copied, setCopied] = useState(false);

  const activeFile = filesChanged[selectedFileIndex] || filesChanged[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile ? (activeFile.diff || patchContent) : patchContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([patchContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'proposed_patch.diff';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Parse lines for unified display
  const rawDiff = activeFile?.diff || patchContent || '';
  const lines = rawDiff.split('\n');

  return (
    <div className="w-full rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      {/* Header Bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60 dark:bg-[#0E1524]">
        <div className="flex items-center gap-3">
          <FileCode className="w-5 h-5 text-indigo-500" />
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Code Patch & Review Diff
            </h4>
            {changeSummary && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                {changeSummary}
              </p>
            )}
          </div>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center rounded-lg bg-slate-200 dark:bg-slate-800 p-0.5 text-xs font-medium">
            <button
              onClick={() => setViewMode('unified')}
              className={`px-2.5 py-1 rounded-md transition ${
                viewMode === 'unified'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Unified
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded-md transition ${
                viewMode === 'split'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Split View
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            title="Copy diff to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Copy</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            title="Download patch file"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download .diff</span>
          </button>

          {isAwaitingApproval && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
              {onReject && (
                <button
                  type="button"
                  onClick={onReject}
                  disabled={actionLoading}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition"
                  title="Reject patch and request changes"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              )}
              {onApprove && (
                <button
                  type="button"
                  onClick={onApprove}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-sm shadow-emerald-600/30 transition"
                  title="Approve patch to proceed to test sandbox"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Approve Patch</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Diff Area */}
      <div className="flex flex-col md:flex-row">
        {/* File Navigator Sidebar (if multiple files) */}
        {filesChanged && filesChanged.length > 0 && (
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-[#0B0F17]/50 p-2 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 block">
              Changed Files ({filesChanged.length})
            </span>
            {filesChanged.map((f, i) => (
              <button
                key={f.file_path}
                onClick={() => setSelectedFileIndex(i)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition
                  ${selectedFileIndex === i
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40'}`}
              >
                <span className="truncate max-w-[140px] font-mono">{f.file_path}</span>
                <span className="flex items-center gap-1 text-[10px] font-mono">
                  <span className="text-emerald-500">+{f.additions}</span>
                  <span className="text-rose-500">-{f.deletions}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Diff Content Body */}
        <div className="flex-1 overflow-x-auto p-4 font-mono text-xs bg-[#090D14] text-slate-200 min-h-[300px]">
          {viewMode === 'unified' ? (
            <div className="space-y-0.5 leading-relaxed">
              {lines.map((line, idx) => {
                let bgClass = 'hover:bg-white/[0.02] text-slate-300';
                let indicator = ' ';
                if (line.startsWith('+') && !line.startsWith('+++')) {
                  bgClass = 'bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500 pl-1';
                  indicator = '+';
                } else if (line.startsWith('-') && !line.startsWith('---')) {
                  bgClass = 'bg-rose-950/40 text-rose-300 border-l-2 border-rose-500 pl-1';
                  indicator = '-';
                } else if (line.startsWith('@@')) {
                  bgClass = 'text-indigo-400 bg-indigo-950/20 font-bold py-1 my-1 rounded px-1';
                }

                return (
                  <div key={idx} className={`flex items-start gap-3 py-0.5 px-2 rounded ${bgClass}`}>
                    <span className="w-8 text-right text-slate-600 select-none text-[11px]">
                      {idx + 1}
                    </span>
                    <pre className="flex-1 font-mono whitespace-pre-wrap break-all">
                      {line}
                    </pre>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Split View (Before / After) */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border border-slate-800 rounded-xl p-3 bg-[#0B0F17]">
                <div className="text-[11px] font-semibold text-rose-400 mb-2 border-b border-slate-800 pb-1 flex items-center justify-between">
                  <span>Original Code (Base Branch)</span>
                  <Minus className="w-3.5 h-3.5" />
                </div>
                <pre className="font-mono text-xs text-slate-400 whitespace-pre-wrap">
                  {activeFile?.old_content || 'No previous file content recorded.'}
                </pre>
              </div>

              <div className="border border-slate-800 rounded-xl p-3 bg-[#0B0F17]">
                <div className="text-[11px] font-semibold text-emerald-400 mb-2 border-b border-slate-800 pb-1 flex items-center justify-between">
                  <span>Proposed Code (Patched)</span>
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <pre className="font-mono text-xs text-emerald-300 whitespace-pre-wrap">
                  {activeFile?.new_content || 'No new file content recorded.'}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Approval Footer Callout */}
      {isAwaitingApproval && (
        <div className="p-4 border-t border-amber-500/30 bg-amber-500/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                Human Approval Required: Proposed Code Patch
              </h5>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Verify this unified diff before sandbox execution. Approving launches the isolated pytest test suite.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onReject && (
              <button
                type="button"
                onClick={onReject}
                disabled={actionLoading}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject Patch
              </button>
            )}
            {onApprove && (
              <button
                type="button"
                onClick={onApprove}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/25 transition flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Approve Patch
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
