import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  ExternalLink,
  ChevronDown,
  User,
  ShieldCheck
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';

interface HeaderProps {
  onOpenCommandPalette: () => void;
  collapsed: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCommandPalette, collapsed }) => {
  const { theme, setTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setShowThemeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format breadcrumb path
  const pathParts = location.pathname.split('/').filter(Boolean);
  const breadcrumb = pathParts.length > 0 
    ? pathParts.map(p => p.charAt(0).toUpperCase() + p.slice(1).replace('-', ' ')).join(' / ')
    : 'Overview';

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-16 transition-all duration-300 ease-in-out border-b
        bg-white/80 dark:bg-[#0B0F17]/80 backdrop-blur-md border-slate-200 dark:border-slate-800/80 flex items-center justify-between px-6
        ${collapsed ? 'left-20' : 'left-64'}`}
    >
      {/* Left Breadcrumb */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-tight">
          {breadcrumb}
        </span>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Engine Online
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Command Palette Button */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 transition"
          title="Search or jump to (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Quick search...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono">
            Ctrl K
          </kbd>
        </button>

        {/* Theme Switcher Dropdown */}
        <div className="relative" ref={themeRef}>
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Switch theme"
            aria-label="Toggle theme menu"
          >
            {theme === 'dark' ? (
              <Moon className="w-4 h-4 text-indigo-400" />
            ) : theme === 'light' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Laptop className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showThemeMenu && (
            <div className="absolute right-0 mt-2 w-36 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 py-1 z-50 text-xs font-medium">
              <button
                onClick={() => { setTheme('light'); setShowThemeMenu(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left
                  ${theme === 'light' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" /> Light
              </button>
              <button
                onClick={() => { setTheme('dark'); setShowThemeMenu(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left
                  ${theme === 'dark' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" /> Dark
              </button>
              <button
                onClick={() => { setTheme('system'); setShowThemeMenu(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left
                  ${theme === 'system' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}
              >
                <Laptop className="w-3.5 h-3.5 text-slate-400" /> System
              </button>
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition relative"
            title="Notifications"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900 animate-pulse"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#111827] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">No notifications yet</div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer flex gap-3
                        ${!n.is_read ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        {n.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                        {n.type === 'error' && <XCircle className="w-4 h-4 text-rose-500" />}
                        {n.type === 'info' && <Info className="w-4 h-4 text-indigo-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{n.title}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{n.message}</p>
                        {n.link && (
                          <Link
                            to={n.link}
                            onClick={() => setShowNotifications(false)}
                            className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline mt-1 font-medium"
                          >
                            View workflow <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <Link
          to="/settings"
          className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            AM
          </div>
          <span className="hidden lg:inline text-xs font-semibold">alex_dev</span>
        </Link>
      </div>
    </header>
  );
};
