"""
auth.py — login + token verify endpoints.
Single hardcoded user; credentials and JWT secret configurable via .env.
"""
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

router = APIRouter()

# ── Config ────────────────────────────────────────────────────────────────────
SECRET_KEY    = os.environ.get("JWT_SECRET",    "fd-dev-secret-change-in-production")
ALGORITHM     = "HS256"
EXPIRE_HOURS  = 24 * 7   # 7-day token

FD_USERNAME   = os.environ.get("FD_USERNAME", "admin")
FD_PASSWORD   = os.environ.get("FD_PASSWORD", "FinBoard2025")

# ── Schemas ───────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

# ── Routes ────────────────────────────────────────────────────────────────────
@router.post("/auth/login")
def login(body: LoginRequest):
    if body.username != FD_USERNAME or body.password != FD_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    payload = {
        "sub": body.username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=EXPIRE_HOURS),
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return {"token": token, "username": body.username}


@router.get("/auth/verify")
def verify(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {"valid": True, "username": payload.get("sub")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
