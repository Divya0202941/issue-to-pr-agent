import json
from typing import Dict, Any, List, Optional
import httpx
from app.core.config import settings

class AIService:
    def __init__(self, provider: Optional[str] = None):
        self.provider = provider or settings.AI_PROVIDER

    async def _call_llm_json(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """Calls configured LLM provider and parses structured JSON output."""
        if self.provider == "openai" and settings.OPENAI_API_KEY:
            return await self._call_openai(system_prompt, user_prompt)
        elif self.provider == "anthropic" and settings.ANTHROPIC_API_KEY:
            return await self._call_anthropic(system_prompt, user_prompt)
        elif self.provider == "gemini" and settings.GEMINI_API_KEY:
            return await self._call_gemini(system_prompt, user_prompt)
        else:
            # Fallback to smart offline deterministic mock engine
            return self._mock_llm(system_prompt, user_prompt)

    async def _call_openai(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": settings.OPENAI_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt + "\nYou MUST respond with valid JSON only."},
                {"role": "user", "content": user_prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2
        }
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            return json.loads(content)

    async def _call_anthropic(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": settings.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        payload = {
            "model": settings.ANTHROPIC_MODEL,
            "max_tokens": 4096,
            "system": system_prompt + "\nYou MUST respond with valid JSON only.",
            "messages": [{"role": "user", "content": user_prompt}],
            "temperature": 0.2
        }
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            content = resp.json()["content"][0]["text"]
            # Clean possible markdown wrap
            if content.startswith("```json"):
                content = content[7:-3]
            elif content.startswith("```"):
                content = content[3:-3]
            return json.loads(content.strip())

    async def _call_gemini(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
        payload = {
            "contents": [{
                "parts": [{"text": f"{system_prompt}\n\nTask:\n{user_prompt}\n\nRespond with valid JSON."}]
            }],
            "generationConfig": {"response_mime_type": "application/json"}
        }
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            content = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(content)

    def _mock_llm(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """Provides realistic structured responses based on prompt keywords."""
        prompt_lower = user_prompt.lower() + " " + system_prompt.lower()
        
        # 1. ISSUE ANALYZER
        if "issue analyzer" in prompt_lower or "analyze the following github issue" in prompt_lower:
            return {
                "summary": "Fix validation logic for empty and whitespace-only username inputs to prevent invalid state.",
                "requirements": [
                    "Reject empty string usernames",
                    "Reject whitespace-only usernames (strip spaces before validation)",
                    "Maintain backward compatibility for valid usernames with alphanumeric characters",
                    "Add explicit ValueError with clear message 'Username cannot be empty'"
                ],
                "acceptance_criteria": [
                    "validate_user('') raises ValueError",
                    "validate_user('   ') raises ValueError",
                    "validate_user('valid_user') succeeds and returns user dict",
                    "All regression tests pass under pytest"
                ],
                "implementation_plan": [
                    "Inspect app/validator.py for validate_user() definition",
                    "Add check: if not username or not username.strip(): raise ValueError('Username cannot be empty')",
                    "Create or update tests/test_validator.py with parameterized test cases",
                    "Run test suite in sandbox"
                ],
                "risk_assessment": "Low risk. Limited to input validation entrypoint. No database schema changes.",
                "suggested_tests": [
                    "test_empty_username_raises_error",
                    "test_whitespace_username_raises_error",
                    "test_valid_username_passes"
                ],
                "confidence_score": 0.94,
                "confidence_reason": "Clear problem statement, specific expected behavior, straightforward unit validation.",
                "warnings": []
            }
            
        # 2. CODE LOCATOR
        elif "code locator" in prompt_lower or "locate relevant files" in prompt_lower:
            return {
                "relevant_files": [
                    {
                        "path": "app/validator.py",
                        "relevance_score": 0.98,
                        "symbols": ["validate_user", "UserValidationError"],
                        "reason": "Contains username validation function that currently lacks whitespace checks.",
                        "suggested_changes": "Add whitespace stripping and length validation check before returning."
                    },
                    {
                        "path": "tests/test_validator.py",
                        "relevance_score": 0.92,
                        "symbols": ["test_validate_user", "test_invalid_user"],
                        "reason": "Test file where regression assertions must be added.",
                        "suggested_changes": "Add test cases for empty string and whitespace-only strings."
                    }
                ],
                "retrieval_method": "AST symbol extraction & keyword relevance matching",
                "total_files_scanned": 12,
                "project_language": "Python"
            }
            
        # 3. FIX GENERATOR
        elif "fix generator" in prompt_lower or "generate a minimal patch" in prompt_lower:
            # Check if this is a correction loop after reviewer feedback
            is_correction = "reviewer feedback" in prompt_lower or "attempt" in prompt_lower
            
            if is_correction:
                old_code = 'def validate_user(username: str):\n    if not username:\n        raise ValueError("Username cannot be empty")\n    return {"username": username, "status": "active"}'
                new_code = 'def validate_user(username: str):\n    if not username or not username.strip():\n        raise ValueError("Username cannot be empty")\n    return {"username": username, "status": "active"}'
                patch = """--- a/app/validator.py
+++ b/app/validator.py
@@ -1,4 +1,4 @@
 def validate_user(username: str):
-    if not username:
+    if not username or not username.strip():
         raise ValueError("Username cannot be empty")
     return {"username": username, "status": "active"}
"""
                return {
                    "patch_content": patch,
                    "change_summary": "Updated validate_user() to reject both empty and whitespace-only usernames using `if not username or not username.strip():` while preserving existing behavior for valid usernames.",
                    "explanation": "Added `.strip()` validation ensuring usernames containing only whitespace characters trigger ValueError('Username cannot be empty') while preserving valid usernames.",
                    "files_changed": [
                        {
                            "file_path": "app/validator.py",
                            "additions": 1,
                            "deletions": 1,
                            "status": "modified",
                            "old_content": old_code,
                            "new_content": new_code,
                            "diff": patch
                        }
                    ],
                    "potential_risks": "None. Input is sanitized and properly validated.",
                    "dependencies_changed": []
                }
            else:
                old_code = 'def validate_user(username: str):\n    if not username:\n        raise ValueError("Username cannot be empty")\n    return {"username": username, "status": "active"}'
                new_code = 'def validate_user(username: str):\n    if not username or not username.strip():\n        raise ValueError("Username cannot be empty")\n    return {"username": username, "status": "active"}'
                patch = """--- a/app/validator.py
+++ b/app/validator.py
@@ -1,4 +1,4 @@
 def validate_user(username: str):
-    if not username:
+    if not username or not username.strip():
         raise ValueError("Username cannot be empty")
     return {"username": username, "status": "active"}
"""
                return {
                    "patch_content": patch,
                    "change_summary": "Updated validate_user() to reject both empty and whitespace-only usernames using `if not username or not username.strip():` while preserving existing behavior for valid usernames.",
                    "explanation": "Added `.strip()` validation ensuring usernames containing only whitespace characters trigger ValueError('Username cannot be empty') while preserving valid usernames.",
                    "files_changed": [
                        {
                            "file_path": "app/validator.py",
                            "additions": 1,
                            "deletions": 1,
                            "status": "modified",
                            "old_content": old_code,
                            "new_content": new_code,
                            "diff": patch
                        }
                    ],
                    "potential_risks": "None. Input is sanitized and properly validated.",
                    "dependencies_changed": []
                }

        # 4. TEST AGENT
        elif "test agent" in prompt_lower or "generate targeted tests" in prompt_lower:
            test_code = '''import pytest
from app.validator import validate_user

def test_valid_username():
    """Verify that valid usernames are accepted and existing behavior is preserved."""
    result = validate_user("octocat")
    assert result == {"username": "octocat", "status": "active"}

    result2 = validate_user("alice_dev")
    assert result2 == {"username": "alice_dev", "status": "active"}

def test_empty_username_raises_error():
    """Verify that empty string usernames are rejected with ValueError."""
    with pytest.raises(ValueError, match="Username cannot be empty"):
        validate_user("")

def test_whitespace_username_raises_error():
    """Verify that whitespace-only usernames (spaces, tabs, newlines) are rejected with ValueError."""
    with pytest.raises(ValueError, match="Username cannot be empty"):
        validate_user("   ")
    with pytest.raises(ValueError, match="Username cannot be empty"):
        validate_user(" ")
    with pytest.raises(ValueError, match="Username cannot be empty"):
        validate_user(" \\t \\n ")
'''
            return {
                "test_file_path": "tests/test_validator.py",
                "test_code": test_code,
                "tests_created": [
                    "test_valid_username",
                    "test_empty_username_raises_error",
                    "test_whitespace_username_raises_error"
                ],
                "test_framework": "pytest",
                "coverage_estimate": "100% on app/validator.py"
            }

        # 5. REVIEWER
        elif "reviewer" in prompt_lower or "evaluate the proposed changes" in prompt_lower:
            # If the patch has .strip(), approve it!
            if "username.strip()" in prompt_lower:
                return {
                    "verdict": "approved",
                    "summary": "Implementation correctly handles both empty strings and whitespace-only strings. All tests pass with full coverage.",
                    "findings": [
                        {
                            "category": "correctness",
                            "severity": "suggestion",
                            "title": "Clean input sanitization",
                            "description": "username.strip() ensures trailing and leading whitespace are cleaned cleanly.",
                            "file_path": "app/validator.py",
                            "line_number": 2,
                            "resolution_status": "addressed"
                        }
                    ],
                    "confidence_score": 0.98,
                    "confidence_explanation": "Zero security vulnerabilities detected. Test assertions verify boundary conditions.",
                    "requires_correction": False
                }
            else:
                # Requires correction loop!
                return {
                    "verdict": "changes_requested",
                    "summary": "Whitespace-only input ('   ') is not caught by `if not username:`. A user providing spaces can still bypass validation.",
                    "findings": [
                        {
                            "category": "correctness",
                            "severity": "critical",
                            "title": "Whitespace-only string bypasses check",
                            "description": "Python strings with whitespace evaluate to truthy. Use `if not username or not username.strip():` to catch whitespace.",
                            "file_path": "app/validator.py",
                            "line_number": 2,
                            "resolution_status": "open"
                        }
                    ],
                    "confidence_score": 0.65,
                    "confidence_explanation": "Identified edge case failure that will fail the whitespace regression test.",
                    "requires_correction": True,
                    "actionable_feedback": "Update `if not username:` to `if not username or not username.strip():` and return sanitized `username.strip()`."
                }

        # 6. PR AGENT
        elif "pr agent" in prompt_lower or "pull request" in prompt_lower:
            return {
                "title": "fix: validate empty and whitespace-only usernames in validate_user()",
                "description": """## Summary
Resolves the issue where empty and whitespace-only usernames were accepted under specific input paths.

### Changes Made
- Added whitespace stripping and empty string validation in `app/validator.py`.
- Raises descriptive `ValueError("Username cannot be empty")` when invalid input is received.
- Added comprehensive unit tests in `tests/test_validator.py` covering valid, empty, and whitespace inputs.

### Test Results
- **Framework**: `pytest`
- **Tests Passed**: 3 passed, 0 failed
- **Coverage**: 100% on modified validator functions

### Verification & Safety
- [x] Tested in isolated sandbox environment
- [x] Reviewed by automated AI Reviewer (bounded self-correction loop passed)
- [x] Zero hardcoded credentials or secrets
- [x] No breaking API changes
- [x] Human approval obtained prior to PR creation

Fixes #1
""",
                "head_branch": "fix/validate-empty-username-input",
                "base_branch": "main",
                "labels": ["bug", "validation", "automated-pr"]
            }

        return {"status": "ok", "message": "Processed successfully"}

ai_service = AIService()
