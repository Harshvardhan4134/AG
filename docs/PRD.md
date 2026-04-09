# Product Requirements Document: AgentWatch

**Version:** 2.0  
**Last Updated:** April 2026  
**Product:** AgentWatch — zero-config observability, automated quality checks, and AI-powered analysis for LLM agents  
**Status:** In Progress — MVP built; bugfix + SDK hardening; planned feature expansion

---

## Change log from v1.0

| Area | What changed in v2.0 PRD |
|------|--------------------------|
| Scope | Split into **Implemented (MVP)** vs **Planned (MVP+)** so the PRD matches the repo. |
| SDKs | Added explicit **Node `flush()`** requirement and clarified auto-instrument options. |
| API | Added `/v1/analyse-repo` as a **stub** route (501) to reserve the contract. |
| UI | Added `/dashboard/help` placeholder page for the integration assistant. |
| Storage | Confirmed **Firestore** as canonical storage (current implementation). |
| Limits | Kept retention/plan enforcement as **planned** (not implemented yet). |

---

## 1. Executive summary

AgentWatch is a hosted observability and reliability platform for AI agents. It ingests per-step traces (Python and Node.js), runs deterministic rule checks, optionally invokes an LLM “judge” for borderline cases, persists traces/flags per tenant, and exposes a dashboard for monitoring, alerting, and debugging.

**Core promise:** Low friction instrumentation plus fast, explainable detection: every suspicious output is flagged with severity + confidence, and (optionally) a structured explanation using the user’s own provider key.

---

## 2. Problem statement

- **Visibility:** Agent runs are opaque; failures surface only as user complaints or manual log review.
- **Consistency:** Ad-hoc scripts do not scale across services and models.
- **Latency of detection:** Issues are found late; teams need **near-real-time** signals tied to **runs and steps**.
- **Trust in automation:** Heuristics can misfire; operators need confidence scoring and an optional judge for borderline cases.

---

## 3. Goals

| ID | Goal |
|----|------|
| G1 | **Capture** structured traces (input, output, model, latency, tokens, tool calls, provider metadata) from customer agents with minimal integration friction. |
| G2 | **Evaluate** each trace with a **consistent rules engine** and surface **flags** with type, severity, and confidence. |
| G3 | **Optional deep analysis:** When rules are low-confidence, call the customer’s **OpenAI / Anthropic / Groq** API from the AgentWatch API process to produce a structured verdict; do not persist provider keys. |
| G4 | **Notify** users via **email** (Resend) and/or **Slack** (user-supplied webhook) when selected flag types occur, with **one alert per run** to avoid spam. |
| G5 | **Multi-tenant isolation:** Data scoped by **Firebase user** and **API key** (`aw_...`); dashboard uses Firebase Auth; SDK uses bearer key. |
| G6 | **Operability:** Health endpoint, stats, list/detail traces, debug sampling behind a feature flag for support. |
| G7 | **Help Me Wire It (planned):** guided integration assistant in the dashboard. |
| G8 | **GitHub Repo Analyser (planned):** repo scan to produce exact integration steps. |

---

## 4. Non-goals (current scope)

- Replacing customer application hosting or agent orchestration frameworks.
- Guaranteed **online** evaluation of every possible model/provider (focus on **OpenAI-compatible**, **Groq**, **Anthropic** patterns reflected in SDKs).
- Long-term **trace retention SLAs** or compliance certifications (document actual retention policy when defined).
- **End-user** (B2C) authentication — only **developer/operator** accounts via Firebase.

---

## 5. Users and personas

| Persona | Needs |
|---------|--------|
| **Backend engineer** | Drop-in SDK, env-based config, works in short-lived processes (`flush`), Node preload for low-touch setup. |
| **Platform / SRE** | Dashboard for traces, stats, alert routing, API key rotation (up to **5 keys per user**). |
| **Team lead** | High-level health: flagged vs OK, trends, which agents misbehave. |
| **Indie / “vibe coder”** | Minimal setup and wiring guidance (planned: repo analyser). |

---

## 6. Product surface area

### 6.1 Web application (Vite + React)

**Public**

- Landing, sign-in, sign-up, password reset.
- **Documentation** (`/docs`): architecture, install, Python/Node instrumentation, rules, judge, runs, dashboard setup, API reference.

**Authenticated (Firebase ID token)**

- **Dashboard** — overview / stats.
- **Traces** — list (flat rows via `GET /v1/traces?flat=1`) and **run detail** (`/dashboard/traces/:runId`).
- **API keys** — create/list/revoke `aw_...` keys (max 5).
- **Alerts** — configuration UX (email, Slack, flag types, deep analysis toggle as exposed in settings).
- **Settings** — user profile and notification/analysis preferences.
- **Help** (`/dashboard/help`) — placeholder for “Help Me Wire It” and repo analyser (planned).

**Technical:** Client calls AgentWatch API with **`Authorization: Bearer <aw_...>`** for data plane; `VITE_API_URL` must match deployed API; CORS must allow dashboard origin.

### 6.2 Public API (FastAPI)

