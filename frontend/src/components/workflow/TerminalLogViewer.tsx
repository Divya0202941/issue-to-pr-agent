import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Copy, Check, ArrowDown, Search, Filter } from 'lucide-react';
import { AgentExecutionLog } from '../../types';

interface TerminalLogViewerProps {
  logs: AgentExecutionLog[];
  height?: string;
  title?: string;
}

export const TerminalLogViewer: React.FC<TerminalLogViewerProps> = ({
  logs,
  height = 'h-96',
  title = 'Execution Logs & Telemetry'
}) => {
  const [filter, setFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const copyToClipboard = () => {
    const text = logs
      .map(l => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.level}] [${l.agent_name}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLogs = logs.filter(log => {
    const matchesQuery = filter === '' || log.message.toLowerCase().includes(filter.toLowerCase()) || log.agent_name.toLowerCase().includes(filter.toLowerCase());
    const matchesLevel = levelFilter === 'ALL' || log.level === levelFilter;
    return matchesQuery && matchesLevel;
  });

  return (
    <div className="w-full rounded-2xl bg-[#090D14] border border-slate-800 text-slate-200 overflow-hidden shadow-xl flex flex-col font-mono text-xs">
      {/* Terminal Title Bar */}
      <div className="px-4 py-3 bg-[#0F1626] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
          </div>
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-slate-300 tracking-tight text-[11px] font-sans">
            {title}
          </span>
          <span className="text-[10px] text-slate-500">
            ({logs.length} lines)
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* Level Filter */}
          <select
            value={levelFilter}
            onChange={e => setLevelFilter(e.target.value)}
            className="bg-[#090D14] border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-400 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Levels</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
          </select>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-2 text-slate-500" />
            <input
              type="text"
              placeholder="Filter logs..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="bg-[#090D14] border border-slate-800 rounded-lg pl-6 pr-2 py-1 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500 w-32 sm:w-44"
            />
          </div>

          {/* Auto Scroll Toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-1 rounded-lg border text-[11px] flex items-center gap-1 transition
              ${autoScroll
                ? 'bg-indigo-950/60 border-indigo-700/80 text-indigo-400'
                : 'bg-transparent border-slate-800 text-slate-500 hover:text-slate-300'}`}
            title="Auto-scroll"
          >
            <ArrowDown className="w-3 h-3" />
            <span className="hidden sm:inline">Auto</span>
          </button>

          {/* Copy Button */}
          <button
            onClick={copyToClipboard}
            className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Copy logs to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Terminal Content Body */}
      <div
        ref={scrollRef}
        className={`${height} overflow-y-auto p-4 space-y-1.5 terminal-scroll select-text`}
      >
        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-600">
            No log entries to display.
          </div>
        ) : (
          filteredLogs.map(log => {
            let levelColor = 'text-slate-400';
            if (log.level === 'INFO') levelColor = 'text-cyan-400';
            if (log.level === 'WARN') levelColor = 'text-amber-400';
            if (log.level === 'ERROR') levelColor = 'text-rose-400';

            const timeStr = new Date(log.timestamp).toLocaleTimeString();

            return (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed hover:bg-white/[0.02] px-1 rounded transition">
                <span className="text-slate-600 text-[10px] select-none flex-shrink-0">
                  {timeStr}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono select-none flex-shrink-0 ${levelColor}`}>
                  [{log.level}]
                </span>
                <span className="text-indigo-400/90 text-[10px] select-none flex-shrink-0">
                  [{log.agent_name}]:
                </span>
                <span className="text-slate-200 break-all">
                  {log.message}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
