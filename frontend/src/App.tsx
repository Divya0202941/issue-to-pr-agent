import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { AppLayout } from './components/layout/AppLayout';

import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { RepositoriesPage } from './pages/RepositoriesPage';
import { RepositoryDetailPage } from './pages/RepositoryDetailPage';
import { IssueIntakePage } from './pages/IssueIntakePage';
import { AgentRunsPage } from './pages/AgentRunsPage';
import { LiveExecutionPage } from './pages/LiveExecutionPage';
import { CodeReviewPage } from './pages/CodeReviewPage';
import { PullRequestsPage } from './pages/PullRequestsPage';
import { ActivityLogsPage } from './pages/ActivityLogsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { OnboardingPage } from './pages/OnboardingPage';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Authenticated Application Shell */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/repositories" element={<RepositoriesPage />} />
              <Route path="/repositories/:id" element={<RepositoryDetailPage />} />
              <Route path="/issues" element={<IssueIntakePage />} />
              <Route path="/agent-runs" element={<AgentRunsPage />} />
              <Route path="/agent-runs/:id" element={<LiveExecutionPage />} />
              <Route path="/code-review" element={<CodeReviewPage />} />
              <Route path="/pull-requests" element={<PullRequestsPage />} />
              <Route path="/activity" element={<ActivityLogsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </ThemeProvider>
  );
};

export default App;
