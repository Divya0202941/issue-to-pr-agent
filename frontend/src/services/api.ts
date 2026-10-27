import {
  Repository, Issue, AgentRunSummary, AgentRunDetail,
  PullRequest, NotificationItem, AuditEventItem, AnalyticsData
} from '../types';

export const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api/v1';

export const getEventSourceUrl = (runId: string) => `${API_BASE}/agent-runs/${runId}/events`;

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) errorDetail = errJson.detail;
    } catch (_) {}
    throw new Error(errorDetail);
  }
  return response.json();
}

export const api = {
  // Health
  getHealth: () => request<{ status: string; version: string }>('/health'),

  // Auth / User
  getCurrentUser: () => request<any>('/auth/me'),
  connectGitHub: (token: string, username?: string) =>
    request<{ status: string; username: string }>('/auth/connect-github', {
      method: 'POST',
      body: JSON.stringify({ token, username })
    }),
  disconnectGitHub: () => request<{ status: string }>('/auth/disconnect-github', { method: 'POST' }),

  // Repositories
  getRepositories: (search?: string, language?: string, isDemo?: boolean) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (language) params.append('language', language);
    if (isDemo !== undefined) params.append('is_demo', String(isDemo));
    return request<Repository[]>(`/repositories?${params.toString()}`);
  },
  getRepository: (id: string) => request<Repository>(`/repositories/${id}`),
  connectRepository: (fullName: string, baseBranch: string = 'main', isDemo: boolean = false) =>
    request<Repository>('/repositories', {
      method: 'POST',
      body: JSON.stringify({ full_name: fullName, base_branch: baseBranch, is_demo: isDemo })
    }),
  updateRepositoryConfig: (id: string, config: any) =>
    request<any>(`/repositories/${id}/configuration`, {
      method: 'PUT',
      body: JSON.stringify(config)
    }),

  // Issues
  validateIssueUrl: (issueUrl: string) =>
    request<{ is_valid: boolean; owner?: string; repo?: string; issue_number?: number; error?: string }>(
      '/issues/validate',
      { method: 'POST', body: JSON.stringify({ issue_url: issueUrl }) }
    ),
  fetchIssue: (issueUrl: string) =>
    request<Issue>('/issues/fetch', {
      method: 'POST',
      body: JSON.stringify({ issue_url: issueUrl })
    }),
  getIssues: (repositoryId?: string) => {
    const params = repositoryId ? `?repository_id=${repositoryId}` : '';
    return request<Issue[]>(`/issues${params}`);
  },

  // Agent Runs
  getAgentRuns: (repositoryId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (repositoryId) params.append('repository_id', repositoryId);
    if (status) params.append('status', status);
    return request<AgentRunSummary[]>(`/agent-runs?${params.toString()}`);
  },
  getAgentRun: (id: string) => request<AgentRunDetail>(`/agent-runs/${id}`),
  createAgentRun: (issueUrl: string, baseBranch?: string, aiProvider?: string) =>
    request<AgentRunSummary>('/agent-runs', {
      method: 'POST',
      body: JSON.stringify({
        issue_url: issueUrl,
        base_branch: baseBranch,
        ai_provider: aiProvider
      })
    }),
  approvePatch: (runId: string, approved: boolean, reason?: string) =>
    request<{ status: string }>(`/agent-runs/${runId}/approve-patch`, {
      method: 'POST',
      body: JSON.stringify({ approved, rejection_reason: reason })
    }),
  approvePR: (runId: string, approved: boolean) =>
    request<{ status: string }>(`/agent-runs/${runId}/approve-pr`, {
      method: 'POST',
      body: JSON.stringify({ approved })
    }),
  cancelRun: (runId: string) =>
    request<{ status: string }>(`/agent-runs/${runId}/cancel`, { method: 'POST' }),
  retryRun: (runId: string) =>
    request<{ status: string }>(`/agent-runs/${runId}/retry`, { method: 'POST' }),

  // Code Review
  getCodeReview: (runId: string) => request<any>(`/code-review/${runId}`),

  // Pull Requests
  getPullRequests: (repositoryId?: string, state?: string) => {
    const params = new URLSearchParams();
    if (repositoryId) params.append('repository_id', repositoryId);
    if (state) params.append('state', state);
    return request<PullRequest[]>(`/pull-requests?${params.toString()}`);
  },
  getPullRequest: (id: string) => request<PullRequest>(`/pull-requests/${id}`),

  // Activity & Audit
  getActivityLogs: (eventType?: string, actor?: string) => {
    const params = new URLSearchParams();
    if (eventType) params.append('event_type', eventType);
    if (actor) params.append('actor', actor);
    return request<AuditEventItem[]>(`/activity?${params.toString()}`);
  },

  // Analytics
  getAnalytics: () => request<AnalyticsData>('/analytics'),

  // Settings
  getSettings: () => request<any>('/settings'),
  updatePreferences: (pref: any) =>
    request<any>('/settings/preferences', { method: 'PUT', body: JSON.stringify(pref) }),
  updateAIProvider: (providerConfig: any) =>
    request<any>('/settings/ai-provider', { method: 'PUT', body: JSON.stringify(providerConfig) }),
  testAIProvider: (providerConfig: any) =>
    request<{ status: string; message: string }>('/settings/ai-provider/test', {
      method: 'POST',
      body: JSON.stringify(providerConfig)
    }),

  // Notifications
  getNotifications: () => request<NotificationItem[]>('/notifications'),
  markNotificationRead: (id: string) =>
    request<{ status: string }>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () =>
    request<{ status: string }>('/notifications/read-all', { method: 'PUT' }),
};
