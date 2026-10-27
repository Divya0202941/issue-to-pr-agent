import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sun,
  Moon,
  Laptop,
  CheckCircle,
  AlertTriangle,
  Lock,
  Cpu,
  Key,
  Save,
  Check,
  RefreshCw,
  FolderGit2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [settingsData, setSettingsData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [provider, setProvider] = useState('mock');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ status: string; message: string } | null>(null);

  // Prefs
  const [notifyComplete, setNotifyComplete] = useState(true);
  const [notifyFailure, setNotifyFailure] = useState(true);
  const [notifyApproval, setNotifyApproval] = useState(true);
  const [maxRetries, setMaxRetries] = useState(3);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // GitHub token state
  const [ghToken, setGhToken] = useState('');
  const [ghUsername, setGhUsername] = useState('alexmercer-dev');
  const [connectingGh, setConnectingGh] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const data = await api.getSettings();
        setSettingsData(data);
        if (data.preferences) {
          setNotifyComplete(data.preferences.notify_on_complete ?? true);
          setNotifyFailure(data.preferences.notify_on_failure ?? true);
          setNotifyApproval(data.preferences.notify_on_approval ?? true);
          setProvider(data.preferences.ai_provider || 'mock');
          setMaxRetries(data.preferences.default_max_retries || 3);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPrefs(true);
      await api.updatePreferences({
        theme,
        notify_on_complete: notifyComplete,
        notify_on_failure: notifyFailure,
        notify_on_approval: notifyApproval,
        ai_provider: provider,
        default_max_retries: Number(maxRetries)
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to save preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleTestAIProvider = async () => {
    try {
      setTestingConnection(true);
      setTestResult(null);
      const res = await api.testAIProvider({ provider, api_key: apiKey, model });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ status: 'error', message: err.message || 'Connection test failed' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveAIProvider = async () => {
    try {
      await api.updateAIProvider({ provider, api_key: apiKey, model });
      alert('AI Provider configuration saved.');
    } catch (err: any) {
      alert(err.message || 'Failed to update AI provider');
    }
  };

  const handleConnectGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setConnectingGh(true);
      await api.connectGitHub(ghToken, ghUsername);
      alert('GitHub connection updated.');
    } catch (err: any) {
      alert(err.message || 'Failed to connect GitHub');
    } finally {
      setConnectingGh(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-500" />
          Platform Settings & Configurations
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Manage visual appearance, GitHub access tokens, AI models, and agent execution policies
        </p>
      </div>

      {/* 1. Theme and Appearance */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Appearance & Theme</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Select your visual appearance preference. Dark charcoal, clean light mode, or system default.
        </p>

        <div className="grid grid-cols-3 gap-3 max-w-md">
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition
              ${theme === 'dark'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25'
                : 'bg-slate-50 dark:bg-[#0B0F17] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'}`}
          >
            <Moon className="w-4 h-4" /> Dark
          </button>

          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition
              ${theme === 'light'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25'
                : 'bg-slate-50 dark:bg-[#0B0F17] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'}`}
          >
            <Sun className="w-4 h-4" /> Light
          </button>

          <button
            type="button"
            onClick={() => setTheme('system')}
            className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition
              ${theme === 'system'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25'
                : 'bg-slate-50 dark:bg-[#0B0F17] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'}`}
          >
            <Laptop className="w-4 h-4" /> System
          </button>
        </div>
      </div>

      {/* 2. GitHub Integration */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-indigo-500" />
            GitHub Integration & Token
          </h3>
          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            Connected (Demo Authorized)
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Provide a GitHub Personal Access Token (classic or fine-grained with <code className="text-indigo-400">repo</code> scope) for live branch, issue, and Pull Request creation. Leave blank to stay in safe Demo Mode.
        </p>

        <form onSubmit={handleConnectGitHub} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              GitHub Username:
            </label>
            <input
              type="text"
              value={ghUsername}
              onChange={e => setGhUsername(e.target.value)}
              className="w-full rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              GitHub Personal Access Token:
            </label>
            <input
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={ghToken}
              onChange={e => setGhToken(e.target.value)}
              className="w-full rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Tokens are encrypted server-side and never exposed to the frontend.
            </span>
          </div>

          <button
            type="submit"
            disabled={connectingGh}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white border border-slate-700 transition"
          >
            {connectingGh ? 'Saving...' : 'Update GitHub Token'}
          </button>
        </form>
      </div>

      {/* 3. AI Model Provider */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-500" />
          AI Model Provider
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Configure model intelligence. By default, the platform uses an intelligent deterministic offline mock engine so you can explore zero-cost demo workflows without API keys.
        </p>

        <div className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Active Provider:
            </label>
            <select
              value={provider}
              onChange={e => setProvider(e.target.value)}
              className="w-full rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="mock">Offline Contextual Engine (Zero Keys Needed / Demo)</option>
              <option value="openai">OpenAI (GPT-4o, GPT-4-turbo)</option>
              <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
              <option value="gemini">Google Gemini (Gemini 1.5 Pro)</option>
            </select>
          </div>

          {provider !== 'mock' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                API Key for {provider.toUpperCase()}:
              </label>
              <input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="w-full rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              disabled={testingConnection}
              onClick={handleTestAIProvider}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
              Test Connection
            </button>

            <button
              type="button"
              onClick={handleSaveAIProvider}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition"
            >
              Save AI Provider
            </button>
          </div>

          {testResult && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              testResult.status === 'success'
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
            }`}>
              {testResult.status === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Agent Governance & Notification Policies */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Agent Governance & Notifications
        </h3>

        <form onSubmit={handleSavePreferences} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Default Maximum Correction Attempts:
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={maxRetries}
              onChange={e => setMaxRetries(Number(e.target.value))}
              className="w-full rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={notifyApproval}
                onChange={e => setNotifyApproval(e.target.checked)}
                className="rounded text-indigo-600"
              />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Notify when human approval is required for patch or PR
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={notifyComplete}
                onChange={e => setNotifyComplete(e.target.checked)}
                className="rounded text-indigo-600"
              />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Notify when Pull Request is published and ready for review
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={notifyFailure}
                onChange={e => setNotifyFailure(e.target.checked)}
                className="rounded text-indigo-600"
              />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Notify when max correction attempts are exceeded
              </span>
            </label>
          </div>

          <div className="pt-3 flex items-center justify-between">
            {savedSuccess ? (
              <span className="text-emerald-500 font-semibold text-xs flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Preferences saved!
              </span>
            ) : <span></span>}

            <button
              type="submit"
              disabled={savingPrefs}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {savingPrefs ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
