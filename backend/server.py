"""ClassSync backend: auth, classes, materials, calendar, chat, duck jump."""
from __future__ import annotations

import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, List, Optional

import bcrypt
import jwt
import requests
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, APIRouter, HTTPException, UploadFile, File, Form, status, Query
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ISSUER = os.environ.get("JWT_ISSUER", "classsync")
JWT_AUDIENCE = os.environ.get("JWT_AUDIENCE", "classsync-mobile")
ACCESS_MINUTES = int(os.environ.get("ACCESS_MINUTES", "1440"))
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
APP_NAME = os.environ.get("APP_NAME", "classsync")

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="ClassSync API")
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("classsync")

_storage_key: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def new_id() -> str:
    return uuid.uuid4().hex


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(pw: str, stored: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), stored.encode())
    except Exception:
        return False


def hash_secret(raw: str) -> str:
    return sha256(raw.encode()).hexdigest()


def make_access_token(user_id: str, role: str, class_id: Optional[str]) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "class_id": class_id,
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "iat": now_utc(),
        "exp": now_utc() + timedelta(minutes=ACCESS_MINUTES),
        "jti": secrets.token_urlsafe(12),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"],
            issuer=JWT_ISSUER,
            audience=JWT_AUDIENCE,
        )
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")


async def current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Missing auth")
    claims = decode_access_token(creds.credentials)
    user = await db.users.find_one({"id": claims["sub"]}, {"_id": 0, "password_hash": 0})
    if not user or user.get("disabled"):
        raise HTTPException(status_code=401, detail="User not found or disabled")
    return user


def require_admin(user: dict = Depends(current_user)) -> dict:
    if user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


# ---------------------------------------------------------------------------
# Storage helpers (Emergent Object Storage)
# ---------------------------------------------------------------------------
def _init_storage_sync() -> str:
    global _storage_key
    if _storage_key:
        return _storage_key
    r = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
    r.raise_for_status()
    _storage_key = r.json()["storage_key"]
    return _storage_key


def _put_sync(path: str, data: bytes, content_type: str) -> dict:
    key = _init_storage_sync()
    r = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    r.raise_for_status()
    return r.json()


def _get_sync(path: str) -> tuple[bytes, str]:
    global _storage_key
    key = _init_storage_sync()
    r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if r.status_code == 503:
        _storage_key = None
        key = _init_storage_sync()
        r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    surname: str = Field(min_length=1, max_length=60)
    username: str = Field(min_length=3, max_length=40)
    password: str = Field(min_length=6, max_length=100)
    invite_code: Optional[str] = None  # optional - only used to join existing class
    # These are ignored server-side for security; role/class assigned by backend


class LoginIn(BaseModel):
    username: str
    password: str


class ClassConfigIn(BaseModel):
    name: str
    school: Optional[str] = None
    school_year: Optional[str] = None
    section: Optional[str] = None
    description: Optional[str] = None
    logo_path: Optional[str] = None
    primary_color: Optional[str] = "#7C3AED"
    secondary_color: Optional[str] = "#3B82F6"
    vice_representative: Optional[str] = None


class ClassPatchIn(BaseModel):
    name: Optional[str] = None
    school: Optional[str] = None
    school_year: Optional[str] = None
    section: Optional[str] = None
    description: Optional[str] = None
    logo_path: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    vice_representative: Optional[str] = None


class SubjectIn(BaseModel):
    name: str
    color: Optional[str] = None
    order: Optional[int] = 0


class NoteIn(BaseModel):
    subject_id: str
    title: str
    description: Optional[str] = ""
    body: Optional[str] = ""
    attachments: List[dict] = []  # [{path, name, type, size}]


class EventIn(BaseModel):
    title: str
    type: str  # verifica | interrogazione | compito | evento | gita | assemblea | consegna | altro
    subject_id: Optional[str] = None
    date: str  # ISO date "YYYY-MM-DD"
    time: Optional[str] = None
    description: Optional[str] = ""
    attachment_path: Optional[str] = None


class HomeworkIn(BaseModel):
    title: str
    subject_id: Optional[str] = None
    due_date: str
    description: Optional[str] = ""
    attachment_path: Optional[str] = None


class AnnouncementIn(BaseModel):
    title: str
    body: str
    important: bool = False
    attachments: List[dict] = []


class MessageIn(BaseModel):
    text: str
    reply_to: Optional[str] = None
    attachment_path: Optional[str] = None


