from datetime import date, datetime, timezone
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.pool import NullPool
from sqlmodel import Field, Session, SQLModel, create_engine, select


# ============================================================
# DATABASE MODEL
# ============================================================

class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str = ""
    priority: str = "Medium"
    due_date: Optional[date] = None
    completed: bool = False

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


# ============================================================
# DATABASE SETUP
# ============================================================

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not configured")

engine = create_engine(
    DATABASE_URL,
    poolclass=NullPool
)


# ============================================================
# REQUEST MODELS
# ============================================================

class TaskCreate(BaseModel):
    title: str
    description: str = ""
    priority: str = "Medium"
    due_date: Optional[date] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[date] = None
    completed: Optional[bool] = None


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Work To-Do API",
    description="A simple workplace task management API",
    version="1.0.0"
)


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

def create_database():
    SQLModel.metadata.create_all(engine)


@app.on_event("startup")
def startup():
    create_database()


# ============================================================
# SERVE FRONTEND
# ============================================================

app.mount(
    "/static",
    StaticFiles(directory="static"),
    name="static"
)


@app.get("/")
def home():
    return FileResponse("static/index.html")

# ============================================================
# GET ALL TASKS
# ============================================================

@app.get("/api/tasks")
def get_tasks():
    with Session(engine) as session:
        statement = select(Task).order_by(Task.id.desc())
        tasks = session.exec(statement).all()

        return tasks


# ============================================================
# GET ONE TASK
# ============================================================

@app.get("/api/tasks/{task_id}")
def get_task(task_id: int):

    with Session(engine) as session:

        task = session.get(Task, task_id)

        if not task:
            raise HTTPException(
                status_code=404,
                detail="Task not found"
            )

        return task


# ============================================================
# CREATE TASK
# ============================================================

@app.post("/api/tasks")
def create_task(task_data: TaskCreate):

    # Validate title
    if not task_data.title.strip():
        raise HTTPException(
            status_code=400,
            detail="Task title cannot be empty"
        )

    # Validate priority
    if task_data.priority not in ["Low", "Medium", "High"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid priority"
        )

    # Create task
    task = Task(
        title=task_data.title.strip(),
        description=task_data.description.strip(),
        priority=task_data.priority,
        due_date=task_data.due_date
    )

    with Session(engine) as session:

        session.add(task)
        session.commit()
        session.refresh(task)

        return task


# ============================================================
# UPDATE TASK
# ============================================================

@app.put("/api/tasks/{task_id}")
def update_task(
    task_id: int,
    task_data: TaskUpdate
):

    with Session(engine) as session:

        task = session.get(Task, task_id)

        if not task:
            raise HTTPException(
                status_code=404,
                detail="Task not found"
            )

        # Update title
        if task_data.title is not None:
            if not task_data.title.strip():
                raise HTTPException(
                    status_code=400,
                    detail="Task title cannot be empty"
                )

            task.title = task_data.title.strip()

        # Update description
        if task_data.description is not None:
            task.description = task_data.description.strip()

        # Update priority
        if task_data.priority is not None:

            if task_data.priority not in [
                "Low",
                "Medium",
                "High"
            ]:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid priority"
                )

            task.priority = task_data.priority

        # Update due date
        if task_data.due_date is not None:
            task.due_date = task_data.due_date

        # Update completed status
        if task_data.completed is not None:
            task.completed = task_data.completed

        session.add(task)
        session.commit()
        session.refresh(task)

        return task


# ============================================================
# DELETE TASK
# ============================================================

@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int):

    with Session(engine) as session:

        task = session.get(Task, task_id)

        if not task:
            raise HTTPException(
                status_code=404,
                detail="Task not found"
            )

        session.delete(task)
        session.commit()

        return {
            "message": "Task deleted successfully"
        }


# ============================================================
# DASHBOARD STATISTICS
# ============================================================

@app.get("/api/stats")
def get_stats():

    with Session(engine) as session:

        tasks = session.exec(
            select(Task)
        ).all()

        total = len(tasks)

        completed = len([
            task
            for task in tasks
            if task.completed
        ])

        pending = len([
            task
            for task in tasks
            if not task.completed
        ])

        high_priority = len([
            task
            for task in tasks
            if task.priority == "High"
            and not task.completed
        ])

        return {
            "total": total,
            "completed": completed,
            "pending": pending,
            "high_priority": high_priority
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)