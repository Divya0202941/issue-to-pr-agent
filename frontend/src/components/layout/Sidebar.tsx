import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderGit2,
  FileCode2,
  Cpu,
  GitPullRequest,
  CheckSquare,
  History,
  BarChart3,
  Settings,
  HelpCircle,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { api } from '../../services/api';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const [githubUser, setGithubUser] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    api.getCurrentUser()
      .then(user => {
        if (isMounted && user?.github_connection?.is_connected) {
          setGithubUser(user.github_connection.github_username || 'connected');
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Repositories', path: '/repositories', icon: FolderGit2 },
    { label: 'Issue Intake', path: '/issues', icon: PlusCircle, highlight: true },
    { label: 'Agent Runs', path: '/agent-runs', icon: Cpu },
    { label: 'Code Review', path: '/code-review', icon: FileCode2 },
    { label: 'Pull Requests', path: '/pull-requests', icon: GitPullRequest },
    { label: 'Activity Logs', path: '/activity', icon: History },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out border-r
        bg-white dark:bg-[#0E1524] border-slate-200 dark:border-slate-800/80 flex flex-col justify-between
        ${collapsed ? 'w-20' : 'w-64'}`}
    >
      {/* Top Branding */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800/80">
          <NavLink to="/" className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20 flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white leading-tight">
                  Issue to PR
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                  Autonomous Agent
                </span>
              </div>
            )}
          </NavLink>

          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Dynamic Mode Badge */}
        {!collapsed && (
          githubUser ? (
            <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <div className="text-[11px] leading-tight">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                  GitHub Connected
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[10px] truncate max-w-[150px] block">
                  @{githubUser}
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <div className="text-[11px] leading-tight">
                <span className="font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                  Demo Mode Active
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[10px]">
                  Safe sandboxed execution
                </span>
              </div>
            </div>
          )
        )}

        {/* Navigation Items */}
        <nav className="mt-4 px-3 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative
                  ${isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                  }
                  ${item.highlight && !isActive ? 'text-indigo-500 dark:text-indigo-400' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-105
                    ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}
                />
                {!collapsed && <span>{item.label}</span>}
                {item.highlight && !collapsed && (
                  <span className="ml-auto text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded-full font-bold">
                    NEW
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Documentation / Help */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800/80">
        <NavLink
          to="/onboarding"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition"
          title={collapsed ? 'Guided Setup' : undefined}
        >
          <HelpCircle className="w-4 h-4 flex-shrink-0 text-slate-400" />
          {!collapsed && <span>Guided Setup Wizard</span>}
        </NavLink>
      </div>
    </aside>
  );
};
