"""Firebase Admin + Firestore access for AgentWatch."""

from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any

from dotenv import load_dotenv

load_dotenv()

import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    sa_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
    path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if sa_json:
        cred = credentials.Certificate(json.loads(sa_json))
    elif path and os.path.isfile(path):
        cred = credentials.Certificate(path)
    else:
        raise RuntimeError(
            "Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS for Firebase Admin."
        )
    firebase_admin.initialize_app(cred)

db = firestore.client()


def _sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def _serialize_value(v: Any) -> Any:
    if isinstance(v, dict):
        return {k: _serialize_value(x) for k, x in v.items()}
    if isinstance(v, list):
        return [_serialize_value(x) for x in v]
    if isinstance(v, datetime):
        return v.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    if hasattr(v, "isoformat"):
        try:
            s = v.isoformat()
            if isinstance(s, str):
                return s.replace("+00:00", "Z")
        except Exception:
            pass
    if hasattr(v, "seconds") and hasattr(v, "nanoseconds"):
        try:
            dt = datetime.fromtimestamp(
                v.seconds + v.nanoseconds / 1e9, tz=timezone.utc
            )
            return dt.isoformat().replace("+00:00", "Z")
        except Exception:
            pass
    return v


def _doc_to_dict(doc) -> dict[str, Any]:
    data = doc.to_dict() or {}
    out = {k: _serialize_value(v) for k, v in data.items()}
    out["id"] = doc.id
    return out


def get_user_from_key(aw_key: str) -> dict[str, Any] | None:
    digest = _sha256_hex(aw_key)
    q = db.collection("api_keys").where("key_hash", "==", digest).limit(1).stream()
    for doc in q:
        doc.reference.update({"last_used_at": firestore.SERVER_TIMESTAMP})
        return _doc_to_dict(doc)
    return None


def save_trace(trace_data: dict[str, Any]) -> dict[str, Any]:
    data = dict(trace_data)
    if "created_at" not in data:
        data["created_at"] = firestore.SERVER_TIMESTAMP
    ref = db.collection("traces").document()
    ref.set(data)
    snap = ref.get()
    return _doc_to_dict(snap)


def save_flag(flag_data: dict[str, Any]) -> dict[str, Any]:
    data = dict(flag_data)
    if "created_at" not in data:
        data["created_at"] = firestore.SERVER_TIMESTAMP
    ref = db.collection("flags").document()
    ref.set(data)
    tid = flag_data.get("trace_id")
    if tid:
        db.collection("traces").document(tid).update({"status": "flagged"})
    snap = ref.get()
    return _doc_to_dict(snap)


def get_avg_latency(user_id: str, agent_name: str) -> float:
    q = (
        db.collection("traces")
        .where("user_id", "==", user_id)
        .where("agent_name", "==", agent_name)
        .order_by("created_at", direction=firestore.Query.DESCENDING)
        .limit(100)
        .stream()
    )
    latencies: list[float] = []
    for doc in q:
        d = doc.to_dict() or {}
        lm = d.get("latency_ms")
        if isinstance(lm, (int, float)):
            latencies.append(float(lm))
    if len(latencies) < 5:
        return 0.0
    return sum(latencies) / len(latencies)


def get_user_doc(uid: str) -> dict[str, Any] | None:
    snap = db.collection("users").document(uid).get()
    if not snap.exists:
        return None
    return _doc_to_dict(snap)


def upsert_user(uid: str, email: str | None, display_name: str | None = None) -> dict[str, Any]:
    ref = db.collection("users").document(uid)
    snap = ref.get()
    now = firestore.SERVER_TIMESTAMP
    if snap.exists:
        update: dict[str, Any] = {}
        if email:
            update["email"] = email
        if display_name is not None:
            update["display_name"] = display_name
        if update:
            ref.update(update)
    else:
        ref.set(
            {
                "email": email or "",
                "display_name": display_name or "",
                "plan": "hobby",
                "deep_analysis_enabled": False,
                "alert_email": email or "",
                "slack_webhook": "",
                "alert_flag_types": ["hallucination", "error_swallowed", "latency_spike", "empty_output"],
                "created_at": now,
            }
        )
    return _doc_to_dict(ref.get())


