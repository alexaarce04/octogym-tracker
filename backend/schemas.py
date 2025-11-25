from pydantic import BaseModel, EmailStr
from typing import Optional, List

#  workout schema

class WorkoutBase(BaseModel):
    type: str
    duration_minutes: int
    intensity: str
    date: str


class WorkoutCreate(BaseModel):
    type: str
    duration_minutes: int
    intensity: str
    # backend will fill in today if missing
    date: Optional[str] = None


class WorkoutUpdate(BaseModel):
    type: Optional[str] = None
    duration_minutes: Optional[int] = None
    intensity: Optional[str] = None
    date: Optional[str] = None


class Workout(WorkoutBase):
    id: int
    user_id: Optional[int] = None

    class Config:
        orm_mode = True


# user schema

class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    workouts: List[Workout] = []

    class Config:
        orm_mode = True


# auth schema

class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[EmailStr] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
