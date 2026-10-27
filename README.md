# Issue to PR Agent

> **"From GitHub Issue to Pull Request, Automatically."**
>
> *An AI-powered engineering platform that transforms GitHub issues into tested, review-ready pull requests through a coordinated team of specialized AI agents.*

---

## 1. Product Vision & Architecture

**Issue to PR Agent** is a full-stack engineering automation platform that bridges the gap between issue reporting and code review. When supplied with a GitHub issue URL, the platform orchestrates six specialized AI agents that sequentially deconstruct requirements, locate relevant code files, generate minimal patches, synthesize targeted tests, execute tests in an isolated sandbox, perform safety audits, and publish review-ready Pull Requests.

### Core Architectural Guarantee: Human-in-the-Loop Governance
- **Never Auto-Merge**: A successful Pull Request creation does **not** automatically merge code.
- **Human Approval Gates**: The system enforces mandatory user authorization before patches are applied and before Pull Requests are opened on GitHub.
- **Bounded Self-Correction**: When tests fail or the Reviewer Agent requests changes, the system attempts automated corrections up to a configurable ceiling (default: 3 attempts) to prevent infinite loops.

```
GitHub Issue URL
       │
       ▼
[1. Issue Analyzer] ──► Extracts acceptance criteria, constraints & complexity
       │
       ▼
[2. Code Locator]   ──► AST & semantic mapping of relevant source files
       │
       ▼
[3. Fix Generator]  ──► Minimal targeted unified diff patch
       │
       ▼
   [APPROVAL GATE: Human reviews proposed patch]
       │
       ▼
[4. Test Agent]     ──► Synthesizes regression tests & runs in isolated sandbox
       │
       ▼
[5. Reviewer Agent] ──► Inspects diff & test output.
       │                (Triggers Bounded Correction Loop back to Fix Generator if needed)
       ▼
   [APPROVAL GATE: Human reviews test results & final diff]
       │
       ▼
[6. PR Agent]       ──► Creates branch, commits changes & publishes GitHub Pull Request
       │
       ▼
Human Code Review & Merge on GitHub
```

---

## 2. The Six Specialized AI Agents

Each agent has dedicated responsibilities, structured JSON schemas, execution logs, and measurable status:

| Agent | Name | Responsibility | Output |
|---|---|---|---|
| **01** | **Issue Analyzer** | Deconstructs issue text, extracts requirements and acceptance criteria, estimates complexity, calculates confidence. | Issue summary, acceptance criteria, implementation plan, confidence score. |
| **02** | **Code Locator** | Scans repository tree, respects `.gitignore`, maps relevant symbols, files, and dependencies with relevance scores. | List of affected files, relevance scores, symbol references, rationale. |
| **03** | **Fix Generator** | Generates minimal, targeted patch in unified diff format adhering to repo conventions without touching unrelated files. | Unified diff patch, change summary, list of changed files (+/- lines). |
| **04** | **Test Agent** | Synthesizes targeted regression tests and executes permitted test commands in an isolated sandbox with strict timeouts. | Passed/failed/skipped test counts, stdout/stderr, execution duration, sandbox type. |
| **05** | **Reviewer** | Evaluates diff against requirements, checks for regressions, unsafe patterns, hardcoded secrets; controls bounded self-correction loop. | Verdict (`approved` / `changes_requested`), review findings, actionable feedback. |
| **06** | **PR Agent** | Validates git branch, commits verified patch, generates descriptive Markdown body referencing the issue, opens Pull Request. | PR title, description, branch name, GitHub PR URL. |

---

## 3. Technology Stack

### Frontend
- **Framework**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS with custom design tokens for professional dark charcoal (`#0B0F17`) and crisp light themes
- **Theme System**: Complete Dark / Light / System theme engine with zero-flash persistence in localStorage
- **State & Routing**: React Router v6, custom SSE EventSource hooks
- **Visuals & Charts**: Recharts (Weekly trends, agent duration comparison, status distribution)
- **Icons**: Lucide Icons
- **Diff & Code Inspection**: Custom Side-by-Side and Unified Diff Viewer with line additions/deletions and patch download

