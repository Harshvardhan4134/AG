# Deploy AgentWatch API to Google Cloud Run

You get **HTTPS** automatically (`https://YOUR-SERVICE-xxxxx.run.app`). Use that URL as **`VITE_API_URL`** on Vercel (no trailing slash).

## One-command deploy (Windows)

1. Install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) and run `gcloud auth login` and `gcloud config set project YOUR_PROJECT_ID`.
2. From the **`agentwatch-api`** directory:

```powershell
.\deploy-cloud-run.ps1 -ServiceAccountJsonPath "C:\path\to\your-service-account.json" -CorsOrigins "https://your-app.vercel.app"
```

Use your real Vercel URL for `-CorsOrigins` (or `"*"` only for testing). The script enables APIs, creates/updates the secret, builds with Cloud Build, and deploys Cloud Run.

## Prerequisites

- Google Cloud project (e.g. **Orbit** / `orbit-958b9`) with billing enabled (Cloud Run has a generous free tier; see [pricing](https://cloud.google.com/run/pricing)).
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud`) installed locally.
- Firebase **service account JSON** (same as local dev): Firebase Console → Project settings → Service accounts → Generate new private key.

## 1. Enable APIs and set project

```bash
gcloud config set project YOUR_PROJECT_ID

gcloud services enable run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com cloudbuild.googleapis.com
```

## 2. Store the Firebase service account in Secret Manager

Do **not** commit the JSON file. One-time:

```bash
# From the directory that contains your downloaded key JSON:
gcloud secrets create agentwatch-firebase-sa --data-file=./your-service-account.json
```

If the secret already exists, add a new version:

```bash
gcloud secrets versions add agentwatch-firebase-sa --data-file=./your-service-account.json
```

## 3. Build and push the container (Artifact Registry)

Pick a region, e.g. `us-central1`.

```bash
export PROJECT_ID=$(gcloud config get-value project)
export REGION=us-central1
export REPO=agentwatch
export IMAGE=agentwatch-api

gcloud artifacts repositories create $REPO --repository-format=docker --location=$REGION 2>/dev/null || true

gcloud builds submit --tag ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE}:latest .
```

Run the `gcloud builds submit` command **from the `agentwatch-api` folder** (where this `Dockerfile` lives).

## 4. Deploy to Cloud Run

Grant the Cloud Run service account access to read the secret:

```bash
export PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')
# Default compute service account (used by Cloud Run unless you use a custom one):
gcloud secrets add-iam-policy-binding agentwatch-firebase-sa \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Deploy:

```bash
gcloud run deploy agentwatch-api \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE}:latest \
  --region $REGION \
  --allow-unauthenticated \
  --set-secrets="FIREBASE_SERVICE_ACCOUNT_JSON=agentwatch-firebase-sa:latest" \
  --set-env-vars="CORS_ORIGINS=https://YOUR-VERCEL-APP.vercel.app"
```

Replace `https://YOUR-VERCEL-APP.vercel.app` with your real dashboard origin (comma-separated if several).  
For a quick test only, you can use `CORS_ORIGINS=*` and tighten later.

Optional env vars (same as `.env.example`):

```text
RESEND_API_KEY=...
RESEND_FROM=AgentWatch <onboarding@resend.dev>
```

Update env on an existing service:

```bash
gcloud run services update agentwatch-api --region $REGION \
  --set-env-vars="CORS_ORIGINS=https://your-app.vercel.app"
```

## 5. Smoke test

```bash
curl -sS "$(gcloud run services describe agentwatch-api --region $REGION --format='value(status.url)')/health"
```

Expect: `{"status":"ok",...}`

## 6. Point the dashboard (Vercel) at the API

In Vercel → your frontend project → **Environment variables**:

- `VITE_API_URL` = `https://agentwatch-api-xxxxx-uc.a.run.app` (your Cloud Run URL, **no trailing slash**)

Redeploy the frontend so the variable is baked into the build.

## 7. Firebase Auth — authorized domains

Firebase Console → Authentication → Settings → **Authorized domains** → add:

- Your Cloud Run host if needed for redirects (usually the Vercel domain matters most for the SPA).
- Your **Vercel** domain (e.g. `your-app.vercel.app`).

## Troubleshooting

| Issue | What to check |
|--------|----------------|
| `Failed to fetch` on Vercel | `VITE_API_URL` matches Cloud Run URL; API `/health` works in browser/curl |
| CORS errors | `CORS_ORIGINS` includes exact Vercel origin (`https://...`) |
| Container crashes on start | Logs: `gcloud run services logs read agentwatch-api --region $REGION` — often missing/invalid `FIREBASE_SERVICE_ACCOUNT_JSON` secret |
| 403 on Secret | IAM binding in step 4 for `secretAccessor` |

## “Connect repository” in Cloud Run UI

You can use **Connect repository** with this repo and set the **build context** to the **`agentwatch-api`** directory and use this **Dockerfile**. The commands above are equivalent to a manual first deploy; later pushes can use Cloud Build triggers if you prefer.
