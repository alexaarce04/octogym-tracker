from sqlalchemy import Column, Integer, String
from database import Base

class Workout(Base):
    __tablename__ = "workouts"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, index=True)
    duration_minutes = Column(Integer)
    intensity = Column(String)
    date = Column(String, index=True)