class ReactionIn(BaseModel):
    emoji: str


class ScoreIn(BaseModel):
    score: int


class UpdateProfileIn(BaseModel):
    bio: Optional[str] = None
    username: Optional[str] = None
    avatar_path: Optional[str] = None


class ChangePasswordIn(BaseModel):
    old_password: str
    new_password: str = Field(min_length=6)


class UserAdminIn(BaseModel):
    role: Optional[str] = None
    disabled: Optional[bool] = None
    muted: Optional[bool] = None


# ---------------------------------------------------------------------------
# Startup: init indexes + storage
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def on_startup() -> None:
    await db.users.create_index("username", unique=True)
    await db.classes.create_index("invite_hash")
    await db.subjects.create_index([("class_id", 1), ("order", 1)])
    await db.events.create_index([("class_id", 1), ("date", 1)])
    await db.messages.create_index([("class_id", 1), ("created_at", 1)])
    await db.scores.create_index([("class_id", 1), ("score", -1)])
    try:
        await run_in_threadpool(_init_storage_sync)
    except Exception as e:  # non-fatal
        log.warning(f"Storage init failed: {e}")


# ---------------------------------------------------------------------------
# Public: system state
# ---------------------------------------------------------------------------
@api.get("/")
async def root():
    return {"ok": True, "service": "classsync"}


@api.get("/bootstrap")
async def bootstrap():
    """Tell the client whether a class exists (so it can render onboarding)."""
    cls = await db.classes.find_one({}, {"_id": 0, "invite_hash": 0})
    return {"has_class": bool(cls), "class": cls}


# ---------------------------------------------------------------------------
# AUTH
# ---------------------------------------------------------------------------
@api.post("/auth/register")
async def register(body: RegisterIn):
    username = body.username.strip().lower()
    existing = await db.users.find_one({"username": username})
    if existing:
        raise HTTPException(status_code=409, detail="Username già utilizzato")

    # Determine class + role
    cls = await db.classes.find_one({})
    role = "STUDENTE"
    class_id: Optional[str] = None

    if not cls:
        # No class exists yet. Only allow ONE provisional user at a time to
        # avoid multiple "orphan" accounts before class setup.
        provisional = await db.users.count_documents({"class_id": None})
        if provisional > 0:
            raise HTTPException(status_code=409, detail="Configurazione classe in corso. Riprova più tardi.")
        role = "STUDENTE"  # provisional; upgraded to ADMIN atomically in /class/setup
    else:
        # A class exists: must supply valid invite code
        if not body.invite_code:
            raise HTTPException(status_code=400, detail="Codice classe richiesto")
        if hash_secret(body.invite_code.strip()) != cls.get("invite_hash"):
            raise HTTPException(status_code=400, detail="Codice classe non valido")
        class_id = cls["id"]
        role = "STUDENTE"

    user = {
        "id": new_id(),
        "name": body.name.strip(),
        "surname": body.surname.strip(),
        "username": username,
        "password_hash": hash_password(body.password),
        "role": role,
        "class_id": class_id,
        "avatar_path": None,
        "bio": "",
        "disabled": False,
        "muted": False,
        "created_at": iso(now_utc()),
    }
    await db.users.insert_one(user)
    token = make_access_token(user["id"], user["role"], user.get("class_id"))
    return {
        "access_token": token,
        "user": _public_user(user),
        "needs_class_setup": cls is None,
    }


