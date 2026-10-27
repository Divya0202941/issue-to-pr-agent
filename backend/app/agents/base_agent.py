from abc import ABC, abstractmethod
from datetime import datetime
import time
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.db.models import AgentRun, AgentExecution, AgentExecutionLog

class BaseAgent(ABC):
    def __init__(self, agent_name: str, display_name: str, description: str):
        self.agent_name = agent_name
        self.display_name = display_name
        self.description = description

    def log(self, db: Session, agent_run_id: str, message: str, level: str = "INFO"):
        """Logs execution progress to the database."""
        log_entry = AgentExecutionLog(
            agent_run_id=agent_run_id,
            agent_name=self.agent_name,
            level=level,
            message=message,
            timestamp=datetime.utcnow()
        )
        db.add(log_entry)
        db.commit()

    @abstractmethod
    async def run(self, agent_run: AgentRun, db: Session, context: Dict[str, Any]) -> Dict[str, Any]:
        """Core execution logic implemented by each specialized agent."""
        pass

    async def execute(self, agent_run: AgentRun, db: Session, context: Dict[str, Any]) -> Dict[str, Any]:
        """Wrapper handling execution record lifecycle, timing, and error tracking."""
        # Find or create AgentExecution record
        execution = (
            db.query(AgentExecution)
            .filter(
                AgentExecution.agent_run_id == agent_run.id,
                AgentExecution.agent_name == self.agent_name
            )
            .first()
        )
        if not execution:
            execution = AgentExecution(
                agent_run_id=agent_run.id,
                agent_name=self.agent_name,
                status="running",
                started_at=datetime.utcnow()
            )
            db.add(execution)
        else:
            execution.status = "running"
            execution.started_at = datetime.utcnow()
            execution.error_message = None
            
        db.commit()
        db.refresh(execution)
        
        start_time = time.time()
        self.log(db, agent_run.id, f"Agent [{self.display_name}] started execution.")
        
        try:
            output = await self.run(agent_run, db, context)
            duration = round(time.time() - start_time, 2)
            
            execution.status = "completed"
            execution.finished_at = datetime.utcnow()
            execution.duration_seconds = duration
            execution.output_data = output
            db.commit()
            
            self.log(db, agent_run.id, f"Agent [{self.display_name}] completed successfully in {duration}s.")
            return output
            
        except Exception as e:
            duration = round(time.time() - start_time, 2)
            error_msg = str(e)
            execution.status = "failed"
            execution.finished_at = datetime.utcnow()
            execution.duration_seconds = duration
            execution.error_message = error_msg
            db.commit()
            
            self.log(db, agent_run.id, f"Agent [{self.display_name}] failed: {error_msg}", level="ERROR")
            raise