def update_user_settings(uid: str, settings: dict[str, Any]) -> dict[str, Any]:
    ref = db.collection("users").document(uid)
    allowed = {
        k: v
        for k, v in settings.items()
        if k
        in (
            "alert_email",
            "slack_webhook",
            "deep_analysis_enabled",
            "alert_flag_types",
            "llm_provider",
            "display_name",
        )
    }
    if not allowed:
        snap = ref.get()
        return _doc_to_dict(snap) if snap.exists else {}
    ref.set(allowed, merge=True)
    return _doc_to_dict(ref.get())


def list_api_keys_for_user(user_id: str) -> list[dict[str, Any]]:
    q = db.collection("api_keys").where("user_id", "==", user_id).stream()
    return [_doc_to_dict(d) for d in q]


def count_api_keys_for_user(user_id: str) -> int:
    return len(list(db.collection("api_keys").where("user_id", "==", user_id).stream()))


def create_api_key(user_id: str, name: str) -> tuple[str, dict[str, Any]]:
    import secrets

    raw = "aw_" + secrets.token_urlsafe(24).replace("-", "")[:32]
    digest = _sha256_hex(raw)
    prefix = raw[:12] if len(raw) >= 12 else raw
    ref = db.collection("api_keys").document()
    ref.set(
        {
            "user_id": user_id,
            "key_hash": digest,
            "key_prefix": prefix,
            "name": name,
            "created_at": firestore.SERVER_TIMESTAMP,
        }
    )
    return raw, _doc_to_dict(ref.get())


def delete_api_key(user_id: str, key_doc_id: str) -> bool:
    ref = db.collection("api_keys").document(key_doc_id)
    snap = ref.get()
    if not snap.exists:
        return False
    if (snap.to_dict() or {}).get("user_id") != user_id:
        return False
    ref.delete()
    return True


def _firestore_created_ts(doc) -> float:
    """Sort key for trace docs (avoids composite index: user_id + order_by created_at)."""
    d = doc.to_dict() or {}
    ca = d.get("created_at")
    if hasattr(ca, "timestamp"):
        try:
            return float(ca.timestamp())
        except Exception:
            pass
    return 0.0


def _sort_key_created_at_value(val: Any) -> float:
    """Stable sort for serialized created_at (ISO string, Timestamp, number)."""
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    if hasattr(val, "timestamp"):
        try:
            return float(val.timestamp())
        except Exception:
            pass
    s = str(val).strip()
    if not s:
        return 0.0
    try:
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        return datetime.fromisoformat(s).timestamp()
    except Exception:
        return 0.0


def query_traces_for_user(
    user_id: str, limit: int = 50, offset: int = 0, status: str | None = None
) -> tuple[list[dict[str, Any]], int]:
    # Only filter by user_id — sort in memory. Firestore composite indexes are easy to miss
    # and would make /v1/traces fail while /v1/stats (no order_by) still works.
    q = db.collection("traces").where("user_id", "==", user_id).stream()
    docs = list(q)
    docs.sort(key=_firestore_created_ts, reverse=True)
    docs = docs[:2000]
    rows = [_doc_to_dict(d) for d in docs]

    by_run: dict[str, list[dict[str, Any]]] = {}
    for r in rows:
        rid_raw = r.get("run_id")
        if rid_raw is None or rid_raw == "":
            rid = str(r.get("id") or "")
        else:
            rid = str(rid_raw).strip()
        by_run.setdefault(rid, []).append(r)

    runs_out: list[dict[str, Any]] = []
    for run_id, steps in by_run.items():
        steps.sort(key=lambda x: int(x.get("step_index") or 0))
        last = steps[-1]
        st = last.get("created_at")
        any_flag = any(s.get("status") == "flagged" for s in steps)
        runs_out.append(
            {
                "run_id": run_id,
                "agent_name": steps[0].get("agent_name") or "default",
                "status": "flagged" if any_flag else "ok",
                "steps": len(steps),
                "latency_ms": int(sum(int(s.get("latency_ms") or 0) for s in steps)),
                "created_at": _serialize_value(st) if st is not None else "",
                "flags": [],
            }
        )

    runs_out.sort(key=lambda x: _sort_key_created_at_value(x.get("created_at")), reverse=True)

    all_run_ids = [r["run_id"] for r in runs_out]
    if all_run_ids:
        fq = db.collection("flags").where("user_id", "==", user_id).stream()
        flags_by_run: dict[str, list[dict[str, Any]]] = {}
        for fd in fq:
            f = _doc_to_dict(fd)
            rid = f.get("run_id")
            if rid and rid in all_run_ids:
                flags_by_run.setdefault(rid, []).append(
                    {"flag_type": f.get("flag_type"), "severity": f.get("severity")}
                )
        for p in runs_out:
            p["flags"] = flags_by_run.get(p["run_id"], [])

    if status:
        runs_out = [r for r in runs_out if r.get("status") == status]

    total = len(runs_out)
    page = runs_out[offset : offset + limit]

    return page, total


