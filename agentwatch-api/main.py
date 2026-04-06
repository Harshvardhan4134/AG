"""AgentWatch FastAPI server."""

from __future__ import annotations

import logging
import uuid
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

from alerts import dispatch_alerts
from auth_firebase import verify_firebase_id_token
from checks import run_all_checks
from database import (
    count_api_keys_for_user,
    create_api_key,
    delete_api_key,
    get_avg_latency,
    get_run_detail,
    get_stats,
    get_user_doc,
    get_user_from_key,
    list_api_keys_for_user,
    mark_alert_sent_for_run,
    query_traces_for_user,
    save_flag,
    save_trace,
    update_user_settings,
    upsert_user,
    was_alert_sent_for_run,
)
from deep_analysis import run_deep_analysis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AgentWatch API", version="1.0.0")

_cors = __import__("os").environ.get("CORS_ORIGINS", "*")
_origins = [x.strip() for x in _cors.split(",") if x.strip()] if _cors != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TraceEvent(BaseModel):
    run_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    step_index: int = 0
    step_type: str = "llm_call"
    agent_name: str = "default"
    input: str = ""
    output: str = ""
    model: str = ""
    latency_ms: int = 0
    tokens: int = 0
    tool_calls: list[Any] = Field(default_factory=list)
    deep_analysis_config: dict[str, Any] = Field(default_factory=dict)
    provider: str = "openai"
    groq_prompt_time_ms: Optional[int] = None
    groq_completion_time_ms: Optional[int] = None
    groq_request_id: Optional[str] = None
    content_mode: bool = False


class UserSyncBody(BaseModel):
    email: Optional[str] = None
    display_name: Optional[str] = None


class CreateApiKeyBody(BaseModel):
    name: str = "default"


class UserSettingsBody(BaseModel):
    alert_email: Optional[str] = None
    slack_webhook: Optional[str] = None
    deep_analysis_enabled: Optional[bool] = None
    alert_flag_types: Optional[list[str]] = None
    llm_provider: Optional[str] = None
    display_name: Optional[str] = None


def _minimal_user(user_id: str) -> dict[str, Any]:
    return {
        "user_id": user_id,
        "email": "",
        "plan": "hobby",
        "deep_analysis_enabled": False,
        "alert_email": "",
        "slack_webhook": "",
        "alert_flag_types": [
            "hallucination",
            "error_swallowed",
            "latency_spike",
            "empty_output",
            "content_repetition",
            "content_too_short",
            "prompt_injection_attempt",
            "off_topic_output",
        ],
    }


def _resolve_user(user_id: str) -> dict[str, Any]:
    u = get_user_doc(user_id)
    if u:
        u["user_id"] = user_id
        return u
    return _minimal_user(user_id)


