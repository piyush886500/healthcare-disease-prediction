"""
MediPredict — FastAPI backend.

This is a 1:1 functional port of the original Flask `app.py`:
  - Same RandomForest disease prediction model & data (see ml.py)
  - Same emergency-symptom detection and doctor-referral mapping
  - Same SQLite users table + werkzeug password hashing (existing
    disease.db / existing user accounts keep working unchanged)
  - Same routes & behavior:
        GET  /                -> only this route required a session in the
                                 original app. Its React equivalent is the
                                 Home page, which checks GET /api/me on
                                 mount and redirects to /login if 401,
                                 exactly mirroring `if 'user_id' not in
                                 session: redirect(url_for('login'))`.
        POST /predict          -> POST /api/predict   (no auth check, same as original)
        GET  /model-stats       -> GET  /api/model-stats (no auth check, same as original)
        GET/POST /history       -> GET/POST /api/history (no auth check, same as original;
                                    still a single in-memory list capped at 5 items,
                                    exactly like `app.prediction_history` in the original)
        GET/POST /register      -> POST /api/register
        GET/POST /login         -> POST /api/login (sets an httponly session cookie
                                    instead of Flask's signed session cookie)
        GET  /logout            -> POST /api/logout
"""
import json
import os
from typing import List

from fastapi import FastAPI, HTTPException, Response, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import ml
from clinics import geocode_pincode, find_nearby_facilities
from db import get_db_connection, init_db
from auth import (
    create_session_token,
    get_current_user,
    generate_password_hash,
    check_password_hash,
    COOKIE_NAME,
    SESSION_HOURS,
)
from schemas import (
    RegisterRequest,
    LoginRequest,
    PredictRequest,
    ModelStatsResponse,
    HistoryItem,
    MeResponse,
)

app = FastAPI(title="MediPredict API")
IS_PROD = os.environ.get("RENDER") is not None

# Allow the React dev server (Vite defaults to 5173) and a same-machine
# build preview to call the API with cookies attached.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://medipredict-frontend.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


# In-memory prediction history, capped at 5 — same global, unkeyed-by-user
# behavior as `app.prediction_history` in the original Flask app.


# --------------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------------
@app.post("/api/register")
def register(payload: RegisterRequest):
    hashed = generate_password_hash(payload.password)
    conn = get_db_connection()
    try:
        conn.execute(
            "INSERT INTO users(username, email, password) VALUES(?,?,?)",
            (payload.username, payload.email, hashed),
        )
        conn.commit()
        return {"message": "Registration successful"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error: {str(e)}")
    finally:
        conn.close()


@app.post("/api/login")
def login(payload: LoginRequest, response: Response):
    conn = get_db_connection()
    user = conn.execute(
        "SELECT id, username, password FROM users WHERE email=?",
        (payload.email,),
    ).fetchone()
    conn.close()

    if user and check_password_hash(user["password"], payload.password):
        token = create_session_token(user["id"], user["username"])
        response.set_cookie(
            key=COOKIE_NAME,
            value=token,
            httponly=True,
            samesite="none" if IS_PROD else "lax",
            secure=IS_PROD,
            max_age=SESSION_HOURS * 3600,
            path="/",
        )
        return {"user_id": user["id"], "username": user["username"]}

    raise HTTPException(status_code=401, detail="Invalid Email or Password ❌")


@app.post("/api/logout")
def logout(response: Response):
    response.delete_cookie(
        COOKIE_NAME,
        path="/",
        samesite="none" if IS_PROD else "lax",
        secure=IS_PROD,
    )
    return {"message": "Logged out"}


@app.get("/api/me", response_model=MeResponse)
def me(current_user: dict = Depends(get_current_user)):
    return current_user


# --------------------------------------------------------------------------
# Symptoms / Prediction
# --------------------------------------------------------------------------
@app.get("/api/symptoms")
def get_symptoms():
    return {"symptoms": ml.all_symptoms}


@app.post("/api/predict")
def predict(payload: PredictRequest):
    user_symptoms = payload.symptoms

    if not user_symptoms:
        return {"error": "No symptoms provided"}

    result = ml.predict_disease(user_symptoms)
    description, precautions = ml.get_description_and_precautions(result["disease"])

    result["disease"] = str(result["disease"])
    result["top3"] = [(str(name), score) for name, score in result["top3"]]
    result["description"] = description
    result["precautions"] = precautions

    return result


@app.get("/api/model-stats", response_model=ModelStatsResponse)
def model_stats():
    return ml.get_model_stats()

@app.get("/api/nearby-facilities")
def nearby_facilities(pincode: str, radius_km: float = 5):
    try:
        coords = geocode_pincode(pincode)
    except Exception:
        raise HTTPException(status_code=502, detail="Location lookup failed, please try again")

    if coords is None:
        raise HTTPException(status_code=404, detail="Could not locate that pincode")

    lat, lon = coords
    try:
        facilities = find_nearby_facilities(lat, lon, radius_m=int(radius_km * 1000))
    except Exception:
        raise HTTPException(status_code=502, detail="Facility lookup failed, please try again")

    return {"pincode": pincode, "lat": lat, "lon": lon, "facilities": facilities}


# --------------------------------------------------------------------------
# History (in-memory, last 5 — same as the original)
# --------------------------------------------------------------------------
# @app.post("/api/history")
# def add_history(item: HistoryItem):
#     prediction_history.append(item.model_dump())
#     if len(prediction_history) > 5:
#         del prediction_history[: len(prediction_history) - 5]
#     return {"status": "saved"}


# @app.get("/api/history")
# def list_history():
#     return prediction_history

@app.post("/api/history")
def add_history(item: HistoryItem, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    conn.execute(
        "INSERT INTO predictions(user_id, disease, confidence, doctor, symptoms) VALUES (?,?,?,?,?)",
        (current_user["user_id"], item.disease, item.confidence, item.doctor, json.dumps(item.symptoms)),
    )
    conn.commit()
    conn.close()
    return {"status": "saved"}


@app.get("/api/history")
def list_history(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT disease, confidence, doctor, symptoms, created_at FROM predictions "
        "WHERE user_id=? ORDER BY id DESC LIMIT 5",
        (current_user["user_id"],),
    ).fetchall()
    conn.close()

    return [
        {
            "disease": row["disease"],
            "confidence": row["confidence"],
            "doctor": row["doctor"],
            "symptoms": json.loads(row["symptoms"]) if row["symptoms"] else [],
            "created_at": row["created_at"],
        }
        for row in rows
    ]

# --------------------------------------------------------------------------
# Serve the built React app (frontend/dist, copied here as frontend_dist
# during the Render build step) from this same service/domain.
# Mounted LAST so it never shadows the /api/* routes above.
#
# Plain StaticFiles(html=True) only serves index.html for "/" — refreshing
# a client-side route like /checker or /history would 404. This subclass
# falls back to index.html on any 404 so React Router can take over.
# --------------------------------------------------------------------------
class SPAStaticFiles(StaticFiles):
    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        if response.status_code == 404:
            return await super().get_response("index.html", scope)
        return response


FRONTEND_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend_dist")
if os.path.isdir(FRONTEND_DIST):
    app.mount("/", SPAStaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