def get_run_detail(user_id: str, run_id: str) -> dict[str, Any] | None:
    tq = db.collection("traces").where("user_id", "==", user_id).where("run_id", "==", run_id).stream()
    traces = sorted(
        [_doc_to_dict(d) for d in tq], key=lambda x: int(x.get("step_index") or 0)
    )
    if not traces:
        return None
    fq = db.collection("flags").where("user_id", "==", user_id).where("run_id", "==", run_id).stream()
    flags = [_doc_to_dict(d) for d in fq]
    flags_by_trace: dict[str, list[dict[str, Any]]] = {}
    for f in flags:
        tid = f.get("trace_id")
        if tid:
            flags_by_trace.setdefault(tid, []).append(f)

    steps = []
    for t in traces:
        tid = t.get("id")
        fl = flags_by_trace.get(tid, [])
        step_flags = []
        for flg in fl:
            step_flags.append(
                {
                    "flag_type": flg.get("flag_type"),
                    "severity": flg.get("severity"),
                    "reason": flg.get("reason"),
                    "deep_analysis": flg.get("deep_analysis"),
                }
            )
        status = "flagged" if fl else (t.get("status") or "ok")
        steps.append(
            {
                "id": tid,
                "step_index": int(t.get("step_index") or 0),
                "step_type": t.get("step_type") or "llm_call",
                "input": t.get("input") or "",
                "output": t.get("output") or "",
                "model": t.get("model") or "",
                "latency_ms": int(t.get("latency_ms") or 0),
                "tokens": int(t.get("tokens") or 0),
                "tool_calls": t.get("tool_calls") or [],
                "status": status,
                "flags": step_flags,
            }
        )

    created = traces[0].get("created_at") or ""
    return {
        "run_id": run_id,
        "agent_name": traces[0].get("agent_name") or "default",
        "created_at": created,
        "steps": steps,
        "flags": flags,
    }


def get_stats(user_id: str) -> dict[str, Any]:
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    q = db.collection("traces").where("user_id", "==", user_id).stream()
    total = 0
    flagged = 0
    last24 = 0
    last24_flagged = 0
    for doc in q:
        total += 1
        d = doc.to_dict() or {}
        if d.get("status") == "flagged":
            flagged += 1
        ca = d.get("created_at")
        dt = None
        if hasattr(ca, "timestamp"):
            try:
                dt = datetime.fromtimestamp(ca.timestamp(), tz=timezone.utc)
            except Exception:
                pass
        if dt and dt >= since:
            last24 += 1
            if d.get("status") == "flagged":
                last24_flagged += 1

    fq = db.collection("flags").where("user_id", "==", user_id).stream()
    by_type: dict[str, int] = {}
    flags_24 = 0
    for doc in fq:
        d = doc.to_dict() or {}
        ft = d.get("flag_type") or "unknown"
        by_type[ft] = by_type.get(ft, 0) + 1
        ca = d.get("created_at")
        dt = None
        if hasattr(ca, "timestamp"):
            try:
                dt = datetime.fromtimestamp(ca.timestamp(), tz=timezone.utc)
            except Exception:
                pass
        if dt and dt >= since:
            flags_24 += 1

    return {
        "total_traces": total,
        "flagged_traces": flagged,
        "ok_traces": max(0, total - flagged),
        "flags_today": flags_24,
        "flags_by_type": by_type,
        "last_24h": {"traces": last24, "flagged": last24_flagged},
    }


def was_alert_sent_for_run(user_id: str, run_id: str) -> bool:
    doc_id = f"{user_id}__{run_id}"
    snap = db.collection("alert_dedup").document(doc_id).get()
    return snap.exists


def mark_alert_sent_for_run(user_id: str, run_id: str) -> None:
    doc_id = f"{user_id}__{run_id}"
    db.collection("alert_dedup").document(doc_id).set(
        {"sent_at": firestore.SERVER_TIMESTAMP, "user_id": user_id, "run_id": run_id}
    )