| Area | Behavior |
|------|----------|
| **Ingestion** | `POST /v1/trace` — accepts `TraceEvent`; assigns `run_id` if empty; persists trace; runs checks; saves flags; optional judge; dispatches alerts once per run. |
| **Read** | `GET /v1/traces`, `GET /v1/traces/{run_id}`, `GET /v1/stats` — scoped by API key’s user. |
| **User** | `POST /v1/user/sync`, `GET/PATCH /v1/user/me` — Firebase JWT. |
| **Keys** | `POST/GET/DELETE /v1/api-keys` — Firebase JWT. |
| **Ops** | `GET /health`; `GET /v1/debug/traces` only if `AGENTWATCH_DEBUG=1`. |
| **Repo analysis (planned)** | `POST /v1/analyse-repo` — currently a 501 stub route reserved for future. |

### 6.3 Client SDKs

- **Python (`agentwatch-io`):** `init`, `watch(client)`, optional `auto_instrument.install()`, `flush`, deep analysis config (judge).
- **Node (`agentwatch-io`):** Preload `agentwatch-io/register` or explicit `init`/`watch`, plus `flush()`.

---

## 7. Functional requirements

### 7.1 Trace model

Each event includes at minimum: `run_id`, `step_index`, `step_type`, `agent_name`, `input`, `output`, `model`, `latency_ms`, `tokens`, `tool_calls`, `provider`, optional Groq timing fields, optional `content_mode` (enables extra content checks server-side), and optional `deep_analysis_config`.

**FR-1** Empty or missing `run_id` on ingest is **replaced** with a new UUID server-side.

**FR-1.1** Input and output are truncated to **2000 characters** server-side before persistence.

### 7.2 Rule checks (`checks.py`)

Rules run after persist; they produce **flag_type**, **severity**, **confidence**, **reason**.

**FR-2** Implemented rule categories (representative): `hallucination` (grounding / invented specifics), `error_swallowed`, `latency_spike` (vs rolling average per agent), `empty_output`, `content_repetition`, `content_too_short`, `prompt_injection_attempt`, `off_topic_output`.

**FR-3** Additional checks gated by **`content_mode`** on the trace when enabled.

### 7.3 LLM judge (deep analysis)

**FR-4** If `deep_analysis_config.enabled` is present on the trace and there are flags with **confidence &lt; 0.85** (`JUDGE_CONFIDENCE_THRESHOLD`), the API may call `run_deep_analysis` using the configured provider/key/model.

**FR-5** High-confidence rule hits can skip the judge; analysis may attach to saved flags per implementation in `main.py`.

### 7.4 Alerts

**FR-6** On flagged traces, `dispatch_alerts` respects user settings: **alert_email**, **slack_webhook**, **alert_flag_types**, and user-level **deep_analysis_enabled** as wired in `alerts` module.

**FR-7** At most **one alert dispatch per run** (`was_alert_sent_for_run` / `mark_alert_sent_for_run`).

### 7.5 API limits

**FR-8** Maximum **5 API keys** per Firebase user (`POST /v1/api-keys` enforces).

---

## 8. Non-functional requirements

| NFR | Description |
|-----|-------------|
| **Security** | Tenant isolation by `user_id`; API key validation on trace and read paths; Firebase verification on user endpoints. |
| **Privacy** | Judge uses customer-supplied provider keys from trace/config paths; avoid logging raw secrets (align with code review). |
| **Availability** | `GET /health` for probes; API suitable for Cloud Run–style deploys. |
| **CORS** | Configurable `CORS_ORIGINS` — production should **not** use `*` with credentialed patterns; dashboard origin should be explicit. |

---

## 9. Data storage (conceptual)

- **Firestore** (via `database.py`): users, API key hashes, traces, flags, alert dedupe markers, aggregates for stats/latency.

---

## 10. Success metrics (suggested)

| Metric | Rationale |
|--------|-----------|
| Traces ingested / day per active tenant | Adoption |
| Flag rate by `flag_type` | Quality signal |
| Time-to-first-trace after signup | Onboarding friction |
| Alert delivery success rate | Reliability of notifications |
| Dashboard weekly active users | Stickiness |

---

## 11. Dependencies

- **Firebase** (Auth + Firestore).
- **Resend** (optional) for email.
- **Customer LLM APIs** for judge (OpenAI / Anthropic / Groq).
- **Hosting:** e.g. Cloud Run (API), Vercel or static host (UI) — see repo deploy docs.

---

## 12. Open questions / roadmap candidates

- Retention limits and export (GDPR-style delete).
- Org/team model beyond single Firebase user.
- Custom rules or user-defined thresholds in UI.
- Webhooks for trace/flag events (not only email/Slack).
- Rate limits and quotas per plan (`plan` field exists as `"hobby"` in code).
- Repo analyser privacy model and caching policy.

---

## 13. Document control

This PRD reflects the **AG** repository as of the date above. Implementation details should remain the source of truth in code (`agentwatch-api`, `agentwatch-sdk`, `agentwatch-js`, `artifacts/agentwatch`).
