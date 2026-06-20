from typing import List, Optional, Tuple
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    username: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=1)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class PredictRequest(BaseModel):
    symptoms: List[str] = []


class PredictResponse(BaseModel):
    disease: Optional[str] = None
    confidence: Optional[float] = None
    top3: Optional[List[Tuple[str, float]]] = None
    doctor: Optional[str] = None
    emergency: Optional[bool] = None
    description: Optional[str] = None
    precautions: Optional[List[str]] = None
    error: Optional[str] = None


class TopSymptom(BaseModel):
    symptom: str
    importance: float


class ModelStatsResponse(BaseModel):
    rf_accuracy: float
    dt_accuracy: float
    top_symptoms: List[TopSymptom]
    total_diseases: int
    total_symptoms: int
    training_samples: int


class HistoryItem(BaseModel):
    symptoms: List[str] = []
    disease: str = ""
    confidence: float = 0
    doctor: str = ""


class MeResponse(BaseModel):
    user_id: int
    username: str