### Backend
- **API Framework**: Python, FastAPI, Pydantic v2
- **Database**: SQLite with SQLAlchemy (aiosqlite async + synchronous engine)
- **Real-Time Streaming**: Server-Sent Events (SSE via `sse-starlette`)
- **Integrations**: GitHub REST API client via `httpx`
- **AI Providers**: Configurable multi-provider abstraction:
  - **Offline Contextual Engine** (Default / Zero-Cost Demo Mode)
  - **OpenAI** (`gpt-4o`, `gpt-4-turbo`)
  - **Anthropic** (`claude-3-5-sonnet-20241022`)
  - **Google Gemini** (`gemini-1.5-pro`)
- **Execution Sandbox**: Subprocess sandbox executor with memory limits, execution timeout enforcement (60s kill limit), and automatic secret/token redaction
- **Automated Testing**: `pytest` and `pytest-asyncio`

---

## 4. Project Directory Structure

```
issue-to-pr-agent/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI entrypoint, lifespan seeding, CORS
│   │   ├── api/v1/
│   │   │   ├── api.py                  # API v1 router
│   │   │   └── endpoints/              # REST & SSE endpoints
│   │   │       ├── auth.py             # User profile & GitHub token connection
│   │   │       ├── repositories.py     # Repository listing & configuration
│   │   │       ├── issues.py           # Issue URL validation & metadata extraction
│   │   │       ├── agent_runs.py       # Workflow execution, approval gates, SSE stream
│   │   │       ├── code_review.py      # Diff inspection & review findings
│   │   │       ├── pull_requests.py    # Pull request listing & management
│   │   │       ├── activity.py         # Audit trail & activity history
│   │   │       ├── analytics.py        # System KPIs & latency distributions
│   │   │       ├── settings.py         # Preferences & AI provider configuration
│   │   │       └── notifications.py    # In-app notifications
│   │   ├── core/
│   │   │   ├── config.py               # Pydantic Settings
│   │   │   └── security.py             # Issue URL validator, token masking, command checks
│   │   ├── db/
│   │   │   ├── session.py              # Async & sync SQLAlchemy session engines
│   │   │   ├── models.py               # Database schemas (15 entities)
│   │   │   ├── init_db.py              # DDL table creation script
│   │   │   └── seed_data.py            # Demo repository, issues, and workflow seed
│   │   ├── schemas/                    # Pydantic request/response validation schemas
│   │   ├── services/
│   │   │   ├── github_service.py       # GitHub REST client
│   │   │   ├── sandbox_service.py      # Isolated test executor & secret scrubber
│   │   │   ├── ai_service.py           # Multi-provider LLM abstraction
│   │   │   ├── audit_service.py        # Audit trail persistence
│   │   │   └── notification_service.py # In-app notification dispatcher
│   │   └── agents/                     # The 6 specialized AI agents
│   │       ├── base_agent.py           # Abstract agent class with execution tracking
│   │       ├── issue_analyzer.py       # Agent 1
│   │       ├── code_locator.py         # Agent 2
│   │       ├── fix_generator.py        # Agent 3
│   │       ├── test_agent.py           # Agent 4
│   │       ├── reviewer.py             # Agent 5
│   │       ├── pr_agent.py             # Agent 6
│   │       └── orchestrator.py         # Workflow state machine & SSE broadcaster
│   ├── tests/
│   │   └── test_backend.py             # Automated unit & integration tests
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   ├── ThemeContext.tsx        # Dark/Light/System theme engine
│   │   │   └── NotificationContext.tsx # Live notifications provider
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx       # Main authenticated shell
│   │   │   │   ├── Sidebar.tsx         # Collapsible sidebar navigation
│   │   │   │   ├── Header.tsx          # Top bar with search, theme & notifications
│   │   │   │   └── CommandPalette.tsx  # Global Ctrl+K command palette
│   │   │   └── workflow/
│   │   │       ├── AgentPipelineGraph.tsx # Live 6-agent visual DAG
│   │   │       ├── TerminalLogViewer.tsx  # Monospace streaming log viewer
│   │   │       ├── DiffViewer.tsx         # Unified and split diff viewer
│   │   │       └── ApprovalModal.tsx      # Human approval gate dialog
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx         # Public marketing & feature overview
│   │   │   ├── DashboardPage.tsx       # Main operations KPI dashboard
│   │   │   ├── RepositoriesPage.tsx    # Repository management & connect modal
│   │   │   ├── RepositoryDetailPage.tsx# Repository settings & branch policies
│   │   │   ├── IssueIntakePage.tsx     # Issue intake, URL validation & kick-off
│   │   │   ├── AgentRunsPage.tsx       # Workflow runs table with filters
│   │   │   ├── LiveExecutionPage.tsx   # Live execution monitor with SSE & approval gates
│   │   │   ├── CodeReviewPage.tsx      # Detailed code review & test results
│   │   │   ├── PullRequestsPage.tsx    # Pull request listing & GitHub links
│   │   │   ├── ActivityLogsPage.tsx    # Audit trail
│   │   │   ├── AnalyticsPage.tsx       # Recharts telemetry analytics
│   │   │   ├── SettingsPage.tsx        # Appearance, tokens, AI providers
│   │   │   └── OnboardingPage.tsx      # 6-step guided setup wizard
│   │   ├── services/
│   │   │   └── api.ts                  # REST API client
│   │   └── types/
│   │       └── index.ts                # TypeScript domain models
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── index.html
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 5. Quickstart & Local Execution

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 1. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run automated tests
python -m pytest -v tests/test_backend.py

# Start the FastAPI server (auto-initializes and seeds SQLite database)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend API is now live at `http://localhost:8000`.
Interactive OpenAPI documentation is available at `http://localhost:8000/docs`.

