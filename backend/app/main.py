from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="MediPredict API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "MediPredict API is running ✅"}

@app.post("/api/login")
def login(data: dict):
    username = data.get("username", "")
    password = data.get("password", "")
    # Simple auth for now
    if username and password:
        return {
            "access_token": "demo-token-123",
            "token_type": "bearer",
            "user": {"username": username, "email": f"{username}@medipredict.com"}
        }
    return {"error": "Invalid credentials"}

@app.post("/api/register")
def register(data: dict):
    return {
        "message": "User registered successfully",
        "user": {"username": data.get("username"), "email": data.get("email")}
    }

@app.post("/api/predict")
def predict(data: dict):
    age            = data.get("age", 40)
    bmi            = data.get("bmi", 22)
    blood_pressure = data.get("bloodPressure", 120)
    glucose        = data.get("glucose", 90)
    symptoms       = data.get("symptoms", [])
    family_history = data.get("familyHistory", False)

    score = 0.35
    if age > 50:             score += 0.15
    if bmi > 28:             score += 0.12
    if blood_pressure > 130: score += 0.12
    if glucose > 100:        score += 0.14
    if family_history:       score += 0.08
    score += len(symptoms) * 0.02
    score = min(score, 0.95)

    probability = round(score * 100)
    risk    = "high" if score > 0.7 else "medium" if score > 0.45 else "low"
    disease = "Diabetes Type 2" if (bmi > 28 or glucose > 100) else \
              "Hypertension" if blood_pressure > 130 else \
              "Coronary Artery Disease"

    return {
        "disease": disease,
        "probability": probability,
        "risk": risk,
        "confidence": 87,
        "shapValues": [
            {"feature": "Age",            "value": 0.22 if age > 50 else 0.08,            "direction": "positive" if age > 50 else "negative"},
            {"feature": "BMI",            "value": 0.18 if bmi > 25 else 0.05,            "direction": "positive" if bmi > 25 else "negative"},
            {"feature": "Blood Pressure", "value": 0.15 if blood_pressure > 120 else 0.03,"direction": "positive" if blood_pressure > 120 else "negative"},
            {"feature": "Glucose",        "value": 0.19 if glucose > 100 else 0.04,       "direction": "positive" if glucose > 100 else "negative"},
            {"feature": "Family History", "value": 0.12 if family_history else 0.06,      "direction": "positive" if family_history else "negative"},
        ],
        "recommendations": [
            "Consult a specialist immediately" if risk == "high" else "Schedule doctor appointment",
            "Monitor vitals daily",
            "Regular exercise 30 min/day",
            "Balanced diet low in processed foods"
        ]
    }

@app.get("/api/history")
def history():
    return {"predictions": []}

@app.get("/api/nearby-facilities")
def nearby_facilities():
    return {"facilities": []}