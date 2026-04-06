# Deploy AgentWatch dashboard on Vercel

This repo is a **pnpm monorepo**. The dashboard is `@workspace/agentwatch` under `artifacts/agentwatch/`.

## 1. Connect GitHub

Import the project from [github.com/Harshvardhan4134/AG](https://github.com/Harshvardhan4134/AG) in the [Vercel dashboard](https://vercel.com/new). Vercel reads `vercel.json` at the repo root for install/build/output and SPA rewrites.

## 2. Environment variables (Project → Settings → Environment Variables)

Copy from `artifacts/agentwatch/.env.example` and set **Production** (and Preview if you want):

| Name | Purpose |
|------|---------|
| `VITE_FIREBASE_API_KEY` | Firebase web app API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Optional; storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Optional |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Optional (Analytics) |
| `VITE_API_URL` | Public FastAPI base URL **with no trailing slash** (e.g. `https://api.yourdomain.com`) |

Redeploy after changing env vars.

## 3. Firebase

In [Firebase Console](https://console.firebase.google.com/) → Authentication → Settings → **Authorized domains**, add:

- Your Vercel URL: `your-app.vercel.app`
- Any custom domain you assign

## 4. API CORS

Set `CORS_ORIGINS` on your FastAPI host to include your Vercel origin, e.g. `https://your-app.vercel.app` (comma-separated if multiple).

## 5. Push this repo to GitHub

If `origin` should point at `Harshvardhan4134/AG`:

```bash
git remote set-url origin https://github.com/Harshvardhan4134/AG.git
git push -u origin main
```

Or keep your existing `origin` and add this remote (already added in this clone as `harshvardhan` if you pulled these changes):

```bash
git remote add harshvardhan https://github.com/Harshvardhan4134/AG.git
git push -u harshvardhan main
```

## 6. Local build (sanity check)

From the monorepo root (`pnpm-workspace.yaml`):

```bash
pnpm install --ignore-scripts
pnpm --filter @workspace/agentwatch build
```

Output is `artifacts/agentwatch/dist/public/`.
