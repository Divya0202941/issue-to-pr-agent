import os
import tempfile
from datetime import datetime
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.agents.base_agent import BaseAgent
from app.db.models import AgentRun, TestExecution
from app.services.ai_service import ai_service
from app.services.sandbox_service import sandbox_service

class TestAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_name="test_agent",
            display_name="Test Agent",
            description="Generates targeted tests, executes test suites in isolated sandbox, and parses results."
        )

    async def run(self, agent_run: AgentRun, db: Session, context: Dict[str, Any]) -> Dict[str, Any]:
        issue_analysis = context.get("issue_analysis", {})
        fix_result = context.get("fix_result", {})
        repo_config = agent_run.repository.configuration
        test_cmd = (repo_config.test_command if repo_config and repo_config.test_command else "pytest")

        self.log(db, agent_run.id, f"Generating targeted validation tests...")
        
        system_prompt = (
            "You are the Test Agent AI. Generate targeted unit and regression tests for the proposed patch. "
            "Use pytest conventions. Return python test code."
        )
        user_prompt = (
            f"Generate tests for:\n"
            f"Requirements: {issue_analysis.get('requirements')}\n"
            f"Acceptance criteria: {issue_analysis.get('acceptance_criteria')}\n"
            f"Modified files: {fix_result.get('files_changed')}\n"
        )
        
        test_gen_result = await ai_service._call_llm_json(system_prompt, user_prompt)
        test_code = test_gen_result.get("test_code", "")
        test_file_path = test_gen_result.get("test_file_path", "tests/test_validator.py")
        
        self.log(db, agent_run.id, f"Generated test file: {test_file_path}")
        self.log(db, agent_run.id, f"Preparing isolated execution sandbox for '{test_cmd}'...")
        
        # Prepare temporary directory for isolated sandbox run
        with tempfile.TemporaryDirectory() as temp_dir:
            # Write modified source files
            for file_info in fix_result.get("files_changed", []):
                file_rel = file_info.get("file_path", "app/validator.py")
                full_path = os.path.join(temp_dir, file_rel)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, "w", encoding="utf-8") as f:
                    f.write(file_info.get("new_content", ""))
                    
            # Ensure __init__.py exists in package folders
            for root, dirs, files in os.walk(temp_dir):
                if root != temp_dir:
                    init_file = os.path.join(root, "__init__.py")
                    if not os.path.exists(init_file):
                        with open(init_file, "w") as f:
                            pass
                            
            # Write generated test file
            full_test_path = os.path.join(temp_dir, test_file_path)
            os.makedirs(os.path.dirname(full_test_path), exist_ok=True)
            with open(full_test_path, "w", encoding="utf-8") as f:
                f.write(test_code)
                
            self.log(db, agent_run.id, f"Executing sandbox command: `{test_cmd}`")
            
            # Execute in sandbox
            sandbox_output = sandbox_service.execute_in_sandbox(
                workspace_dir=temp_dir,
                command=test_cmd,
                timeout_seconds=repo_config.timeout_seconds if repo_config else 60
            )
            
        # Record TestExecution in database
        test_exec = TestExecution(
            agent_run_id=agent_run.id,
            test_command=test_cmd,
            exit_code=sandbox_output.get("exit_code", 0),
            stdout=sandbox_output.get("stdout", ""),
            stderr=sandbox_output.get("stderr", ""),
            passed_count=sandbox_output.get("passed_count", 0),
            failed_count=sandbox_output.get("failed_count", 0),
            skipped_count=sandbox_output.get("skipped_count", 0),
            duration_seconds=sandbox_output.get("duration_seconds", 0.0),
            sandbox_type=sandbox_output.get("sandbox_type", "isolated_process"),
            execution_timestamp=datetime.utcnow()
        )
        db.add(test_exec)
        db.commit()
        db.refresh(test_exec)
        
        passed = test_exec.passed_count
        failed = test_exec.failed_count
        exit_code = test_exec.exit_code
        self.log(
            db,
            agent_run.id,
            f"Sandbox execution finished in {test_exec.duration_seconds}s (Exit code: {exit_code}). Results: {passed} passed, {failed} failed.",
            level="INFO" if exit_code == 0 and failed == 0 else "WARN"
        )
        
        return {
            "test_file_path": test_file_path,
            "test_code": test_code,
            "exit_code": exit_code,
            "passed_count": passed,
            "failed_count": failed,
            "skipped_count": test_exec.skipped_count,
            "stdout": test_exec.stdout,
            "stderr": test_exec.stderr,
            "duration_seconds": test_exec.duration_seconds,
            "sandbox_type": test_exec.sandbox_type
        }

test_agent = TestAgent()
