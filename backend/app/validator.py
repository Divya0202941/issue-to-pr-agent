def validate_user(username: str):
    """
    Validates a username input.
    Rejects empty strings and whitespace-only strings with a ValueError.
    Preserves existing behavior for valid usernames.
    """
    if not username or not username.strip():
        raise ValueError("Username cannot be empty")
    return {"username": username, "status": "active"}
