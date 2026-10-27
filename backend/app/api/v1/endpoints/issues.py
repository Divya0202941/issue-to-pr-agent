from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import SyncSessionLocal
from app.db.models import IssueRecord, Repository
from app.schemas import IssueValidationRequest, IssueValidationResponse, IssueRead
from app.core.security import parse_and_validate_github_issue_url
from app.services.github_service import github_service

router = APIRouter()

def get_sync_db():
    db = SyncSessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/validate", response_model=IssueValidationResponse)
def validate_issue_url(payload: IssueValidationRequest):
    is_valid, owner, repo, issue_number, error = parse_and_validate_github_issue_url(payload.issue_url)
    return IssueValidationResponse(
        is_valid=is_valid,
        owner=owner,
        repo=repo,
        issue_number=issue_number,
        error=error
    )

@router.post("/fetch", response_model=IssueRead)
async def fetch_issue(payload: IssueValidationRequest, db: Session = Depends(get_sync_db)):
    is_valid, owner, repo_name, issue_number, error = parse_and_validate_github_issue_url(payload.issue_url)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)
        
    full_name = f"{owner}/{repo_name}"
    
    # Check if repo exists in DB
    repository = db.query(Repository).filter(Repository.full_name == full_name).first()
    if not repository:
        # Create repository entry for this issue
        repository = Repository(
            owner=owner,
            name=repo_name,
            full_name=full_name,
            default_branch="main",
            html_url=f"https://github.com/{full_name}",
            is_demo=(owner == "acme-corp")
        )
        db.add(repository)
        db.commit()
        db.refresh(repository)
        
    # Check if issue already cached in DB
    cached_issue = (
        db.query(IssueRecord)
        .filter(
            IssueRecord.repository_id == repository.id,
            IssueRecord.issue_number == issue_number
        )
        .first()
    )
    if cached_issue:
        return cached_issue
        
    # Try fetching from real GitHub API
    issue_data = None
    if github_service.token:
        try:
            issue_data = await github_service.get_issue(owner, repo_name, issue_number)
        except Exception:
            pass
            
    if issue_data:
        issue = IssueRecord(
            repository_id=repository.id,
            issue_number=issue_number,
            title=issue_data.get("title", f"Issue #{issue_number}"),
            body=issue_data.get("body", ""),
            author=issue_data.get("user", {}).get("login", "unknown"),
            state=issue_data.get("state", "open"),
            labels=[l.get("name") for l in issue_data.get("labels", [])],
            html_url=issue_data.get("html_url", payload.issue_url),
            is_demo=False
        )
    else:
        # Use demo issue representation
        issue = IssueRecord(
            repository_id=repository.id,
            issue_number=issue_number,
            title="Fix incorrect validation for empty user input",
            body="The application currently accepts an empty username or whitespace under specific input paths in validate_user(). Validate the input consistently and add regression tests.",
            author="demo-user",
            state="open",
            labels=["bug", "validation"],
            html_url=payload.issue_url,
            is_demo=True
        )
        
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue

@router.get("", response_model=List[IssueRead])
def list_issues(
    repository_id: Optional[str] = None,
    state: Optional[str] = None,
    db: Session = Depends(get_sync_db)
):
    query = db.query(IssueRecord)
    if repository_id:
        query = query.filter(IssueRecord.repository_id == repository_id)
    if state:
        query = query.filter(IssueRecord.state == state)
    return query.order_by(IssueRecord.created_at.desc()).all()
