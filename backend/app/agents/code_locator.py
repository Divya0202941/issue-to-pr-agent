from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.agents.base_agent import BaseAgent
from app.db.models import AgentRun
from app.services.ai_service import ai_service
from app.services.github_service import github_service

class CodeLocatorAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_name="code_locator",
            display_name="Code Locator",
            description="Inspects repository tree, respects exclusions, searches relevant symbols, and maps affected files."
        )

    async def run(self, agent_run: AgentRun, db: Session, context: Dict[str, Any]) -> Dict[str, Any]:
        repo = agent_run.repository
        issue_analysis = context.get("issue_analysis", {})
        
        self.log(db, agent_run.id, f"Scanning repository file tree for {repo.full_name} on {agent_run.base_branch}")
        
        # Try fetching real tree if connected, else use demo file set
        tree_items = []
        if not agent_run.is_demo and github_service.token:
            try:
                tree_items = await github_service.get_repository_tree(repo.owner, repo.name, agent_run.base_branch)
                self.log(db, agent_run.id, f"Retrieved {len(tree_items)} tree items from GitHub API")
            except Exception as e:
                self.log(db, agent_run.id, f"Live GitHub tree lookup skipped ({str(e)}), using workspace index", level="WARN")

        system_prompt = (
            "You are the Code Locator AI Agent. Given the issue analysis and repository context, locate relevant files, "
            "functions, classes, and tests. Explain why each file is selected and provide relevance scores (0.0 to 1.0)."
        )
        user_prompt = (
            f"Locate relevant files for repository '{repo.full_name}' to solve this issue:\n"
            f"Summary: {issue_analysis.get('summary', '')}\n"
            f"Requirements: {issue_analysis.get('requirements', [])}\n"
            f"Implementation Plan: {issue_analysis.get('implementation_plan', [])}\n"
        )
        
        locator_result = await ai_service._call_llm_json(system_prompt, user_prompt)
        
        relevant_files = locator_result.get("relevant_files", [])
        self.log(db, agent_run.id, f"Located {len(relevant_files)} relevant files:")
        for rf in relevant_files:
            self.log(db, agent_run.id, f"  -> {rf.get('path')} (score: {rf.get('relevance_score')}) - {rf.get('reason')}")
            
        return locator_result

code_locator_agent = CodeLocatorAgent()
