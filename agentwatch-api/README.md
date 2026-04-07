# AgentWatch API (FastAPI + Firebase)

REST API for ingesting traces, running rule checks, optional LLM judge calls, and serving the dashboard.

## Stack

- **FastAPI** — HTTP API
- **Firestore** — traces, flags, API keys, users
- **Firebase Auth** — dashboard sign-in (JWT for user endpoints)
- **Bearer `aw_...`** — SDK and dashboard data endpoints

## Local setup

1. Create a Firebase project: enable **Firestore** and **Authentication** (e.g. Email/Password, Google).
2. Download a **service account** JSON (Project settings → Service accounts).
3. Copy `.env.example` to `.env` and set either:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` — full JSON as a single line, or  
   - `GOOGLE_APPLICATION_CREDENTIALS` — path to the JSON file.
4. Install and run:

```bash
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Main endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/health` | — | Liveness |
| POST | `/v1/trace` | Bearer `aw_...` | Ingest one trace |
| GET | `/v1/traces` | Bearer `aw_...` | List runs or flat trace rows |
| GET | `/v1/traces?flat=1` | Bearer `aw_...` | One row per trace document (dashboard table) |
| GET | `/v1/traces/{run_id}` | Bearer `aw_...` | Run detail |
| GET | `/v1/stats` | Bearer `aw_...` | Aggregate stats |
| GET | `/v1/debug/traces` | Bearer `aw_...` | Debug sample (only if `AGENTWATCH_DEBUG=1` on server) |
| POST | `/v1/user/sync`, GET/PATCH `/v1/user/me` | Firebase ID token | User profile |
| POST/GET/DELETE | `/v1/api-keys`… | Firebase ID token | Manage `aw_...` keys |

`POST /v1/trace` always assigns a `run_id` if the client sends an empty value.

## Production

- **`CORS_ORIGINS`** — Comma-separated allowed origins (your Vercel dashboard URL). Avoid `*` in production.
- **`RESEND_API_KEY`** + **`RESEND_FROM`** — Email alerts (verified domain).
- **Slack** — User webhook in dashboard settings.

## Deploy (HTTPS)

**[CLOUD_RUN.md](./CLOUD_RUN.md)** — Dockerfile, Artifact Registry, Secret Manager, Cloud Run.

Set **`VITE_API_URL`** on the dashboard build to the Cloud Run base URL (no trailing slash).

## Smoke test (hallucination flag)

With the API running and env vars set:

```bash
cd agentwatch-api
set AGENTWATCH_API_KEY=aw_...
set AGENTWATCH_SERVER_URL=https://your-api...
python test_flag.py
```

Expect `status: flagged` when rules match the payload.
