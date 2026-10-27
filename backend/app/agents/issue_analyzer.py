from typing import Dict, Any
from sqlalchemy.orm import Session
from app.agents.base_agent import BaseAgent
from app.db.models import AgentRun
from app.services.ai_service import ai_service

class IssueAnalyzerAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_name="issue_analyzer",
            display_name="Issue Analyzer",
            description="Analyzes GitHub issue, extracts acceptance criteria, classifies problem, and drafts implementation plan."
        )

    async def run(self, agent_run: AgentRun, db: Session, context: Dict[str, Any]) -> Dict[str, Any]:
        issue = agent_run.issue
        repo = agent_run.repository
        
        self.log(db, agent_run.id, f"Parsing issue #{issue.issue_number}: '{issue.title}'")
        self.log(db, agent_run.id, f"Target repository: {repo.full_name} (base: {agent_run.base_branch})")
        
        system_prompt = (
            "You are the Issue Analyzer AI Agent. Understand the GitHub issue, extract clear acceptance criteria, "
            "identify affected components, estimate complexity, and produce a structured implementation plan."
        )
        user_prompt = (
            f"Analyze the following GitHub issue for repository {repo.full_name}:\n"
            f"Title: {issue.title}\n"
            f"Description:\n{issue.body or 'No description provided'}\n"
            f"Labels: {', '.join(issue.labels or [])}\n"
        )
        
        analysis = await ai_service._call_llm_json(system_prompt, user_prompt)
        
        # Update confidence on AgentRun
        confidence = float(analysis.get("confidence_score", 0.9))
        agent_run.confidence_score = confidence
        agent_run.confidence_reason = analysis.get("confidence_reason", "Requirements and acceptance criteria clearly specified.")
        db.commit()
        
        self.log(db, agent_run.id, f"Issue analysis complete. Confidence: {int(confidence * 100)}%")
        self.log(db, agent_run.id, f"Acceptance criteria: {len(analysis.get('acceptance_criteria', []))} items identified.")
        
        return analysis

issue_analyzer_agent = IssueAnalyzerAgent()
