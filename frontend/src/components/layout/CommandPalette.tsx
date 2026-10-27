import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  FolderGit2,
  PlusCircle,
  Cpu,
  FileCode2,
  GitPullRequest,
  History,
  BarChart3,
  Settings,
  Sparkles,
  Sun,
  Moon,
  ArrowRight
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();

  const commands = [
    { title: 'Overview Dashboard', category: 'Navigation', icon: LayoutDashboard, action: () => navigate('/dashboard') },
    { title: 'Submit New GitHub Issue', category: 'Action', icon: PlusCircle, action: () => navigate('/issues') },
    { title: 'Browse Repositories', category: 'Navigation', icon: FolderGit2, action: () => navigate('/repositories') },
    { title: 'View Agent Workflows', category: 'Navigation', icon: Cpu, action: () => navigate('/agent-runs') },
    { title: 'Code Review & Diff Viewer', category: 'Navigation', icon: FileCode2, action: () => navigate('/code-review') },
    { title: 'Pull Requests List', category: 'Navigation', icon: GitPullRequest, action: () => navigate('/pull-requests') },
    { title: 'Activity Audit Trail', category: 'Navigation', icon: History, action: () => navigate('/activity') },
    { title: 'System Analytics', category: 'Navigation', icon: BarChart3, action: () => navigate('/analytics') },
    { title: 'Platform Settings & AI Providers', category: 'Navigation', icon: Settings, action: () => navigate('/settings') },
    { title: 'Toggle Dark / Light Theme', category: 'Preferences', icon: Moon, action: () => toggleTheme() },
  ];

  const filteredCommands = query
    ? commands.filter(c => c.title.toLowerCase().includes(query.toLowerCase()) || c.category.toLowerCase().includes(query.toLowerCase()))
    : commands;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        isOpen ? onClose() : null;
      }
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#111827] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 gap-3">
          <Search className="w-5 h-5 text-indigo-500" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          <kbd className="px-2 py-0.5 text-[10px] rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching commands found
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.title}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition
                    ${isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                    <span>{cmd.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      {cmd.category}
                    </span>
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