@api.post("/auth/login")
async def login(body: LoginIn):
    user = await db.users.find_one({"username": body.username.strip().lower()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    if user.get("disabled"):
        raise HTTPException(status_code=403, detail="Account disabilitato")
    token = make_access_token(user["id"], user["role"], user.get("class_id"))
    return {"access_token": token, "user": _public_user(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return {"user": user}


@api.post("/auth/change-password")
async def change_password(body: ChangePasswordIn, user: dict = Depends(current_user)):
    doc = await db.users.find_one({"id": user["id"]})
    if not doc or not verify_password(body.old_password, doc["password_hash"]):
        raise HTTPException(status_code=400, detail="Vecchia password errata")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_password(body.new_password)}})
    return {"ok": True}


@api.patch("/auth/profile")
async def update_profile(body: UpdateProfileIn, user: dict = Depends(current_user)):
    upd: dict[str, Any] = {}
    if body.bio is not None:
        upd["bio"] = body.bio[:200]
    if body.username is not None:
        u = body.username.strip().lower()
        clash = await db.users.find_one({"username": u, "id": {"$ne": user["id"]}})
        if clash:
            raise HTTPException(status_code=409, detail="Username già in uso")
        upd["username"] = u
    if body.avatar_path is not None:
        upd["avatar_path"] = body.avatar_path
    if upd:
        await db.users.update_one({"id": user["id"]}, {"$set": upd})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return {"user": fresh}


def _public_user(u: dict) -> dict:
    return {
        "id": u["id"],
        "name": u.get("name"),
        "surname": u.get("surname"),
        "username": u.get("username"),
        "role": u.get("role"),
        "class_id": u.get("class_id"),
        "avatar_path": u.get("avatar_path"),
        "bio": u.get("bio", ""),
        "disabled": u.get("disabled", False),
        "muted": u.get("muted", False),
    }


# ---------------------------------------------------------------------------
# CLASS SETUP + CONFIG
# ---------------------------------------------------------------------------
@api.post("/class/setup")
async def setup_class(body: ClassConfigIn, user: dict = Depends(current_user)):
    """Atomic first-class creation. Only allowed when NO class exists.
    The caller becomes ADMIN of the created class."""
    # Atomic reservation: only one user can win the upsert insert.
    from pymongo import ReturnDocument
    reserve = await db.meta.find_one_and_update(
        {"_id": "class_created"},
        {"$setOnInsert": {"by": user["id"], "at": iso(now_utc())}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    if reserve.get("by") != user["id"]:
        raise HTTPException(status_code=409, detail="Classe già configurata")
    existing_class = await db.classes.find_one({})
    if existing_class:
        raise HTTPException(status_code=409, detail="Classe già configurata")

    invite_raw = secrets.token_hex(3).upper()  # 6 hex chars, human-friendly
    cls = {
        "id": new_id(),
        "name": body.name,
        "school": body.school,
        "school_year": body.school_year,
        "section": body.section,
        "description": body.description or "",
        "logo_path": body.logo_path,
        "primary_color": body.primary_color or "#7C3AED",
        "secondary_color": body.secondary_color or "#3B82F6",
        "vice_representative": body.vice_representative,
        "representative_id": user["id"],
        "invite_hash": hash_secret(invite_raw),
        "created_at": iso(now_utc()),
        "updated_at": iso(now_utc()),
    }
    await db.classes.insert_one(cls)
    await db.users.update_one({"id": user["id"]}, {"$set": {"role": "ADMIN", "class_id": cls["id"]}})

    # Seed default subjects
    defaults = ["Matematica", "Italiano", "Storia", "Inglese", "Informatica", "Fisica", "Scienze"]
    subj_docs = [
        {"id": new_id(), "class_id": cls["id"], "name": n, "order": i, "color": None, "created_at": iso(now_utc())}
        for i, n in enumerate(defaults)
    ]
    if subj_docs:
        await db.subjects.insert_many(subj_docs)

    await _log_admin(user["id"], "class.created", {"class_id": cls["id"]})
    fresh_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    token = make_access_token(fresh_user["id"], fresh_user["role"], fresh_user["class_id"])
    return {
        "access_token": token,
        "user": fresh_user,
        "class": _public_class(cls),
        "invite_code": invite_raw,
    }


def _public_class(c: dict) -> dict:
    return {k: v for k, v in c.items() if k not in {"_id", "invite_hash"}}


@api.get("/class")
async def get_class(user: dict = Depends(current_user)):
    cls = await db.classes.find_one({"id": user.get("class_id")})
    if not cls:
        raise HTTPException(status_code=404, detail="Classe non trovata")
    return {"class": _public_class(cls)}


@api.patch("/class")
async def update_class(body: ClassPatchIn, user: dict = Depends(require_admin)):
    upd = {k: v for k, v in body.dict(exclude_unset=True).items() if v is not None}
    upd["updated_at"] = iso(now_utc())
    await db.classes.update_one({"id": user["class_id"]}, {"$set": upd})
    await _log_admin(user["id"], "class.updated", upd)
    cls = await db.classes.find_one({"id": user["class_id"]})
    return {"class": _public_class(cls)}


@api.post("/class/invite/regenerate")
async def regen_invite(user: dict = Depends(require_admin)):
    raw = secrets.token_hex(3).upper()
    await db.classes.update_one({"id": user["class_id"]}, {"$set": {"invite_hash": hash_secret(raw)}})
    await _log_admin(user["id"], "class.invite.regen", {})
    return {"invite_code": raw}


# Note: for security we never expose the current invite code (only its hash is stored).
# Admins must POST /class/invite/regenerate to obtain a new one.


# ---------------------------------------------------------------------------
# USERS (list + admin actions)
# ---------------------------------------------------------------------------
@api.get("/users")
async def list_users(user: dict = Depends(current_user)):
    cursor = db.users.find({"class_id": user["class_id"]}, {"_id": 0, "password_hash": 0})
    return {"users": [_public_user(u) async for u in cursor]}


@api.patch("/users/{user_id}")
async def admin_update_user(user_id: str, body: UserAdminIn, admin: dict = Depends(require_admin)):
    if user_id == admin["id"] and body.role and body.role != "ADMIN":
        raise HTTPException(status_code=400, detail="Non puoi rimuoverti dal ruolo ADMIN")
    target = await db.users.find_one({"id": user_id, "class_id": admin["class_id"]})
    if not target:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    upd = {k: v for k, v in body.dict().items() if v is not None}
    if "role" in upd and upd["role"] not in ("ADMIN", "STUDENTE"):
        raise HTTPException(status_code=400, detail="Ruolo non valido")
    await db.users.update_one({"id": user_id}, {"$set": upd})
    await _log_admin(admin["id"], "user.updated", {"target": user_id, **upd})
    fresh = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return {"user": fresh}


@api.delete("/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Non puoi eliminarti")
    r = await db.users.delete_one({"id": user_id, "class_id": admin["class_id"]})
    await _log_admin(admin["id"], "user.deleted", {"target": user_id})
    return {"deleted": r.deleted_count}


# ---------------------------------------------------------------------------
# SUBJECTS
# ---------------------------------------------------------------------------
@api.get("/subjects")
async def list_subjects(user: dict = Depends(current_user)):
    cursor = db.subjects.find({"class_id": user["class_id"]}, {"_id": 0}).sort("order", 1)
    return {"subjects": [s async for s in cursor]}


@api.post("/subjects")
async def create_subject(body: SubjectIn, admin: dict = Depends(require_admin)):
    doc = {
        "id": new_id(),
        "class_id": admin["class_id"],
        "name": body.name,
        "color": body.color,
        "order": body.order or 0,
        "created_at": iso(now_utc()),
    }
    await db.subjects.insert_one(doc)
    doc.pop("_id", None)
    return {"subject": doc}


@api.patch("/subjects/{sid}")
async def update_subject(sid: str, body: SubjectIn, admin: dict = Depends(require_admin)):
    await db.subjects.update_one({"id": sid, "class_id": admin["class_id"]}, {"$set": body.dict(exclude_none=True)})
    doc = await db.subjects.find_one({"id": sid}, {"_id": 0})
    return {"subject": doc}


@api.delete("/subjects/{sid}")
async def delete_subject(sid: str, admin: dict = Depends(require_admin)):
    r = await db.subjects.delete_one({"id": sid, "class_id": admin["class_id"]})
    return {"deleted": r.deleted_count}


# ---------------------------------------------------------------------------
# NOTES / MATERIALS
# ---------------------------------------------------------------------------
@api.get("/notes")
async def list_notes(
    user: dict = Depends(current_user),
    subject_id: Optional[str] = None,
    q: Optional[str] = None,
):
    filt: dict = {"class_id": user["class_id"]}
    if subject_id:
        filt["subject_id"] = subject_id
    if q:
        filt["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"author_name": {"$regex": q, "$options": "i"}},
        ]
    cursor = db.notes.find(filt, {"_id": 0}).sort("created_at", -1)
    return {"notes": [n async for n in cursor]}


@api.post("/notes")
async def create_note(body: NoteIn, user: dict = Depends(current_user)):
    doc = {
        "id": new_id(),
        "class_id": user["class_id"],
        "subject_id": body.subject_id,
        "title": body.title,
        "description": body.description or "",
        "body": body.body or "",
        "attachments": body.attachments or [],
        "author_id": user["id"],
        "author_name": f"{user.get('name','')} {user.get('surname','')}".strip(),
        "created_at": iso(now_utc()),
    }
    await db.notes.insert_one(doc)
    doc.pop("_id", None)
    return {"note": doc}


@api.patch("/notes/{nid}")
async def update_note(nid: str, body: NoteIn, user: dict = Depends(current_user)):
    note = await db.notes.find_one({"id": nid, "class_id": user["class_id"]})
    if not note:
        raise HTTPException(status_code=404, detail="Appunto non trovato")
    if user["role"] != "ADMIN" and note["author_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Non autorizzato")
    await db.notes.update_one({"id": nid}, {"$set": body.dict(exclude_unset=True)})
    doc = await db.notes.find_one({"id": nid}, {"_id": 0})
    return {"note": doc}


@api.delete("/notes/{nid}")
async def delete_note(nid: str, user: dict = Depends(current_user)):
    note = await db.notes.find_one({"id": nid, "class_id": user["class_id"]})
    if not note:
        raise HTTPException(status_code=404, detail="Appunto non trovato")
    if user["role"] != "ADMIN" and note["author_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Non autorizzato")
    await db.notes.delete_one({"id": nid})
    if user["role"] == "ADMIN":
        await _log_admin(user["id"], "note.deleted", {"id": nid})
    return {"deleted": 1}


# ---------------------------------------------------------------------------
# CALENDAR EVENTS
# ---------------------------------------------------------------------------
@api.get("/events")
async def list_events(user: dict = Depends(current_user)):
    cursor = db.events.find({"class_id": user["class_id"]}, {"_id": 0}).sort("date", 1)
    return {"events": [e async for e in cursor]}


@api.post("/events")
async def create_event(body: EventIn, admin: dict = Depends(require_admin)):
    doc = {
        "id": new_id(),
        "class_id": admin["class_id"],
        **body.dict(),
        "author_id": admin["id"],
        "created_at": iso(now_utc()),
    }
    await db.events.insert_one(doc)
    doc.pop("_id", None)
    return {"event": doc}


@api.patch("/events/{eid}")
async def update_event(eid: str, body: EventIn, admin: dict = Depends(require_admin)):
    await db.events.update_one({"id": eid, "class_id": admin["class_id"]}, {"$set": body.dict(exclude_unset=True)})
    doc = await db.events.find_one({"id": eid}, {"_id": 0})
    return {"event": doc}


@api.delete("/events/{eid}")
async def delete_event(eid: str, admin: dict = Depends(require_admin)):
    r = await db.events.delete_one({"id": eid, "class_id": admin["class_id"]})
    await _log_admin(admin["id"], "event.deleted", {"id": eid})
    return {"deleted": r.deleted_count}


# ---------------------------------------------------------------------------
# HOMEWORK (with personal completion)
# ---------------------------------------------------------------------------
@api.get("/homework")
async def list_homework(user: dict = Depends(current_user)):
    cursor = db.homework.find({"class_id": user["class_id"]}, {"_id": 0}).sort("due_date", 1)
    items = [h async for h in cursor]
    for h in items:
        h["completed"] = user["id"] in (h.get("completed_by") or [])
        h.pop("completed_by", None)
    return {"homework": items}


@api.post("/homework")
async def create_hw(body: HomeworkIn, admin: dict = Depends(require_admin)):
    doc = {
        "id": new_id(),
        "class_id": admin["class_id"],
        **body.dict(),
        "author_id": admin["id"],
        "completed_by": [],
        "created_at": iso(now_utc()),
    }
    await db.homework.insert_one(doc)
    doc.pop("_id", None)
    doc["completed"] = False
    doc.pop("completed_by", None)
    return {"homework": doc}


@api.post("/homework/{hid}/toggle")
async def toggle_hw(hid: str, user: dict = Depends(current_user)):
    hw = await db.homework.find_one({"id": hid, "class_id": user["class_id"]})
    if not hw:
        raise HTTPException(status_code=404, detail="Compito non trovato")
    done = user["id"] in (hw.get("completed_by") or [])
    op = "$pull" if done else "$addToSet"
    await db.homework.update_one({"id": hid}, {op: {"completed_by": user["id"]}})
    return {"completed": not done}


@api.delete("/homework/{hid}")
async def delete_hw(hid: str, admin: dict = Depends(require_admin)):
    r = await db.homework.delete_one({"id": hid, "class_id": admin["class_id"]})
    return {"deleted": r.deleted_count}


# ---------------------------------------------------------------------------
# ANNOUNCEMENTS
# ---------------------------------------------------------------------------
@api.get("/announcements")
async def list_ann(user: dict = Depends(current_user)):
    cursor = db.announcements.find({"class_id": user["class_id"]}, {"_id": 0}).sort("created_at", -1)
    items = [a async for a in cursor]
    for a in items:
        a["read_count"] = len(a.get("read_by") or [])
        a["read"] = user["id"] in (a.get("read_by") or [])
        a.pop("read_by", None)
    return {"announcements": items}


@api.post("/announcements")
async def create_ann(body: AnnouncementIn, admin: dict = Depends(require_admin)):
    doc = {
        "id": new_id(),
        "class_id": admin["class_id"],
        **body.dict(),
        "author_id": admin["id"],
        "reactions": {},
        "read_by": [],
        "created_at": iso(now_utc()),
    }
    await db.announcements.insert_one(doc)
    doc.pop("_id", None)
    doc["read_count"] = 0
    doc["read"] = False
    doc.pop("read_by", None)
    return {"announcement": doc}


@api.post("/announcements/{aid}/read")
async def mark_read(aid: str, user: dict = Depends(current_user)):
    await db.announcements.update_one(
        {"id": aid, "class_id": user["class_id"]},
        {"$addToSet": {"read_by": user["id"]}},
    )
    return {"ok": True}


@api.post("/announcements/{aid}/react")
async def react_ann(aid: str, body: ReactionIn, user: dict = Depends(current_user)):
    key = f"reactions.{body.emoji}"
    await db.announcements.update_one(
        {"id": aid, "class_id": user["class_id"]},
        {"$addToSet": {key: user["id"]}},
    )
    return {"ok": True}


@api.delete("/announcements/{aid}")
async def delete_ann(aid: str, admin: dict = Depends(require_admin)):
    r = await db.announcements.delete_one({"id": aid, "class_id": admin["class_id"]})
    await _log_admin(admin["id"], "announcement.deleted", {"id": aid})
    return {"deleted": r.deleted_count}


# ---------------------------------------------------------------------------
# CHAT MESSAGES
# ---------------------------------------------------------------------------
@api.get("/messages")
async def list_messages(user: dict = Depends(current_user), limit: int = 200):
    cursor = db.messages.find({"class_id": user["class_id"]}, {"_id": 0}).sort("created_at", 1).limit(limit)
    return {"messages": [m async for m in cursor]}


@api.post("/messages")
async def post_message(body: MessageIn, user: dict = Depends(current_user)):
    if user.get("muted"):
        raise HTTPException(status_code=403, detail="Sei stato silenziato")
    doc = {
        "id": new_id(),
        "class_id": user["class_id"],
        "author_id": user["id"],
        "author_name": f"{user.get('name','')} {user.get('surname','')}".strip(),
        "author_avatar": user.get("avatar_path"),
        "text": body.text,
        "reply_to": body.reply_to,
        "attachment_path": body.attachment_path,
        "reactions": {},
        "pinned": False,
        "deleted": False,
        "created_at": iso(now_utc()),
    }
    await db.messages.insert_one(doc)
    doc.pop("_id", None)
    return {"message": doc}


@api.post("/messages/{mid}/react")
async def react_msg(mid: str, body: ReactionIn, user: dict = Depends(current_user)):
    await db.messages.update_one(
        {"id": mid, "class_id": user["class_id"]},
        {"$addToSet": {f"reactions.{body.emoji}": user["id"]}},
    )
    return {"ok": True}


@api.post("/messages/{mid}/pin")
async def pin_msg(mid: str, admin: dict = Depends(require_admin)):
    m = await db.messages.find_one({"id": mid, "class_id": admin["class_id"]})
    if not m:
        raise HTTPException(status_code=404, detail="Messaggio non trovato")
    await db.messages.update_one({"id": mid}, {"$set": {"pinned": not m.get("pinned", False)}})
    return {"pinned": not m.get("pinned", False)}


@api.post("/messages/{mid}/favorite")
async def fav_msg(mid: str, user: dict = Depends(current_user)):
    existing = await db.favorites.find_one({"user_id": user["id"], "message_id": mid})
    if existing:
        await db.favorites.delete_one({"user_id": user["id"], "message_id": mid})
        return {"favorited": False}
    await db.favorites.insert_one({"user_id": user["id"], "message_id": mid, "at": iso(now_utc())})
    return {"favorited": True}


@api.delete("/messages/{mid}")
async def delete_msg(mid: str, user: dict = Depends(current_user)):
    m = await db.messages.find_one({"id": mid, "class_id": user["class_id"]})
    if not m:
        raise HTTPException(status_code=404, detail="Messaggio non trovato")
    if user["role"] != "ADMIN" and m["author_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Non autorizzato")
    await db.messages.update_one({"id": mid}, {"$set": {"deleted": True, "text": ""}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# DUCK JUMP scores
# ---------------------------------------------------------------------------
@api.post("/scores")
async def submit_score(body: ScoreIn, user: dict = Depends(current_user)):
    if body.score < 0 or body.score > 100000:
        raise HTTPException(status_code=400, detail="Punteggio non valido")
    existing = await db.scores.find_one({"user_id": user["id"], "class_id": user["class_id"]})
    best = max(body.score, existing.get("score", 0) if existing else 0)
    doc = {
        "user_id": user["id"],
        "class_id": user["class_id"],
        "name": f"{user.get('name','')} {user.get('surname','')}".strip(),
        "score": best,
        "updated_at": iso(now_utc()),
    }
    await db.scores.update_one(
        {"user_id": user["id"], "class_id": user["class_id"]},
        {"$set": doc},
        upsert=True,
    )
    return {"score": best, "personal_best": best}


@api.get("/scores")
async def leaderboard(user: dict = Depends(current_user)):
    cursor = db.scores.find({"class_id": user["class_id"]}, {"_id": 0}).sort("score", -1).limit(50)
    return {"leaderboard": [s async for s in cursor]}


# ---------------------------------------------------------------------------
# ADMIN LOG
# ---------------------------------------------------------------------------
async def _log_admin(user_id: str, action: str, meta: dict) -> None:
    await db.admin_log.insert_one({
        "id": new_id(),
        "user_id": user_id,
        "action": action,
        "meta": meta,
        "at": iso(now_utc()),
    })


@api.get("/admin/log")
async def get_log(_admin: dict = Depends(require_admin)):
    cursor = db.admin_log.find({}, {"_id": 0}).sort("at", -1).limit(200)
    return {"log": [x async for x in cursor]}


@api.get("/admin/dashboard")
async def dashboard(admin: dict = Depends(require_admin)):
    cid = admin["class_id"]
    users = await db.users.count_documents({"class_id": cid})
    notes = await db.notes.count_documents({"class_id": cid})
    events = await db.events.count_documents({"class_id": cid})
    ann = await db.announcements.count_documents({"class_id": cid})
    msgs = await db.messages.count_documents({"class_id": cid})
    muted = await db.users.count_documents({"class_id": cid, "muted": True})
    return {"users": users, "notes": notes, "events": events, "announcements": ann, "messages": msgs, "muted": muted}


# ---------------------------------------------------------------------------
# FILE UPLOAD / DOWNLOAD via Emergent Object Storage
# ---------------------------------------------------------------------------
@api.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(current_user)):
    data = await file.read()
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File troppo grande (max 20MB)")
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "bin"
    path = f"{APP_NAME}/uploads/{user['id']}/{new_id()}.{ext}"
    content_type = file.content_type or "application/octet-stream"
    try:
        result = await run_in_threadpool(_put_sync, path, data, content_type)
    except Exception as e:
        log.exception("upload failed")
        raise HTTPException(status_code=500, detail=f"Upload fallito: {e}")
    await db.files.insert_one({
        "path": result["path"],
        "owner_id": user["id"],
        "class_id": user["class_id"],
        "name": file.filename,
        "type": content_type,
        "size": len(data),
        "created_at": iso(now_utc()),
    })
    return {"path": result["path"], "name": file.filename, "type": content_type, "size": len(data)}


@api.get("/files/{path:path}")
async def download_file(path: str, token: Optional[str] = Query(None), creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    # accept either Bearer header or ?token= for <img> on web
    raw_token = None
    if creds:
        raw_token = creds.credentials
    elif token:
        raw_token = token
    if not raw_token:
        raise HTTPException(status_code=401, detail="Missing auth")
    claims = decode_access_token(raw_token)
    file_doc = await db.files.find_one({"path": path})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File non trovato")
    if file_doc.get("class_id") and file_doc["class_id"] != claims.get("class_id"):
        raise HTTPException(status_code=403, detail="Non autorizzato")
    try:
        content, ct = await run_in_threadpool(_get_sync, path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download fallito: {e}")
    return Response(content=content, media_type=ct)


# ---------------------------------------------------------------------------
# Mount + CORS
# ---------------------------------------------------------------------------
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown() -> None:
    client.close()
