# AgentWatch API (Firebase + FastAPI)

## Setup

1. Create a Firebase project and enable **Firestore** and **Authentication** (Email/Password and Google as needed).
2. Download a **service account** JSON: Project settings → Service accounts → Generate new private key.
3. Copy `.env.example` to `.env` and set `FIREBASE_SERVICE_ACCOUNT_JSON` to the full JSON on one line, or set `GOOGLE_APPLICATION_CREDENTIALS` to the file path.
4. Deploy Firestore indexes: `firebase deploy --only firestore:indexes` (from a Firebase project that includes `firestore.indexes.json`), or create the composite indexes when the console links appear in error logs.
5. Install and run:

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Endpoints

- `GET /health` — health check
- `POST /v1/trace` — ingest trace (Bearer `aw_...` API key)
- `GET /v1/traces`, `GET /v1/traces/{run_id}`, `GET /v1/stats` — dashboard (Bearer API key)
- `POST /v1/user/sync`, `GET /v1/user/me`, `PATCH /v1/user/me` — Firebase ID token (Bearer JWT)
- `POST /v1/api-keys`, `GET /v1/api-keys`, `DELETE /v1/api-keys/{id}` — manage keys (Firebase ID token)

## Production

- Set `RESEND_API_KEY` and a verified `RESEND_FROM` domain for email alerts.
- Restrict `CORS_ORIGINS` to your dashboard origin(s).
