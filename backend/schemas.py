from pydantic import BaseModel
from typing import Optional

class WorkoutBase(BaseModel):
    type: str
    duration_minutes: int
    intensity: str
    date: str

class WorkoutCreate(BaseModel):
    type: str
    duration_minutes: int
    intensity: str
    date: Optional[str] = None

class WorkoutUpdate(BaseModel):
    type: Optional[str] = None
    duration_minutes: Optional[int] = None
    intensity: Optional[str] = None
    date: Optional[str] = None

class Workout(WorkoutBase):
    id: int

    class Config:
        orm_mode = True