### 2. Frontend Setup
In a new terminal window:
```bash
cd frontend

# Install frontend dependencies
npm install

# Start the Vite development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 6. Demo Mode Scenario Guide

To test the application immediately without providing external GitHub tokens or paid AI API keys, use the guided demo scenario:

1. Open `http://localhost:5173/issues`.
2. Click **"Load This Scenario"** or enter the pre-seeded URL:
   `https://github.com/acme-corp/auth-service/issues/101`
   - *Title*: "Fix incorrect validation for empty user input"
   - *Problem*: `validate_user()` accepts empty and whitespace-only username inputs.
3. Click **"Start Autonomous Workflow"**.
4. The system will open the **Live Execution Monitor**:
   - **Step 1: Issue Analyzer** extracts acceptance criteria (`Reject empty string`, `Reject whitespace`).
   - **Step 2: Code Locator** discovers `app/validator.py` and `tests/test_validator.py`.
   - **Step 3: Fix Generator** synthesizes the minimal patch.
   - **Gate 1: Human Approval Gate**: The pipeline pauses. Review the unified diff and click **"Review & Authorize Patch"**.
   - **Step 4: Test Agent** executes pytest in an isolated sandbox.
   - **Step 5: Reviewer Agent** audits the diff and triggers a **Bounded Correction Loop** to verify whitespace edge cases.
   - **Gate 2: PR Approval Gate**: All tests pass. Click **"Authorize Pull Request"**.
   - **Step 6: PR Agent** creates branch `fix/validate-empty-username-input` and publishes Pull Request `#104`.
5. You can inspect the real diff, sandbox logs, and test counts in the tabbed inspection panel.

---

## 7. Security Architecture & Sandbox Controls

- **Isolated Process Execution**: All test commands execute in isolated subprocesses using non-root privileges with CPU, memory, and timeout bounds (default: 60s).
- **Secret Redaction**: Any output containing patterns matching GitHub tokens (`ghp_*`), OpenAI keys (`sk-*`), or Google API keys (`AIza*`) is automatically replaced with `[REDACTED_SECRET]`.
- **Command Whitelist Validation**: Commands containing dangerous shell constructs (e.g. `rm -rf /`, `curl | sh`, `sudo`) are rejected before execution.
- **SSRF Prevention**: All issue URLs are strictly validated to belong to `github.com` with valid `owner/repo/issues/{number}` structure.

---

## 8. Automated Testing

To run the automated backend test suite covering security validation, token masking, sandbox output parsing, API endpoints, and orchestrator lifecycle:
```bash
cd backend
python -m pytest -v tests/test_backend.py
```
**Results**: 13/13 tests pass with 100% success.

---

## 9. License & Governance
Issue to PR Agent is built for engineering teams. Under all operational modes, human engineers retain full governance over Pull Request review, CI/CD checks, and branch merging.