def _get_bearer_key(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing API key")
    return authorization.split(" ", 1)[1].strip()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": "1.0.0"}


def _firebase_uid_from_header(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1].strip()
    decoded = verify_firebase_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    uid = decoded.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return uid


@app.post("/v1/user/sync")
def user_sync(body: UserSyncBody, authorization: str | None = Header(None)) -> dict[str, Any]:
    uid = _firebase_uid_from_header(authorization)
    u = upsert_user(uid, body.email, body.display_name)
    return {"user": u}


@app.get("/v1/user/me")
def user_me(authorization: str | None = Header(None)) -> dict[str, Any]:
    uid = _firebase_uid_from_header(authorization)
    u = _resolve_user(uid)
    return {"user": u}


@app.patch("/v1/user/me")
def user_patch(body: UserSettingsBody, authorization: str | None = Header(None)) -> dict[str, Any]:
    uid = _firebase_uid_from_header(authorization)
    data = body.model_dump(exclude_none=True)
    u = update_user_settings(uid, data)
    return {"user": u}


@app.post("/v1/api-keys")
def create_key(
    body: CreateApiKeyBody,
    authorization: str | None = Header(None),
) -> dict[str, Any]:
    uid = _firebase_uid_from_header(authorization)
    if count_api_keys_for_user(uid) >= 5:
        raise HTTPException(status_code=400, detail="Maximum 5 API keys per user")
    raw, doc = create_api_key(uid, body.name.strip() or "default")
    return {"api_key": raw, "key": doc}


@app.get("/v1/api-keys")
def list_keys(authorization: str | None = Header(None)) -> dict[str, Any]:
    uid = _firebase_uid_from_header(authorization)
    keys = list_api_keys_for_user(uid)
    for k in keys:
        k.pop("key_hash", None)
    return {"keys": keys}


@app.delete("/v1/api-keys/{key_id}")
def remove_key(key_id: str, authorization: str | None = Header(None)) -> dict[str, bool]:
    uid = _firebase_uid_from_header(authorization)
    ok = delete_api_key(uid, key_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Key not found")
    return {"ok": True}


@app.post("/v1/trace")
def post_trace(event: TraceEvent, authorization: str | None = Header(None)) -> Any:
    try:
        aw_key = _get_bearer_key(authorization)
    except HTTPException:
        raise

    try:
        row = get_user_from_key(aw_key)
        if not row:
            raise HTTPException(status_code=401, detail="Invalid API key")
        user_id = row.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid API key")

        user = _resolve_user(str(user_id))

        trace_data: dict[str, Any] = {
            "user_id": user_id,
            "run_id": event.run_id,
            "step_index": event.step_index,
            "step_type": event.step_type,
            "agent_name": event.agent_name,
            "input": event.input,
            "output": event.output,
            "model": event.model,
            "latency_ms": event.latency_ms,
            "tokens": event.tokens,
            "tool_calls": event.tool_calls,
            "status": "ok",
            "provider": event.provider,
            "groq_prompt_time_ms": event.groq_prompt_time_ms,
            "groq_completion_time_ms": event.groq_completion_time_ms,
            "groq_request_id": event.groq_request_id,
            "content_mode": event.content_mode,
        }

        saved_trace = save_trace(trace_data)
        avg_latency = get_avg_latency(str(user_id), event.agent_name)
        flags = run_all_checks(trace_data, avg_latency, content_mode=event.content_mode)

        analysis: dict[str, Any] | None = None
        if flags:
            analysis = run_deep_analysis(trace_data, flags, event.deep_analysis_config)
            for fl in flags:
                flag_data = {
                    "user_id": user_id,
                    "trace_id": saved_trace["id"],
                    "run_id": event.run_id,
                    **fl,
                    "deep_analysis": analysis,
                }
                save_flag(flag_data)

            if not was_alert_sent_for_run(str(user_id), event.run_id):
                dispatch_alerts(user, trace_data, flags, analysis)
                mark_alert_sent_for_run(str(user_id), event.run_id)

        return {
            "trace_id": saved_trace["id"],
            "run_id": event.run_id,
            "status": "flagged" if flags else "ok",
            "flags_count": len(flags),
            "flags": [{"type": f["flag_type"], "severity": f["severity"]} for f in flags],
            "message": "Trace recorded and analysed",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("trace error")
        return {"status": "error", "message": str(e)}


@app.get("/v1/traces")
def list_traces(
    authorization: str | None = Header(None),
    limit: int = 50,
    offset: int = 0,
    status: str | None = None,
) -> Any:
    try:
        aw_key = _get_bearer_key(authorization)
    except HTTPException:
        raise
    row = get_user_from_key(aw_key)
    if not row:
        raise HTTPException(status_code=401, detail="Invalid API key")
    uid = str(row.get("user_id"))
    traces, total = query_traces_for_user(uid, limit=limit, offset=offset, status=status)
    return {"traces": traces, "total": total}


@app.get("/v1/traces/{run_id}")
def get_trace_run(run_id: str, authorization: str | None = Header(None)) -> Any:
    aw_key = _get_bearer_key(authorization)
    row = get_user_from_key(aw_key)
    if not row:
        raise HTTPException(status_code=401, detail="Invalid API key")
    uid = str(row.get("user_id"))
    detail = get_run_detail(uid, run_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Run not found")
    return detail


@app.get("/v1/stats")
def stats(authorization: str | None = Header(None)) -> Any:
    aw_key = _get_bearer_key(authorization)
    row = get_user_from_key(aw_key)
    if not row:
        raise HTTPException(status_code=401, detail="Invalid API key")
    uid = str(row.get("user_id"))
    return get_stats(uid)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
