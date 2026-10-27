import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  User,
  Cpu
} from 'lucide-react';
import { api } from '../services/api';
import { AuditEventItem } from '../types';

export const ActivityLogsPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  useEffect(() => {
    const fetchAuditEvents = async () => {
      try {
        setLoading(true);
        const data = await api.getActivityLogs();
        setEvents(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAuditEvents();
  }, []);

  const filteredEvents = events.filter(e => {
    const matchesQuery =
      e.event_type.toLowerCase().includes(search.toLowerCase()) ||
      (e.repository_name && e.repository_name.toLowerCase().includes(search.toLowerCase())) ||
      e.actor.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'ALL' || e.event_type === typeFilter;
    return matchesQuery && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-500" />
            Activity History & Audit Trail
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Immutable log of all human approvals, agent transitions, and repository operations
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by event type, actor, or repository..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="ALL">All Event Types</option>
          <option value="ISSUE_SUBMITTED">ISSUE_SUBMITTED</option>
          <option value="PATCH_APPROVED">PATCH_APPROVED</option>
          <option value="PATCH_REJECTED">PATCH_REJECTED</option>
          <option value="PR_CREATED">PR_CREATED</option>
          <option value="WORKFLOW_STARTED">WORKFLOW_STARTED</option>
          <option value="WORKFLOW_COMPLETED">WORKFLOW_COMPLETED</option>
          <option value="REPOSITORY_CONNECTED">REPOSITORY_CONNECTED</option>
        </select>
      </div>

      {/* Audit Events Table */}
      <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#0E1524] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-5">Timestamp</th>
                <th className="py-3 px-5">Event Type</th>
                <th className="py-3 px-5">Actor</th>
                <th className="py-3 px-5">Repository</th>
                <th className="py-3 px-5">Details</th>
                <th className="py-3 px-5">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                    No matching audit events found.
                  </td>
                </tr>
              ) : (
                filteredEvents.map(evt => (
                  <tr key={evt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-5 text-slate-400">
                      {new Date(evt.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-5 font-bold text-indigo-500">
                      {evt.event_type}
                    </td>
                    <td className="py-3 px-5">
                      <span className="flex items-center gap-1.5 font-sans font-medium text-slate-900 dark:text-white">
                        {evt.actor === 'system' ? <Cpu className="w-3.5 h-3.5 text-indigo-400" /> : <User className="w-3.5 h-3.5 text-emerald-400" />}
                        {evt.actor}
                      </span>
                    </td>
                    <td className="py-3 px-5 font-medium text-slate-800 dark:text-slate-200">
                      {evt.repository_name || '---'}
                    </td>
                    <td className="py-3 px-5 font-mono text-[10px] text-slate-500 dark:text-slate-400 max-w-xs truncate">
                      {JSON.stringify(evt.details)}
                    </td>
                    <td className="py-3 px-5">
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full font-sans">
                        <CheckCircle className="w-3 h-3" /> {evt.result}
                      </span>
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
