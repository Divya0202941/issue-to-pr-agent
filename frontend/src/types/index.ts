export type AgentName = 
  | 'issue_analyzer'
  | 'code_locator'
  | 'fix_generator'
  | 'test_agent'
  | 'reviewer'
  | 'pr_agent';

export type WorkflowStatus =
  | 'draft'
  | 'validating_issue'
  | 'analyzing_issue'
  | 'locating_code'
  | 'planning_changes'
  | 'generating_patch'
  | 'awaiting_patch_approval'
  | 'applying_changes'
  | 'generating_tests'
  | 'running_tests'
  | 'reviewing_changes'
  | 'correction_required'
  | 're_running_tests'
  | 'awaiting_pr_approval'
  | 'creating_branch'
  | 'creating_commit'
  | 'creating_pull_request'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface RepositoryConfig {
  id: string;
  repository_id: string;
  base_branch: string;
  permitted_branches: string[];
  test_command: string;
  build_command?: string;
  lint_command?: string;
  max_retries: number;
  require_patch_approval: boolean;
  require_pr_approval: boolean;
  timeout_seconds: number;
  allowed_paths: string[];
  excluded_paths: string[];
  updated_at: string;
}

export interface Repository {
  id: string;
  owner: string;
  name: string;
  full_name: string;
  is_private: boolean;
  default_branch: string;
  description?: string;
  language?: string;
  open_issues_count: number;
  forks_count: number;
  stars_count: number;
  html_url?: string;
  is_demo: boolean;
  created_at: string;
  configuration?: RepositoryConfig;
  agent_runs_count: number;
  pull_requests_count: number;
}

export interface Issue {
  id: string;
  repository_id: string;
  issue_number: number;
  title: string;
  body?: string;
  author?: string;
  state: string;
  labels: string[];
  html_url?: string;
  is_demo: boolean;
  created_at: string;
}

export interface ChangedFile {
  file_path: string;
  additions: number;
  deletions: number;
  status: string;
  old_content?: string;
  new_content?: string;
  diff?: string;
}

export interface GeneratedPatch {
  id: string;
  agent_run_id: string;
  patch_content: string;
  change_summary?: string;
  explanation?: string;
  files_changed: ChangedFile[];
  is_approved: boolean;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface TestExecution {
  id: string;
  agent_run_id: string;
  test_command: string;
  exit_code: number;
  stdout: string;
  stderr: string;
  passed_count: number;
  failed_count: number;
  skipped_count: number;
  duration_seconds: number;
  sandbox_type: string;
  execution_timestamp: string;
}

export interface ReviewFinding {
  id: string;
  agent_run_id: string;
  category: 'correctness' | 'security' | 'regression' | 'style' | 'maintainability';
  severity: 'critical' | 'warning' | 'suggestion';
  title: string;
  description: string;
  file_path?: string;
  line_number?: number;
  resolution_status: string;
}

export interface PullRequest {
  id: string;
  agent_run_id: string;
  repository_id: string;
  pr_number?: number;
  title: string;
  description?: string;
  html_url?: string;
  head_branch: string;
  base_branch: string;
  state: string;
  checks_passing: boolean;
  is_approved: boolean;
  approved_at?: string;
  is_demo: boolean;
  created_at: string;
}

export interface AgentExecution {
  id: string;
  agent_name: AgentName;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  started_at?: string;
  finished_at?: string;
  duration_seconds: number;
  output_data: Record<string, any>;
  error_message?: string;
}

export interface AgentExecutionLog {
  id: string;
  agent_name: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  timestamp: string;
}

export interface AgentRunSummary {
  id: string;
  repository_id: string;
  repository_name: string;
  issue_id: string;
  issue_number: number;
  issue_title: string;
  status: WorkflowStatus;
  current_agent: AgentName;
  branch_name: string;
  base_branch: string;
  correction_attempt: number;
  max_correction_attempts: number;
  confidence_score: number;
  confidence_reason?: string;
  is_demo: boolean;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface AgentRunDetail extends AgentRunSummary {
  executions: AgentExecution[];
  logs: AgentExecutionLog[];
  patch?: GeneratedPatch;
  test_executions: TestExecution[];
  review_findings: ReviewFinding[];
  pull_request?: PullRequest;
  issue?: Issue;
  repository?: Repository;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditEventItem {
  id: string;
  actor: string;
  event_type: string;
  repository_name?: string;
  workflow_id?: string;
  details: Record<string, any>;
  result: 'success' | 'failure' | 'warning';
  timestamp: string;
}

export interface AnalyticsData {
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  active_runs: number;
  prs_created: number;
  issues_processed: number;
  test_pass_rate: number;
  avg_duration_seconds: number;
  weekly_activity: { day: string; runs: number; prs: number }[];
  runs_by_status: { status: string; count: number }[];
  agent_durations: { agent: string; avg_duration: number }[];
  failure_categories: { category: string; count: number }[];
}
