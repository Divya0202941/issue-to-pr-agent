from datetime import datetime
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.agents.base_agent import BaseAgent
from app.db.models import AgentRun, GeneratedPatch
from app.services.ai_service import ai_service

class FixGeneratorAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_name="fix_generator",
            display_name="Fix Generator",
            description="Generates minimal targeted implementation patch adhering to repository conventions."
        )

    async def run(self, agent_run: AgentRun, db: Session, context: Dict[str, Any]) -> Dict[str, Any]:
        issue_analysis = context.get("issue_analysis", {})
        code_location = context.get("code_location", {})
        reviewer_feedback = context.get("reviewer_feedback")
        
        attempt_str = f" (Correction Attempt #{agent_run.correction_attempt})" if agent_run.correction_attempt > 0 else ""
        self.log(db, agent_run.id, f"Generating code fix{attempt_str}...")
        
        system_prompt = (
            "You are the Fix Generator AI Agent. Generate a minimal, robust patch resolving the issue. "
            "Never introduce hardcoded secrets or unrelated changes. Generate unified diff format."
        )
        user_prompt = (
            f"Generate a patch based on:\n"
            f"Issue summary: {issue_analysis.get('summary')}\n"
            f"Acceptance criteria: {issue_analysis.get('acceptance_criteria')}\n"
            f"Target files: {code_location.get('relevant_files')}\n"
        )
        if reviewer_feedback:
            user_prompt += (
                f"\nIMPORTANT - PREVIOUS REVIEWER FEEDBACK TO FIX:\n"
                f"Findings: {reviewer_feedback.get('findings')}\n"
                f"Actionable feedback: {reviewer_feedback.get('actionable_feedback')}\n"
            )
            
        fix_result = await ai_service._call_llm_json(system_prompt, user_prompt)
        
        patch_content = fix_result.get("patch_content", "")
        change_summary = fix_result.get("change_summary", "")
        explanation = fix_result.get("explanation", "")
        files_changed = fix_result.get("files_changed", [])
        
        # Save or update GeneratedPatch record
        existing_patch = db.query(GeneratedPatch).filter(GeneratedPatch.agent_run_id == agent_run.id).first()
        if existing_patch:
            existing_patch.patch_content = patch_content
            existing_patch.change_summary = change_summary
            existing_patch.explanation = explanation
            existing_patch.files_changed = files_changed
            existing_patch.is_approved = False  # Reset approval for new patch
            existing_patch.approved_at = None
        else:
            new_patch = GeneratedPatch(
                agent_run_id=agent_run.id,
                patch_content=patch_content,
                change_summary=change_summary,
                explanation=explanation,
                files_changed=files_changed,
                is_approved=False,
                created_at=datetime.utcnow()
            )
            db.add(new_patch)
            
        db.commit()
        
        total_add = sum(f.get("additions", 0) for f in files_changed)
        total_del = sum(f.get("deletions", 0) for f in files_changed)
        self.log(db, agent_run.id, f"Generated patch: {len(files_changed)} file(s) modified (+{total_add}/-{total_del})")
        self.log(db, agent_run.id, f"Summary: {change_summary}")
        
        return fix_result

fix_generator_agent = FixGeneratorAgent()
