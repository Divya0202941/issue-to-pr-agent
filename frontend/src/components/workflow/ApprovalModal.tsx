import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle, XCircle, X } from 'lucide-react';

interface ApprovalModalProps {
  isOpen: boolean;
  type: 'patch' | 'pull_request';
  title: string;
  description: string;
  onApprove: () => void;
  onReject: (reason?: string) => void;
  onClose: () => void;
  loading?: boolean;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  isOpen,
  type,
  title,
  description,
  onApprove,
  onReject,
  onClose,
  loading = false
}) => {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Human In The Loop Gate
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              {title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {rejecting ? (
          <div className="space-y-3 mb-6">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Rejection Reason or Feedback for AI Correction:
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Please also handle empty string input and strip whitespace before validation."
              className="w-full rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 mb-6 text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Security Guarantee:
            </p>
            <p>• Code is executed only in an unprivileged, isolated sandbox with strict timeouts.</p>
            <p>• No Pull Request is merged automatically. Final merge requires your repository review.</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          {rejecting ? (
            <>
              <button
                type="button"
                onClick={() => setRejecting(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Back
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => onReject(reason)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" /> Confirm Rejection
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setRejecting(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
              >
                Reject & Request Changes
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={onApprove}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 shadow-md ${
                  type === 'patch'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {loading ? 'Processing...' : type === 'patch' ? 'Approve Patch & Run Sandbox Tests' : 'Approve & Create Pull Request'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
