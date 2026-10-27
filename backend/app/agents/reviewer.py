from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.agents.base_agent import BaseAgent
from app.db.models import AgentRun, ReviewFinding
from app.services.ai_service import ai_service

class ReviewerAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_name="reviewer",
            display_name="Reviewer",
            description="Evaluates patch diff and test results, detects security or regression risks, and controls self-correction loop."
        )

    async def run(self, agent_run: AgentRun, db: Session, context: Dict[str, Any]) -> Dict[str, Any]:
        issue_analysis = context.get("issue_analysis", {})
        fix_result = context.get("fix_result", {})
        test_result = context.get("test_result", {})
        patch_content = fix_result.get("patch_content", "")
        
        self.log(db, agent_run.id, f"Evaluating patch diff and test execution results...")
        
        system_prompt = (
            "You are the Reviewer AI Agent. Thoroughly evaluate the proposed code patch and test results. "
            "Inspect for: 1. Correctness against issue requirements, 2. Regression risks, 3. Unsafe patterns/secrets, "
            "4. Edge cases (such as whitespace inputs). If issues remain, recommend changes and require correction."
        )
        user_prompt = (
            f"Review the patch:\n"
            f"Diff:\n{patch_content}\n"
            f"Test summary: {test_result.get('passed_count')} passed, {test_result.get('failed_count')} failed, exit code: {test_result.get('exit_code')}\n"
            f"Issue requirements: {issue_analysis.get('requirements')}\n"
        )
        
        review_output = await ai_service._call_llm_json(system_prompt, user_prompt)
        
        verdict = review_output.get("verdict", "approved")
        requires_correction = review_output.get("requires_correction", False)
        
        # If test execution had failures, enforce changes requested
        if test_result.get("failed_count", 0) > 0 or test_result.get("exit_code", 0) != 0:
            verdict = "changes_requested"
            requires_correction = True
            
        # Record review findings in database
        findings = review_output.get("findings", [])
        for f in findings:
            rf = ReviewFinding(
                agent_run_id=agent_run.id,
                category=f.get("category", "correctness"),
                severity=f.get("severity", "warning"),
                title=f.get("title", "Review Finding"),
                description=f.get("description", ""),
                file_path=f.get("file_path"),
                line_number=f.get("line_number"),
                resolution_status=f.get("resolution_status", "open")
            )
            db.add(rf)
            
        # Update run confidence
        confidence = float(review_output.get("confidence_score", 0.9))
        agent_run.confidence_score = confidence
        agent_run.confidence_reason = review_output.get("confidence_explanation", "")
        db.commit()
        
        self.log(db, agent_run.id, f"Review verdict: {verdict.upper()} (Confidence: {int(confidence * 100)}%)")
        self.log(db, agent_run.id, f"Reviewer summary: {review_output.get('summary')}")
        
        if requires_correction:
            self.log(
                db,
                agent_run.id,
                f"Self-correction required. Feedback: {review_output.get('actionable_feedback', 'Fix identified issues.')}",
                level="WARN"
            )
            
        return review_output

reviewer_agent = ReviewerAgent()
