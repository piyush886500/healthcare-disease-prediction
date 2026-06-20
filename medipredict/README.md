# MediPredict — FastAPI + React rewrite

This is a full rewrite of the original Flask app (`app.py`) into:

- **`backend/`** — FastAPI, exposing a JSON API
- **`frontend/`** — React (Vite), the UI that used to live in Flask's `templates/`

All functionality from the original app is preserved: the same RandomForest
model trained on the same data, the same emergency-symptom detection, the
same doctor-referral table, the same disease descriptions/precautions, the
same user registration/login backed by the same SQLite `disease.db` (same
table schema, same `werkzeug` password hashes — existing accounts keep
working), and the same login-gated home page.

## What changed mechanically (not functionally)

| Original (Flask)                         | New (FastAPI + React)                                   |
|-------------------------------------------|-----------------------------------------------------------|
| Server-rendered `templates/index.html` etc. | React pages (`Home`, `Login`, `Register`, `History`, `Model Stats`) |
| `flask.session` signed cookie              | An httponly JWT cookie (`session`), same secret key string, same "is the user logged in" semantics |
| `if 'user_id' not in session` on `/`       | React `ProtectedRoute` that calls `GET /api/me` and redirects to `/login` on 401 — identical effect |
| `request.form[...]`                       | JSON request bodies validated by Pydantic |
| Routes return rendered HTML or `jsonify(...)` | Routes return the same JSON shapes (FastAPI auto-serializes) |
| `/`, `/register`, `/login`, `/logout`, `/predict`, `/model-stats`, `/history` | `/api/me` (session check), `/api/register`, `/api/login`, `/api/logout`, `/api/predict`, `/api/model-stats`, `/api/history`, `/api/symptoms` (new — needed so React can render the symptom list that the Jinja template used to receive at render time) |

Note: in the original code, only the `/` route checked the session —
`/predict`, `/model-stats`, and `/history` had no auth check at all. That
exact behavior is preserved here (those endpoints are open); only the
React route equivalent to `/` is gated client-side via `/api/me`.

The in-memory "last 5 predictions" history is preserved as-is, including
its original quirk: it's one global list shared by all visitors, not
scoped per user (this matches `app.prediction_history` in the original).

## Project layout

```
medipredict/
├── backend/
│   ├── main.py          # FastAPI app & routes
│   ├── ml.py             # data loading, training, prediction (ported from app.py)
│   ├── db.py              # sqlite connection + init (ported from database.py)
│   ├── auth.py             # JWT session cookie helpers + password hashing
│   ├── schemas.py           # Pydantic request/response models
│   ├── check_users.py        # ported utility script
│   ├── requirements.txt
│   └── data/                  # dataset.csv, Symptom-severity.csv,
│                                 symptom_Description.csv, symptom_precaution.csv,
│                                 disease.db  (copied from your uploads)
└── frontend/
    ├── src/
    │   ├── pages/            # Login, Register, Home, History, ModelStats
    │   ├── components/        # ChartHeader, SymptomSelector, ResultPanel, PulseDivider, ProtectedRoute
    │   ├── context/            # AuthContext (mirrors Flask session via /api/me)
    │   ├── api/client.js        # axios instance (withCredentials: true)
    │   └── index.css              # design tokens + styles
    ├── package.json
    └── vite.config.js
```

## Running it

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # optional
pip install -r requirements.txt
python main.py
# or: uvicorn main:app --reload --port 8000
```

The API runs on `http://localhost:8000`. Interactive docs at
`http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # adjust VITE_API_BASE_URL if your backend isn't on :8000
npm run dev
```

The app runs on `http://localhost:5173`.

## Production notes

- Set `secure=True` on the session cookie in `backend/main.py` once you're
  serving over HTTPS (it's `False` to allow local HTTP development).
- Update the `allow_origins` list in `backend/main.py` (CORS) to your real
  frontend domain when you deploy.
- Build the frontend for production with `npm run build` (outputs to
  `frontend/dist/`) and serve it with any static host / behind nginx.
