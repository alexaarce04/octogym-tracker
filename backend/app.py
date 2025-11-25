from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from datetime import date

import models
import schemas
from database import SessionLocal, engine

app = FastAPI()


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

# db
# creates tables if not already existing
models.Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# routes

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/workouts", response_model=List[schemas.Workout])
def get_workouts(db: Session = Depends(get_db)):
    workouts = db.query(models.Workout).all()
    return workouts

@app.post("/workouts", response_model=schemas.Workout)
def create_workout(workout_data: schemas.WorkoutCreate, db: Session = Depends(get_db)):
    workout_date = workout_data.date or date.today().isoformat()

    db_workout = models.Workout(
        type=workout_data.type,
        duration_minutes=workout_data.duration_minutes,
        intensity=workout_data.intensity,
        date=workout_date,
    )
    db.add(db_workout)
    db.commit()
    db.refresh(db_workout)
    return db_workout

@app.put("/workouts/{workout_id}", response_model=schemas.Workout)
def update_workout(
    workout_id: int,
    updates: schemas.WorkoutUpdate,
    db: Session = Depends(get_db),
):
    db_workout = db.query(models.Workout).filter(models.Workout.id == workout_id).first()
    if not db_workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    if updates.type is not None:
        db_workout.type = updates.type
    if updates.duration_minutes is not None:
        db_workout.duration_minutes = updates.duration_minutes
    if updates.intensity is not None:
        db_workout.intensity = updates.intensity
    if updates.date is not None:
        db_workout.date = updates.date

    db.commit()
    db.refresh(db_workout)
    return db_workout

@app.delete("/workouts/{workout_id}")
def delete_workout(workout_id: int, db: Session = Depends(get_db)):
    db_workout = db.query(models.Workout).filter(models.Workout.id == workout_id).first()
    if not db_workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    db.delete(db_workout)
    db.commit()
    return {"detail": "Workout deleted"}
