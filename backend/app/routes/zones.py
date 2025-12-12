# backend/app/routes/zones.py
from fastapi import APIRouter, BackgroundTasks, HTTPException, status, Request
from pydantic import BaseModel, Field, confloat
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timezone, timedelta
import uuid
import os
import requests

router = APIRouter(prefix="/api", tags=["danger_zones"])

# -------------------------
# Config (env)
# -------------------------
FCM_SERVER_KEY = os.environ.get("FCM_SERVER_KEY")  # legacy server key (demo)
PUSH_THROTTLE = timedelta(minutes=2)

# Score configuration
_SCORE_BASE = 100
_PENALTY_MEDIUM = 0.89
_PENALTY_HIGH = 1.73
_RECOVERY_PER_HOUR = 5

# -------------------------
# Pydantic models
# -------------------------
class DangerZone(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    lat: confloat(ge=-90, le=90)
    lng: confloat(ge=-180, le=180)
    radius_m: int = Field(..., gt=0)
    severity: str = Field("medium")
    description: Optional[str] = ""


class ZoneEventIn(BaseModel):
    user_id: str
    zone_id: str
    event: str  # "enter" or "exit"
    lat: confloat(ge=-90, le=90)
    lng: confloat(ge=-180, le=180)
    accuracy_m: Optional[int] = None
    ts: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    debug: Optional[bool] = False


class RegisterTokenIn(BaseModel):
    user_id: str
    token: str


# -------------------------
# In-memory stores
# -------------------------
DANGER_ZONES: Dict[str, Dict[str, Any]] = {}
ZONE_EVENTS_LOG: List[Dict[str, Any]] = []
USER_TOKENS: Dict[str, List[str]] = {}
_LAST_PUSH_TS: Dict[Tuple[str, str], datetime] = {}

# -------------------------
# Helpers
# -------------------------
def _zone_to_dict(z: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": z["id"],
        "name": z["name"],
        "lat": z["lat"],
        "lng": z["lng"],
        "radius_m": z["radius_m"],
        "severity": z.get("severity", "medium"),
        "description": z.get("description", ""),
    }


def _send_fcm_push(token: str, title: str, body: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if not FCM_SERVER_KEY:
        return {"ok": False, "reason": "no_fcm_key_configured"}

    url = "https://fcm.googleapis.com/fcm/send"
    headers = {
        "Authorization": f"key={FCM_SERVER_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "to": token,
        "notification": {"title": title, "body": body},
        "data": data or {},
    }
    try:
        r = requests.post(url, json=payload, headers=headers, timeout=8)
        return {"ok": r.status_code == 200, "status": r.status_code, "body": r.text}
    except Exception as e:
        return {"ok": False, "reason": str(e)}


def _should_send_push(user_id: str, zone_id: str) -> bool:
    key = (user_id, zone_id)
    last = _LAST_PUSH_TS.get(key)
    now = datetime.now(timezone.utc)
    if last and (now - last) < PUSH_THROTTLE:
        return False
    _LAST_PUSH_TS[key] = now
    return True


# -------------------------
# Seed demo zones
# -------------------------
def _seed_default_zones():
    example = [
        {"id":"zone-hyderabad-charminar","name":"Charminar (Hyderabad Old City)","lat":17.3616,"lng":78.4747,"radius_m":350,"severity":"high","description":"Extremely busy old city market — pickpocket risk"},
        {"id":"zone-delhi-connaught","name":"Connaught Place, Delhi","lat":28.6328,"lng":77.2197,"radius_m":300,"severity":"medium","description":"High footfall; busy roads and occasional protests"},
        # add rest of your zones here...
    ]
    for z in example:
        DANGER_ZONES[z["id"]] = z


if not DANGER_ZONES:
    _seed_default_zones()

# -------------------------
# Routes
# -------------------------
@router.get("/danger_zones", response_model=List[DangerZone])
async def list_zones():
    return [DangerZone(**_zone_to_dict(z)) for z in DANGER_ZONES.values()]


@router.get("/danger_zones/{zone_id}", response_model=DangerZone)
async def get_zone(zone_id: str):
    z = DANGER_ZONES.get(zone_id)
    if not z:
        raise HTTPException(status_code=404, detail="Zone not found")
    return DangerZone(**_zone_to_dict(z))


# Zone event endpoint — client posts when entering/exiting
@router.post("/zone_event", status_code=status.HTTP_202_ACCEPTED)
async def zone_event(evt: ZoneEventIn, background_tasks: BackgroundTasks, request: Request):
    # basic validation
    if evt.zone_id not in DANGER_ZONES:
        raise HTTPException(status_code=404, detail="Zone not found")

    # append to event log (persist in DB in production)
    event_record = {
        "user_id": evt.user_id,
        "zone_id": evt.zone_id,
        "event": evt.event,
        "lat": float(evt.lat),
        "lng": float(evt.lng),
        "accuracy_m": evt.accuracy_m,
        "ts": evt.ts.isoformat(),
        "debug": bool(evt.debug),
        "source": request.client.host if request.client else None,
    }
    ZONE_EVENTS_LOG.append(event_record)   # ✅ always append

    # If debug, just skip push notification but still count in score
    if evt.debug:
        print(f"[zone_event:debug] {event_record} (still counted for score)")
        return {"status": "accepted", "debug": True}

    # background push logic...



@router.get("/zone_events", response_model=List[Dict[str, Any]])
async def list_events(limit: int = 100):
    return list(reversed(ZONE_EVENTS_LOG))[:limit]


@router.get("/safety_score/{user_id}")
async def safety_score(user_id: str):
    enters = [e for e in ZONE_EVENTS_LOG if e.get("user_id") == user_id and e.get("event") == "enter"]
    score = _SCORE_BASE
    details = {"base": _SCORE_BASE, "penalties": 0, "recovered": 0, "events_count": len(enters)}

    total_penalty = 0
    for e in enters:
        zid = e.get("zone_id")
        zone = DANGER_ZONES.get(zid)
        if not zone:
            continue
        severity = str(zone.get("severity", "medium")).lower()
        if severity == "high":
            total_penalty += _PENALTY_HIGH
        elif severity == "medium":
            total_penalty += _PENALTY_MEDIUM

    details["penalties"] = total_penalty
    score -= total_penalty

    # Recovery
    last_enter_ts = None
    for e in enters:
        ts = e.get("ts")
        if isinstance(ts, str):
            try:
                ts_dt = datetime.fromisoformat(ts)
            except Exception:
                continue
        elif isinstance(ts, datetime):
            ts_dt = ts
        else:
            continue
        if ts_dt.tzinfo is None:
            ts_dt = ts_dt.replace(tzinfo=timezone.utc)
        if last_enter_ts is None or ts_dt > last_enter_ts:
            last_enter_ts = ts_dt

    recovered = 0
    if last_enter_ts:
        now = datetime.now(timezone.utc)
        hours = (now - last_enter_ts).total_seconds() // 3600
        recovered = int(hours) * _RECOVERY_PER_HOUR
        recovered = max(0, recovered)

    details["recovered"] = recovered
    score += recovered

    score = max(0, min(100, score))
    return {"user_id": user_id, "score": int(score), "details": details}
