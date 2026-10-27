from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import SyncSessionLocal
from app.db.models import Repository, RepositoryConfiguration, AgentRun, PullRequestRecord
from app.schemas import RepositoryRead, RepositoryConnectRequest, RepositoryConfigUpdate, RepositoryConfigRead
from app.services.github_service import github_service
from app.services.audit_service import audit_service

router = APIRouter()

def get_sync_db():
    db = SyncSessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=List[RepositoryRead])
def list_repositories(
    search: Optional[str] = None,
    language: Optional[str] = None,
    is_demo: Optional[bool] = None,
    db: Session = Depends(get_sync_db)
):
    query = db.query(Repository)
    if search:
        query = query.filter(Repository.full_name.ilike(f"%{search}%"))
    if language:
        query = query.filter(Repository.language == language)
    if is_demo is not None:
        query = query.filter(Repository.is_demo == is_demo)
        
    repos = query.order_by(Repository.updated_at.desc()).all()
    results = []
    for r in repos:
        runs_count = db.query(AgentRun).filter(AgentRun.repository_id == r.id).count()
        prs_count = db.query(PullRequestRecord).filter(PullRequestRecord.repository_id == r.id).count()
        config_read = RepositoryConfigRead.model_validate(r.configuration) if r.configuration else None
        
        results.append(RepositoryRead(
            id=r.id,
            owner=r.owner,
            name=r.name,
            full_name=r.full_name,
            is_private=r.is_private,
            default_branch=r.default_branch,
            description=r.description,
            language=r.language,
            open_issues_count=r.open_issues_count,
            forks_count=r.forks_count,
            stars_count=r.stars_count,
            html_url=r.html_url,
            is_demo=r.is_demo,
            created_at=r.created_at,
            configuration=config_read,
            agent_runs_count=runs_count,
            pull_requests_count=prs_count
        ))
    return results

@router.post("", response_model=RepositoryRead)
async def connect_repository(
    payload: RepositoryConnectRequest,
    db: Session = Depends(get_sync_db)
):
    full_name = payload.full_name.strip()
    if "/" not in full_name:
        raise HTTPException(status_code=400, detail="Invalid repository format. Expected: owner/repo")
        
    owner, name = full_name.split("/", 1)
    
    # Check if already connected
    existing = db.query(Repository).filter(Repository.full_name == full_name).first()
    if existing:
        return existing
        
    # Attempt real GitHub API lookup if not forced demo
    is_demo = payload.is_demo
    repo_meta = None
    if not is_demo and github_service.token:
        try:
            repo_meta = await github_service.get_repository(owner, name)
        except Exception as e:
            # Fall back to demo mode if GitHub API fails
            is_demo = True
            
    if repo_meta:
        repo = Repository(
            owner=owner,
            name=name,
            full_name=full_name,
            is_private=repo_meta.get("private", False),
            default_branch=repo_meta.get("default_branch", payload.base_branch or "main"),
            description=repo_meta.get("description"),
            language=repo_meta.get("language", "Python"),
            open_issues_count=repo_meta.get("open_issues_count", 0),
            forks_count=repo_meta.get("forks_count", 0),
            stars_count=repo_meta.get("stargazers_count", 0),
            html_url=repo_meta.get("html_url", f"https://github.com/{full_name}"),
            is_demo=False
        )
    else:
        repo = Repository(
            owner=owner,
            name=name,
            full_name=full_name,
            is_private=False,
            default_branch=payload.base_branch or "main",
            description="Connected repository (Demo Mode)",
            language="Python",
            open_issues_count=1,
            forks_count=5,
            stars_count=24,
            html_url=f"https://github.com/{full_name}",
            is_demo=True
        )
        
    db.add(repo)
    db.commit()
    db.refresh(repo)
    
    # Create default configuration
    config = RepositoryConfiguration(
        repository_id=repo.id,
        base_branch=repo.default_branch,
        permitted_branches=["main", "master", "develop"],
        test_command="pytest",
        lint_command="flake8",
        max_retries=3,
        require_patch_approval=True,
        require_pr_approval=True,
        timeout_seconds=60
    )
    db.add(config)
    db.commit()
    db.refresh(repo)
    
    audit_service.log_event(
        db=db,
        event_type="REPOSITORY_CONNECTED",
        actor="user",
        repository_name=repo.full_name,
        details={"is_demo": repo.is_demo, "default_branch": repo.default_branch}
    )
    
    config_read = RepositoryConfigRead.model_validate(repo.configuration) if repo.configuration else None
    return RepositoryRead(
        id=repo.id,
        owner=repo.owner,
        name=repo.name,
        full_name=repo.full_name,
        is_private=repo.is_private,
        default_branch=repo.default_branch,
        description=repo.description,
        language=repo.language,
        open_issues_count=repo.open_issues_count,
        forks_count=repo.forks_count,
        stars_count=repo.stars_count,
        html_url=repo.html_url,
        is_demo=repo.is_demo,
        created_at=repo.created_at,
        configuration=config_read,
        agent_runs_count=0,
        pull_requests_count=0
    )

@router.get("/{id}", response_model=RepositoryRead)
def get_repository(id: str, db: Session = Depends(get_sync_db)):
    repo = db.query(Repository).filter(Repository.id == id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    runs_count = db.query(AgentRun).filter(AgentRun.repository_id == repo.id).count()
    prs_count = db.query(PullRequestRecord).filter(PullRequestRecord.repository_id == repo.id).count()
    config_read = RepositoryConfigRead.model_validate(repo.configuration) if repo.configuration else None
    
    return RepositoryRead(
        id=repo.id,
        owner=repo.owner,
        name=repo.name,
        full_name=repo.full_name,
        is_private=repo.is_private,
        default_branch=repo.default_branch,
        description=repo.description,
        language=repo.language,
        open_issues_count=repo.open_issues_count,
        forks_count=repo.forks_count,
        stars_count=repo.stars_count,
        html_url=repo.html_url,
        is_demo=repo.is_demo,
        created_at=repo.created_at,
        configuration=config_read,
        agent_runs_count=runs_count,
        pull_requests_count=prs_count
    )

@router.put("/{id}/configuration", response_model=RepositoryConfigRead)
def update_repository_configuration(
    id: str,
    payload: RepositoryConfigUpdate,
    db: Session = Depends(get_sync_db)
):
    repo = db.query(Repository).filter(Repository.id == id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    config = repo.configuration
    if not config:
        config = RepositoryConfiguration(repository_id=repo.id)
        db.add(config)
        
    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None:
            setattr(config, field, val)
            
    db.commit()
    db.refresh(config)
    
    audit_service.log_event(
        db=db,
        event_type="REPOSITORY_CONFIG_UPDATED",
        actor="user",
        repository_name=repo.full_name,
        details=update_data
    )
    
    return RepositoryConfigRead.model_validate(config)

@router.get("/{id}/branches")
def list_branches(id: str, db: Session = Depends(get_sync_db)):
    repo = db.query(Repository).filter(Repository.id == id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    branches = ["main", "staging", "develop"]
    if repo.default_branch not in branches:
        branches.insert(0, repo.default_branch)
    return {"default_branch": repo.default_branch, "branches": branches}
