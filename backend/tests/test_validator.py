import os
import sys
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.validator import validate_user

def test_valid_username():
    """Verify that valid usernames are accepted and existing behavior is preserved."""
    result = validate_user("octocat")
    assert result == {"username": "octocat", "status": "active"}

    result2 = validate_user("alice_dev")
    assert result2 == {"username": "alice_dev", "status": "active"}

    result3 = validate_user("user123")
    assert result3 == {"username": "user123", "status": "active"}

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
        validate_user("\t")
    with pytest.raises(ValueError, match="Username cannot be empty"):
        validate_user(" \t \n ")
