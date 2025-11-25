from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    workouts = relationship("Workout", back_populates="owner")


class Workout(Base):
    __tablename__ = "workouts"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, index=True)
    duration_minutes = Column(Integer)
    intensity = Column(String)
    date = Column(String, index=True)

    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="workouts")
