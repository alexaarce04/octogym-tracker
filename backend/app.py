from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

app = FastAPI()

# req are able to be made from server
origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# current DB for workouts
workouts = []


class Workout(BaseModel):
    id: int
    type: str
    duration_minutes: int
    intensity: str


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/workouts", response_model=List[Workout])
def get_workouts():
    return workouts


@app.post("/workouts", response_model=Workout)
def create_workout(workout: Workout):
    workouts.append(workout)
    return workout
