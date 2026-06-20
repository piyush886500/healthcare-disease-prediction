"""
Auth for MediPredict.

The original Flask app used `flask.session` (a signed cookie) to remember
`user_id` / `username` after login, and guarded the `/` route with
`if 'user_id' not in session: redirect to login`.

Since FastAPI has no built-in session, this module reproduces the same
behavior with a JWT stored in an httponly cookie. The JWT payload carries
the same two pieces of state the original session held: user_id and
username. The same secret key string from the original app
(`app.secret_key = "medipredict_secret_key"`) is reused as the JWT signing
key so behavior/intent stays identical.
"""
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Cookie, HTTPException, status
from werkzeug.security import generate_password_hash, check_password_hash  # noqa: F401  (re-exported)

SECRET_KEY = "medipredict_secret_key"
ALGORITHM = "HS256"
COOKIE_NAME = "session"
SESSION_HOURS = 24 * 7  # 7 days, mirrors a typical "stay logged in" session


def create_session_token(user_id: int, username: str) -> str:
    payload = {
        "user_id": user_id,
        "username": username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=SESSION_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_session_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None


def get_current_user(session: str | None = Cookie(default=None)):
    """
    Dependency that mirrors the original `if 'user_id' not in session`
    check. Raises 401 if there is no valid session cookie.
    """
    if session is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_session_token(session)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    return {"user_id": payload["user_id"], "username": payload["username"]}


def get_current_user_optional(session: str | None = Cookie(default=None)):
    """Same as get_current_user but returns None instead of raising."""
    if session is None:
        return None
    payload = decode_session_token(session)
    if payload is None:
        return None
    return {"user_id": payload["user_id"], "username": payload["username"]}
