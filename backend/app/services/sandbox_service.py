import os
import sys
import re
import time
import tempfile
import subprocess
from typing import Dict, Any, Tuple, Optional
from app.core.config import settings
from app.core.security import validate_safe_command

# Regex to scrub sensitive tokens from terminal output
SECRET_PATTERNS = [
    re.compile(r"ghp_[a-zA-Z0-9]{36}"),
    re.compile(r"github_pat_[a-zA-Z0-9]{82}"),
    re.compile(r"sk-[a-zA-Z0-9]{48}"),
    re.compile(r"AIza[0-9A-Za-z-_]{35}"),
]

def redact_secrets(text: str) -> str:
    """Sanitizes sensitive keys and tokens from execution logs."""
    if not text:
        return ""
    sanitized = text
    for pattern in SECRET_PATTERNS:
        sanitized = pattern.sub("[REDACTED_SECRET]", sanitized)
    return sanitized

def parse_pytest_output(stdout: str, stderr: str) -> Tuple[int, int, int]:
    """
    Parses pytest output to extract passed, failed, and skipped counts.
    Returns: (passed_count, failed_count, skipped_count)
    """
    combined = f"{stdout}\n{stderr}"
    passed = 0
    failed = 0
    skipped = 0
    
    p_m = re.search(r"(\d+)\s+passed", combined)
    f_m = re.search(r"(\d+)\s+failed", combined)
    e_m = re.search(r"(\d+)\s+error", combined)
    s_m = re.search(r"(\d+)\s+skipped", combined)
    
    if p_m:
        passed = int(p_m.group(1))
    if f_m:
        failed = int(f_m.group(1))
    if e_m:
        failed += int(e_m.group(1))
    if s_m:
        skipped = int(s_m.group(1))
        
    return passed, failed, skipped

class SandboxService:
    @staticmethod
    def execute_in_sandbox(
        workspace_dir: str,
        command: str = "pytest",
        timeout_seconds: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Executes a test/validation command in an isolated environment with:
        - Strict timeout limits
        - Process restrictions
        - Secret redaction in output
        - Command safety validation
        """
        is_safe, error = validate_safe_command(command)
        if not is_safe:
            return {
                "exit_code": 126,
                "stdout": "",
                "stderr": f"Execution rejected by security policy: {error}",
                "passed_count": 0,
                "failed_count": 1,
                "skipped_count": 0,
                "duration_seconds": 0.0,
                "sandbox_type": "security_blocked"
            }

        timeout = timeout_seconds or settings.SANDBOX_TIMEOUT_SECONDS
        start_time = time.time()
        
        # Clean environment variables without exposing host secrets
        env = {
            "PATH": os.environ.get("PATH", ""),
            "SYSTEMROOT": os.environ.get("SYSTEMROOT", ""),
            "TEMP": tempfile.gettempdir(),
            "TMP": tempfile.gettempdir(),
            "PYTHONPATH": workspace_dir,
            "PYTHONDONTWRITEBYTECODE": "1",
        }
        
        # Determine python executable
        python_exe = sys.executable
        # If running pytest, invoke via python -m pytest
        if command.strip() == "pytest" or command.strip().startswith("pytest "):
            cmd_args = [python_exe, "-m"] + command.split()
        else:
            cmd_args = command.split()
            
        try:
            process = subprocess.Popen(
                cmd_args,
                cwd=workspace_dir,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                shell=False
            )
            
            stdout, stderr = process.communicate(timeout=timeout)
            duration = round(time.time() - start_time, 2)
            exit_code = process.returncode
            
            passed, failed, skipped = parse_pytest_output(stdout, stderr)
            
            # If exit code was failure but no test count parsed
            if exit_code != 0 and (passed + failed + skipped == 0):
                failed = 1
                
            return {
                "exit_code": exit_code,
                "stdout": redact_secrets(stdout),
                "stderr": redact_secrets(stderr),
                "passed_count": passed,
                "failed_count": failed,
                "skipped_count": skipped,
                "duration_seconds": duration,
                "sandbox_type": "isolated_process"
            }
            
        except subprocess.TimeoutExpired:
            process.kill()
            stdout, stderr = process.communicate()
            duration = round(time.time() - start_time, 2)
            return {
                "exit_code": 124,
                "stdout": redact_secrets(stdout),
                "stderr": f"Execution timed out after {timeout} seconds.",
                "passed_count": 0,
                "failed_count": 1,
                "skipped_count": 0,
                "duration_seconds": duration,
                "sandbox_type": "isolated_process_timeout"
            }
        except Exception as e:
            duration = round(time.time() - start_time, 2)
            return {
                "exit_code": 1,
                "stdout": "",
                "stderr": f"Execution error: {str(e)}",
                "passed_count": 0,
                "failed_count": 1,
                "skipped_count": 0,
                "duration_seconds": duration,
                "sandbox_type": "isolated_process_error"
            }

sandbox_service = SandboxService()
