# AgentWatch — Complete Cursor Build Prompts

> **How to use this file:**
> Open this file in Cursor alongside your code.
> Follow the prompts IN ORDER. Never skip ahead.
> After each prompt, test the output before moving to the next.
> Each prompt is self-contained — Cursor only needs to understand that one file.

---

## BEFORE YOU START — Run these commands first

```bash
# 1. Create project folders
mkdir agentwatch-project
cd agentwatch-project
mkdir agentwatch-sdk
mkdir agentwatch-api
mkdir agentwatch-dashboard

# 2. Set up Python API environment
cd agentwatch-api
python -m venv venv
source venv/bin/activate        # Mac/Linux
# venv\Scripts\activate         # Windows
pip install fastapi uvicorn supabase python-dotenv requests httpx

# 3. Create your .env file in agentwatch-api/
touch .env
```

Add this to your `.env` file (fill in from Supabase dashboard):
```
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_KEY=your-service-role-key
```

---

## SUPABASE SETUP — Do this first (10 minutes, no code)

Go to supabase.com → New project → SQL Editor → paste and run this entire block:

```sql
-- API Keys table
create table api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  key_hash text not null unique,
  key_prefix text not null,
  name text default 'default',
  created_at timestamptz default now(),
  last_used_at timestamptz
);

-- Traces table
create table traces (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  run_id text not null,
  step_index integer default 0,
  step_type text default 'llm_call',
  agent_name text default 'default',
  input text,
  output text,
  model text,
  latency_ms integer,
  tokens integer default 0,
  tool_calls jsonb default '[]',
  status text default 'ok',
  created_at timestamptz default now()
);

-- Flags table
create table flags (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  trace_id uuid references traces(id),
  run_id text not null,
  flag_type text not null,
  severity text not null,
  reason text not null,
  deep_analysis jsonb,
  created_at timestamptz default now()
);

-- Users table (synced from Clerk)
create table users (
  id text primary key,
  email text,
  plan text default 'hobby',
  deep_analysis_enabled boolean default false,
  alert_email text,
  slack_webhook text,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table traces enable row level security;
alter table flags enable row level security;
alter table api_keys enable row level security;

-- Insert a test API key for development
insert into api_keys (user_id, key_hash, key_prefix, name)
values ('dev-user-001', 'dev-test-hash-abc123', 'aw_devt', 'dev key');

-- Insert a test user
insert into users (id, email, plan)
values ('dev-user-001', 'dev@test.com', 'pro');
```

---

---

# PART 1 — API SERVER (agentwatch-api/)

---

## PROMPT 1 — database.py

Open Cursor in the `agentwatch-api/` folder.
Create a new file called `database.py`.
Paste this prompt into Cursor chat:

```
Create a Python file called database.py that sets up a Supabase client for AgentWatch.

Requirements:
1. Import os, load_dotenv, and supabase (from supabase import create_client, Client)
2. Call load_dotenv() at module level
3. Read SUPABASE_URL and SUPABASE_KEY from environment variables
4. Create a global supabase client: `db = create_client(SUPABASE_URL, SUPABASE_KEY)`
5. Write a function `get_user_from_key(aw_key: str) -> dict | None` that:
   - Takes an AgentWatch API key string like "aw_abc123..."
   - Computes SHA-256 hash of the key using hashlib
   - Queries the api_keys table where key_hash matches
   - Returns the full row as a dict, or None if not found
   - Updates last_used_at to now() on successful lookup
6. Write a function `save_trace(trace_data: dict) -> dict` that:
   - Inserts a row into the traces table
   - Returns the inserted row
7. Write a function `save_flag(flag_data: dict) -> dict` that:
   - Inserts a row into the flags table
   - Updates the related trace row status to 'flagged'
   - Returns the inserted flag row
8. Write a function `get_avg_latency(user_id: str, agent_name: str) -> float` that:
   - Queries the last 100 traces for this user_id + agent_name
   - Returns the average latency_ms as a float
   - Returns 0.0 if fewer than 5 traces exist

Use only: os, hashlib, supabase, load_dotenv
No print statements. Raise exceptions on Supabase errors.
```

**Test it works:**
```python
# Run in Python interpreter in agentwatch-api/
from database import get_user_from_key
result = get_user_from_key("aw_devtest123")
print(result)  # Should print None (key doesn't match hash yet)
```

---

## PROMPT 2 — checks.py

Create a new file called `checks.py`.
Paste this prompt into Cursor chat:

```
Create a Python file called checks.py for AgentWatch anomaly detection.
This file has NO imports except json and re (both stdlib).
It must be pure logic — no database calls, no HTTP requests.

Write these 5 functions:

1. `check_hallucination(trace: dict) -> dict | None`
   Logic:
   - Get tool_calls from trace (default empty list)
   - Get output text from trace (default empty string), lowercase it
   - Define action_words = ["approved", "confirmed", "verified", "processed", 
     "completed", "refunded", "scheduled", "booked", "cancelled", "sent",
     "created", "updated", "deleted", "transferred", "paid"]
   - If tool_calls is an empty list AND any action_word appears in the output:
     Return: {"flag_type": "hallucination", "severity": "high",
              "reason": f"Agent claimed an action was completed (detected word: '{matched_word}') but no tool calls were made to verify or execute it"}
   - Otherwise return None

2. `check_error_swallowed(trace: dict) -> dict | None`
   Logic:
   - Get tool_calls list from trace
   - For each tool_call, check if its result/output contains any of:
     "error", "404", "500", "403", "failed", "exception", "timeout", "not found", "unauthorized"
     (all case insensitive)
   - Get agent output text, lowercase
   - Define acknowledgement_words = ["unable", "sorry", "error", "could not", 
     "failed", "issue", "problem", "unfortunately", "cannot", "can't"]
   - If a tool_call had an error AND none of acknowledgement_words appear in output:
     Return: {"flag_type": "error_swallowed", "severity": "high",
              "reason": "A tool call returned an error but the agent continued without acknowledging the failure"}
   - Otherwise return None

3. `check_latency_spike(trace: dict, avg_latency: float) -> dict | None`
   Logic:
   - If avg_latency is 0 or less than 5: return None (not enough data)
   - Get latency_ms from trace (default 0)
   - If latency_ms > avg_latency * 3.0:
     Return: {"flag_type": "latency_spike", "severity": "medium",
              "reason": f"Step took {latency_ms}ms which is {round(latency_ms/avg_latency, 1)}x longer than the average {round(avg_latency)}ms for this agent"}
   - Otherwise return None

4. `check_empty_output(trace: dict) -> dict | None`
   Logic:
   - Get output from trace, strip whitespace
   - If output is empty string or None:
     Return: {"flag_type": "empty_output", "severity": "medium",
              "reason": "Agent produced an empty output — the LLM call may have failed or returned nothing"}
   - Otherwise return None

5. `run_all_checks(trace: dict, avg_latency: float = 0.0) -> list[dict]`
   Logic:
   - Runs all 4 checks above
   - Collects results that are not None into a list
   - Returns the list (empty list means no issues found)
   - Never raises exceptions — wrap each check in try/except and skip on error

Include a simple test at the bottom inside `if __name__ == "__main__":` that tests each check with a sample trace dict and prints results.
```

**Test it works:**
```bash
cd agentwatch-api
python checks.py
# Should print test results for each check
```

---

## PROMPT 3 — deep_analysis.py

Create a new file called `deep_analysis.py`.
Paste this prompt into Cursor chat:

```
Create a Python file called deep_analysis.py for AgentWatch.
This runs an LLM judge on flagged traces using the USER'S OWN API key.
CRITICAL: The user's API key must NEVER be logged, printed, or stored anywhere.

Imports needed: json, os, hashlib, typing (Optional)
Optional imports (wrapped in try/except): openai, anthropic

Write these functions:

1. `build_judge_prompt(trace: dict, flags: list) -> tuple[str, str]`
   Returns (system_prompt, user_message) tuple.
   
   system_prompt = """You are an expert AI agent reliability engineer.
You will analyse a single step from an AI agent's execution trace.
Your job is to identify what went wrong and explain it clearly.

Respond ONLY with valid JSON — no markdown, no explanation outside the JSON.
Use exactly this structure:
{
  "verdict": "hallucination" | "error_ignored" | "bad_reasoning" | "prompt_issue" | "ok",
  "confidence": <float 0.0 to 1.0>,
  "what_went_wrong": "<1-2 sentences: what specifically the agent did wrong>",
  "root_cause": "<1 sentence: why this likely happened>",
  "suggested_fix": "<1 sentence: what the developer should change>",
  "severity": "low" | "medium" | "high"
}

If the agent behaved correctly, verdict = "ok", confidence >= 0.85.
Be specific. Reference actual values from the trace. Be concise."""

   user_message = build from trace dict:
   - "Agent's task (input): " + first 600 chars of trace.get("input", "")
   - "\nAgent's response (output): " + first 600 chars of trace.get("output", "")  
   - "\nTool calls made: " + json.dumps of trace.get("tool_calls", [])[:3] limited to 300 chars
   - "\nRule-based flags triggered: " + json.dumps of flags
   - "\nAgent name: " + trace.get("agent_name", "unknown")

2. `analyse_with_openai(trace: dict, flags: list, api_key: str, model: str = "gpt-4o-mini") -> dict`
   - Import openai inside the function (not at top level)
   - Create client = openai.OpenAI(api_key=api_key)
   - Build system_prompt, user_message from build_judge_prompt()
   - Call client.chat.completions.create() with:
     model=model, max_tokens=350, temperature=0,
     messages=[{"role": "system", "content": system_prompt},
               {"role": "user", "content": user_message}]
   - Parse response.choices[0].message.content as JSON
   - Return the parsed dict
   - On any exception: return {"verdict": "analysis_failed", "confidence": 0, 
     "what_went_wrong": "Deep analysis encountered an error", 
     "root_cause": "Unknown", "suggested_fix": "Check your API key and try again", "severity": "low"}

3. `analyse_with_anthropic(trace: dict, flags: list, api_key: str, model: str = "claude-haiku-20240307") -> dict`
   - Same structure but uses anthropic.Anthropic(api_key=api_key)
   - Use client.messages.create() with max_tokens=350, temperature=0
   - Parse the response.content[0].text as JSON
   - Same error handling as above

4. `run_deep_analysis(trace: dict, flags: list, config: dict) -> dict | None`
   Main entry point. config dict has keys:
   - "enabled": bool (if False, return None immediately)
   - "provider": "openai" | "anthropic"  
   - "api_key": str (their LLM key)
   - "model": str (optional, has sensible defaults)
   
   Logic:
   - If not config.get("enabled"): return None
   - If not config.get("api_key"): return None
   - If len(flags) == 0: return None (only run on flagged traces)
   - Based on provider, call the appropriate analyse function
   - Return the result dict
   - NEVER log config["api_key"] anywhere

5. `format_analysis_for_alert(analysis: dict | None) -> str`
   - If analysis is None or verdict is "ok" or "analysis_failed": return ""
   - Returns a formatted string for email/Slack alerts:
     "\n\n🔍 Deep Analysis:\n"
     + f"What went wrong: {analysis.get('what_went_wrong', '')}\n"
     + f"Root cause: {analysis.get('root_cause', '')}\n"  
     + f"Suggested fix: {analysis.get('suggested_fix', '')}\n"
     + f"Confidence: {int(analysis.get('confidence', 0) * 100)}%"

No test block needed. This file is tested via main.py integration.
```

---

## PROMPT 4 — alerts.py

Create a new file called `alerts.py`.
Paste this prompt into Cursor chat:

```
Create a Python file called alerts.py for AgentWatch.
It sends email and Slack alerts when a trace is flagged.

Imports: os, json, requests (for Slack), load_dotenv
Optional: resend (pip install resend) — wrap import in try/except

Write these functions:

1. `send_slack_alert(webhook_url: str, trace: dict, flags: list, analysis_text: str = "") -> bool`
   - If webhook_url is empty or None: return False
   - Build a Slack message payload:
     {
       "text": f"🚨 AgentWatch: Agent flagged in production",
       "blocks": [
         {"type": "header", "text": {"type": "plain_text", "text": "🚨 Agent Flagged"}},
         {"type": "section", "fields": [
           {"type": "mrkdwn", "text": f"*Agent:* {trace.get('agent_name', 'unknown')}"},
           {"type": "mrkdwn", "text": f"*Run ID:* {trace.get('run_id', '')[:12]}..."},
           {"type": "mrkdwn", "text": f"*Severity:* {flags[0].get('severity', 'unknown').upper()}"},
           {"type": "mrkdwn", "text": f"*Issues:* {len(flags)} flag(s)"}
         ]},
         {"type": "section", "text": {"type": "mrkdwn", 
           "text": f"*Issue:* {flags[0].get('reason', '')}"}},
       ]
     }
   - If analysis_text is not empty, add another section block with the analysis
   - POST this payload to webhook_url with 5 second timeout
   - Return True if status 200, False otherwise
   - Never raise exceptions — return False on any error

2. `send_email_alert(to_email: str, trace: dict, flags: list, analysis_text: str = "") -> bool`
   - If to_email is empty or None: return False
   - Try to import resend — if not available, return False
   - Get RESEND_API_KEY from environment variable — if missing, return False
   - resend.api_key = RESEND_API_KEY
   - Build HTML email body:
     Subject: f"[AgentWatch] 🚨 Agent flagged: {trace.get('agent_name', 'unknown')}"
     HTML body with:
     - Header: "Agent Flagged in Production"
     - Table showing: Agent name, Run ID, Time, Step, Severity
     - For each flag: flag type and reason in a red-bordered box
     - If analysis_text exists: show it in a purple-bordered box labelled "Deep Analysis"
     - Footer: "AgentWatch — production reliability for AI agents"
   - Call resend.Emails.send() with from="alerts@agentwatch.io", to=[to_email]
   - Return True on success, False on any error

3. `dispatch_alerts(user: dict, trace: dict, flags: list, analysis: dict | None) -> None`
   - This is the main function called after flagging
   - Import format_analysis_for_alert from deep_analysis
   - analysis_text = format_analysis_for_alert(analysis)
   - If user.get("slack_webhook"): call send_slack_alert()
   - If user.get("alert_email"): call send_email_alert()
   - Never raise exceptions — log errors silently
```

---

## PROMPT 5 — main.py (the FastAPI server)

Create a new file called `main.py`.
This is the main API server — the most important file.
Paste this prompt into Cursor chat:

```
Create a FastAPI application in main.py for AgentWatch — an AI agent monitoring platform.

Imports needed:
from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os, json, uuid
from dotenv import load_dotenv

Also import from our local files:
from database import get_user_from_key, save_trace, save_flag, get_avg_latency
from checks import run_all_checks
from deep_analysis import run_deep_analysis
from alerts import dispatch_alerts

load_dotenv()
app = FastAPI(title="AgentWatch API", version="1.0.0")

Add CORS middleware allowing all origins (we will restrict later):
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

Create a Pydantic model TraceEvent with these optional fields (all Optional with defaults):
- run_id: str (default: generate new uuid4)
- step_index: int = 0
- step_type: str = "llm_call"  
- agent_name: str = "default"
- input: str = ""
- output: str = ""
- model: str = ""
- latency_ms: int = 0
- tokens: int = 0
- tool_calls: list = []
- deep_analysis_config: dict = {}

Write these endpoints:

1. GET /health
   Returns: {"status": "ok", "version": "1.0.0"}

2. POST /v1/trace
   Header: Authorization: Bearer aw_xxxxx
   Body: TraceEvent model
   
   Full logic:
   a) Extract the aw_key from Authorization header (strip "Bearer ")
      If no header: raise HTTPException(401, "Missing API key")
   
   b) Call get_user_from_key(aw_key) 
      If None: raise HTTPException(401, "Invalid API key")
      This returns a dict with user_id
   
   c) Get user_id from the api_keys row
      Query users table for this user_id to get full user config
      (If user not in users table, create a minimal user dict with user_id)
   
   d) Build trace_data dict:
      {
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
        "status": "ok"
      }
   
   e) Save trace to database: saved_trace = save_trace(trace_data)
   
   f) Get average latency: avg_latency = get_avg_latency(user_id, event.agent_name)
   
   g) Run anomaly checks: flags = run_all_checks(trace_data, avg_latency)
   
   h) If flags list is not empty:
      - Run deep analysis if configured:
        analysis = run_deep_analysis(trace_data, flags, event.deep_analysis_config)
      - For each flag in flags:
        flag_data = {
          "user_id": user_id,
          "trace_id": saved_trace["id"],
          "run_id": event.run_id,
          **flag,  (spreads flag_type, severity, reason)
          "deep_analysis": analysis
        }
        save_flag(flag_data)
      - Dispatch alerts: dispatch_alerts(user, trace_data, flags, analysis)
   
   i) Return response:
      {
        "trace_id": saved_trace["id"],
        "run_id": event.run_id,
        "status": "flagged" if flags else "ok",
        "flags_count": len(flags),
        "flags": [{"type": f["flag_type"], "severity": f["severity"]} for f in flags],
        "message": "Trace recorded and analysed"
      }

3. GET /v1/traces
   Header: Authorization: Bearer aw_xxxxx
   Query params: limit=50, offset=0, status=None (optional filter)
   
   - Validate key, get user_id
   - Query traces table filtered by user_id, ordered by created_at desc
   - Apply status filter if provided
   - Return {"traces": [...], "total": count}

4. GET /v1/traces/{run_id}
   Header: Authorization: Bearer aw_xxxxx
   
   - Validate key, get user_id
   - Query all traces with this run_id AND user_id
   - Query all flags with this run_id AND user_id
   - Return {"run_id": run_id, "steps": [...traces], "flags": [...flags]}

5. GET /v1/stats
   Header: Authorization: Bearer aw_xxxxx
   
   - Validate key, get user_id
   - Return counts: total traces, flagged traces, flags by type
   - Return last 24h stats separately

Wrap the entire trace processing logic (steps d-i) in a try/except.
On any unexpected error: still return 200 with {"status": "error", "message": str(e)}
Never return 500 — the SDK must never crash the user's agent.

Add this at the bottom:
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
```

**Test it works:**
```bash
cd agentwatch-api
python main.py
# Server starts on http://localhost:8000

# In another terminal, test with curl:
curl -X POST http://localhost:8000/v1/trace \
  -H "Authorization: Bearer aw_devtest123" \
  -H "Content-Type: application/json" \
  -d '{
    "run_id": "test-run-001",
    "agent_name": "my-support-bot",
    "input": "Customer says: where is my refund?",
    "output": "Your refund has been approved and processed successfully.",
    "model": "gpt-4o",
    "latency_ms": 920,
    "tool_calls": []
  }'

# Expected response: status "flagged", flag_type "hallucination"
```

---

## PROMPT 6 — requirements.txt + Procfile (deploy to Railway)

Create these two files:

**requirements.txt:**
```
fastapi==0.115.0
uvicorn==0.30.6
supabase==2.7.4
python-dotenv==1.0.1
requests==2.32.3
httpx==0.27.2
pydantic==2.8.2
resend==2.3.0
openai==1.40.0
anthropic==0.34.0
```

**Procfile (no file extension):**
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

**To deploy:**
```bash
cd agentwatch-api
git init
git add .
git commit -m "initial agentwatch api"
# Push to GitHub, then connect repo in Railway dashboard
# Set env vars in Railway: SUPABASE_URL, SUPABASE_KEY, RESEND_API_KEY
```

---

---

# PART 2 — PYTHON SDK (agentwatch-sdk/)

---

## PROMPT 7 — interceptor.py (SDK core)

Open Cursor in `agentwatch-sdk/` folder.
Create file `interceptor.py`.
Paste this prompt:

```
Create a Python file called interceptor.py for the AgentWatch SDK.
This is the most critical file — it silently wraps LLM API calls to record them.

Imports: time, uuid, typing (Callable, Any)

Write these functions:

1. `wrap_openai_client(client: Any, on_trace: Callable[[dict], None]) -> Any`
   
   This function monkey-patches an openai.OpenAI() client instance.
   
   Logic:
   - Store original method: original_create = client.chat.completions.create
   - Define wrapper function `patched_create(*args, **kwargs) -> Any`:
     a) Record start time: start = time.time()
     b) Generate run_id if not in kwargs: run_id = kwargs.pop("aw_run_id", str(uuid.uuid4()))
     c) Extract agent_name: agent_name = kwargs.pop("aw_agent_name", "default")
     d) Call original: response = original_create(*args, **kwargs)
     e) Calculate latency: latency_ms = int((time.time() - start) * 1000)
     f) Extract data from response:
        - input_text = str(kwargs.get("messages", []))
        - output_text = response.choices[0].message.content if response.choices else ""
        - model = response.model or kwargs.get("model", "")
        - tokens = response.usage.total_tokens if response.usage else 0
        - finish_reason = response.choices[0].finish_reason if response.choices else ""
     g) Build trace dict:
        {
          "run_id": run_id,
          "agent_name": agent_name,
          "input": input_text[:2000],  # cap at 2000 chars
          "output": output_text[:2000],
          "model": model,
          "latency_ms": latency_ms,
          "tokens": tokens,
          "tool_calls": [],
          "step_type": "llm_call"
        }
     h) Call on_trace(trace) — this is non-blocking (sender handles threading)
     i) Return original response unchanged
   - Replace method: client.chat.completions.create = patched_create
   - Return the modified client

2. `wrap_anthropic_client(client: Any, on_trace: Callable[[dict], None]) -> Any`
   
   Same concept but for anthropic.Anthropic() client.
   - Wrap client.messages.create
   - Extract: input from messages list, output from response.content[0].text
   - tokens from response.usage.input_tokens + output_tokens
   - model from response.model
   - Same trace dict structure
   - Return modified client

3. `extract_tool_calls(response: Any) -> list`
   Helper that extracts tool calls from an OpenAI response:
   - If response.choices[0].message.tool_calls is not None:
     Return list of {name, arguments} dicts for each tool call
   - Otherwise return empty list

No external imports. Never raise exceptions — wrap everything in try/except and return empty/original on failure.
```

---

## PROMPT 8 — sender.py (SDK)

Create file `sender.py` in agentwatch-sdk/.
Paste this prompt:

```
Create a Python file called sender.py for the AgentWatch SDK.
This sends captured trace data to the AgentWatch server in the background.

Imports: threading, requests, json, time

Write these functions:

1. `send_trace_async(trace_data: dict, aw_key: str, server_url: str, deep_config: dict = {}) -> None`
   
   This sends a trace to the AgentWatch server in a background thread.
   The calling code must never block or crash because of this.
   
   Inner function `_do_send()`:
   - Build the payload: {**trace_data, "deep_analysis_config": deep_config}
   - Make POST request to f"{server_url}/v1/trace" with:
     headers={"Authorization": f"Bearer {aw_key}", "Content-Type": "application/json"}
     json=payload
     timeout=5
   - If request fails for any reason: silently ignore (no raise, no print)
   - If response status is not 200: silently ignore
   
   Main function:
   - Create thread = threading.Thread(target=_do_send, daemon=True)
   - thread.start()
   - Return immediately (non-blocking)

2. `validate_connection(aw_key: str, server_url: str) -> bool`
   
   Tests if the AgentWatch server is reachable and the key is valid.
   - Make GET request to f"{server_url}/health" with 3 second timeout
   - If status 200: return True
   - On any error: return False
   - Used during agentwatch.init() to give early feedback

Never import openai or anthropic here. This file has no knowledge of LLMs.
No print statements. No logging. Silent by design.
```

---

## PROMPT 9 — redactor.py (SDK)

Create file `redactor.py` in agentwatch-sdk/.
Paste this prompt:

```
Create a Python file called redactor.py for the AgentWatch SDK.
This handles optional PII redaction before sending traces.

Imports: re, json, hashlib

Write these functions:

1. `redact_text(text: str, fields_to_redact: list[str]) -> str`
   
   Replaces sensitive patterns in text with redacted placeholders.
   
   Always redact these patterns (regardless of fields_to_redact):
   - Email addresses: replace with "[EMAIL_REDACTED]"
     Pattern: r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
   - Phone numbers (basic): replace with "[PHONE_REDACTED]"  
     Pattern: r'\b\d{10,12}\b'
   - Credit card numbers: replace with "[CARD_REDACTED]"
     Pattern: r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b'
   
   For fields in fields_to_redact (user-specified field names):
   - Search for the pattern: r'f"{field_name}["\']?\s*[:=]\s*["\']?([^"\',\s}]+)'
   - Replace matched values with f"[{field_name.upper()}_REDACTED]"
   
   Return the redacted text string.

2. `redact_trace(trace: dict, fields_to_redact: list[str] = []) -> dict`
   
   Creates a copy of the trace dict with sensitive data redacted.
   - Make a shallow copy of trace
   - Redact trace["input"] using redact_text()
   - Redact trace["output"] using redact_text()
   - For tool_calls: convert to string, redact, convert back
     (just redact the JSON string representation)
   - Return the redacted copy
   - Never modify the original trace dict

3. `hash_value(value: str) -> str`
   - Returns SHA-256 hash of value as hex string
   - Used when developer wants to track a field without exposing its value

Return redacted copies always — never mutate originals.
No external imports.
```

---

## PROMPT 10 — __init__.py (SDK public API)

Create file `__init__.py` in agentwatch-sdk/.
This is what developers `import agentwatch` and call `agentwatch.init()`.
Paste this prompt:

```
Create __init__.py for the AgentWatch Python SDK package.
This is the developer-facing API. It must be simple, clean, and hard to misuse.

Imports at top:
import os
from typing import Optional

Write a module-level state dict:
_state = {
    "initialized": False,
    "aw_key": None,
    "server_url": None,
    "deep_config": {},
    "redact_fields": [],
    "patched_clients": []
}

Write this main function:

def init(
    api_key: str,
    server_url: str = "https://api.agentwatch.io",
    deep_analysis: bool = False,
    llm_provider: str = "openai",
    llm_api_key: str = "",
    llm_model: str = "",
    redact_fields: list = [],
    agent_name: str = "default",
    silent: bool = False
) -> None:
    """
    Initialize AgentWatch monitoring.
    
    Args:
        api_key: Your AgentWatch API key (from dashboard)
        server_url: AgentWatch server URL (default: production)
        deep_analysis: Enable AI-powered deep analysis of flagged traces
        llm_provider: "openai" or "anthropic" (for deep analysis)
        llm_api_key: Your LLM API key (stays on your machine, never sent to us)
        llm_model: Model to use for analysis (default: gpt-4o-mini or claude-haiku)
        redact_fields: List of field names to redact before analysis
        agent_name: Name for this agent (shown in dashboard)
        silent: If True, suppress all console output
    """
    
    from sender import validate_connection
    from interceptor import wrap_openai_client, wrap_anthropic_client
    from redactor import redact_trace
    from sender import send_trace_async
    
    # Store config
    _state["aw_key"] = api_key
    _state["server_url"] = server_url
    _state["redact_fields"] = redact_fields
    _state["initialized"] = True
    
    # Set default models if not specified
    default_models = {"openai": "gpt-4o-mini", "anthropic": "claude-haiku-20240307"}
    actual_model = llm_model or default_models.get(llm_provider, "gpt-4o-mini")
    
    if deep_analysis and llm_api_key:
        _state["deep_config"] = {
            "enabled": True,
            "provider": llm_provider,
            "api_key": llm_api_key,
            "model": actual_model
        }
    
    # Test connection
    if not silent:
        is_connected = validate_connection(api_key, server_url)
        if is_connected:
            print(f"✓ AgentWatch connected. Monitoring agent: '{agent_name}'")
            if deep_analysis and llm_api_key:
                print(f"✓ Deep analysis enabled ({llm_provider} / {actual_model})")
        else:
            print(f"⚠ AgentWatch: Could not connect to {server_url}. Traces will be dropped.")
    
    # Define the callback that runs after every LLM call
    def on_trace(trace_data: dict):
        # Add agent name
        trace_data["agent_name"] = agent_name
        # Redact if configured
        if redact_fields:
            trace_data = redact_trace(trace_data, redact_fields)
        # Send async (non-blocking)
        send_trace_async(trace_data, api_key, server_url, _state["deep_config"])
    
    # Auto-patch openai if it's importable
    try:
        import openai
        # Patch the module-level client if it exists
        if hasattr(openai, '_default_client') and openai._default_client:
            wrap_openai_client(openai._default_client, on_trace)
        # Store callback for patching new clients
        _state["openai_callback"] = on_trace
    except ImportError:
        pass
    
    # Auto-patch anthropic if it's importable
    try:
        import anthropic
        _state["anthropic_callback"] = on_trace
    except ImportError:
        pass
    
    # Store callback for manual patching
    _state["on_trace"] = on_trace

def watch(client: any) -> any:
    """
    Manually wrap an LLM client for monitoring.
    
    Usage:
        import openai
        import agentwatch
        agentwatch.init(api_key="aw_...")
        client = agentwatch.watch(openai.OpenAI())
    """
    if not _state["initialized"]:
        raise RuntimeError("Call agentwatch.init() before agentwatch.watch()")
    
    from interceptor import wrap_openai_client, wrap_anthropic_client
    
    client_type = type(client).__name__
    on_trace = _state.get("on_trace")
    
    if not on_trace:
        return client
    
    if "OpenAI" in client_type:
        return wrap_openai_client(client, on_trace)
    elif "Anthropic" in client_type:
        return wrap_anthropic_client(client, on_trace)
    else:
        # Unknown client — return unchanged with warning
        print(f"⚠ AgentWatch: Unknown client type '{client_type}'. Manual instrumentation required.")
        return client

Add module docstring at top explaining the two usage patterns:
Pattern 1 (auto): agentwatch.init() then use any openai.OpenAI() normally
Pattern 2 (manual): client = agentwatch.watch(openai.OpenAI())
```

---

---

# PART 3 — DASHBOARD (agentwatch-dashboard/)

---

## PROMPT 11 — Next.js project setup

Run these commands first:
```bash
cd agentwatch-dashboard
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
npm install @clerk/nextjs @supabase/supabase-js
```

Create `.env.local`:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## PROMPT 12 — layout.tsx + auth setup

Open Cursor in `agentwatch-dashboard/`.
Open file `app/layout.tsx`.
Paste this prompt:

```
Update app/layout.tsx for AgentWatch dashboard with Clerk authentication.

Requirements:
1. Import ClerkProvider from @clerk/nextjs
2. Wrap the entire app in ClerkProvider
3. Set up dark theme: html has class="dark", body has bg-gray-950 text-white min-h-screen
4. Import Inter font from next/font/google
5. Title: "AgentWatch — Agent Monitoring"
6. Add a sidebar navigation component inline (not a separate file yet):
   - Fixed left sidebar, 240px wide, bg-gray-900, border-r border-gray-800
   - Logo at top: "AgentWatch" in purple text (text-purple-400) with a small shield icon (use text emoji 🛡)
   - Nav links: Dashboard (/dashboard), Traces (/dashboard/traces), Alerts (/dashboard/alerts), API Keys (/dashboard/keys)
   - Each nav link: flex items-center gap-2, text-gray-400 hover:text-white, p-3 rounded-lg hover:bg-gray-800
   - Use Next.js <Link> component
   - Bottom of sidebar: UserButton from @clerk/nextjs (shows user avatar + sign out)
7. Main content area: ml-60 (offset for sidebar), p-8, min-h-screen
8. Show sidebar only if user is signed in (use auth() from @clerk/nextjs/server or SignedIn component)

Keep it clean and dark. Purple accent colour: #9333ea (purple-600) or #a855f7 (purple-500).
```

---

## PROMPT 13 — app/page.tsx (redirect handler)

Create `app/page.tsx`:

```
Create app/page.tsx for AgentWatch.
Simple redirect logic:
- If user is signed in (use auth() from @clerk/nextjs/server): redirect to /dashboard
- If not signed in: show a landing page with:
  - Full screen dark background (bg-gray-950)
  - Centered content
  - Logo: "🛡 AgentWatch" in large white text (text-5xl font-bold)
  - Tagline: "Production reliability for AI agents" in gray
  - Two buttons: "Sign In" and "Sign Up" using Clerk's SignInButton and SignUpButton components
  - Small text below: "Monitor, detect, recover — automatically"
Use Clerk's SignedIn/SignedOut components to conditionally render.
```

---

## PROMPT 14 — app/dashboard/page.tsx (main dashboard)

Create `app/dashboard/page.tsx`:

```
Create the main AgentWatch dashboard page at app/dashboard/page.tsx.

This page shows the user's trace overview and recent runs.
It fetches data from our FastAPI backend using the user's AgentWatch API key.

For now, use mock data (we'll connect real API later):
const mockStats = {
  total_traces: 1247,
  flagged_traces: 23,
  ok_traces: 1224,
  flags_today: 5
}
const mockRecentRuns = [
  {run_id: "run_8f3a", agent_name: "support-bot", status: "flagged", steps: 3, latency_ms: 2100, created_at: "2026-04-05T10:22:01Z", flags: [{flag_type: "hallucination", severity: "high"}]},
  {run_id: "run_3e9c", agent_name: "support-bot", status: "ok", steps: 5, latency_ms: 1840, created_at: "2026-04-05T10:19:44Z", flags: []},
  {run_id: "run_2b1d", agent_name: "email-agent", status: "flagged", steps: 2, latency_ms: 320, created_at: "2026-04-05T10:17:12Z", flags: [{flag_type: "error_swallowed", severity: "high"}]},
  {run_id: "run_1a8f", agent_name: "email-agent", status: "ok", steps: 6, latency_ms: 990, created_at: "2026-04-05T10:14:55Z", flags: []},
]

Layout:
1. Page header: "Dashboard" h1, subtitle: "Overview of your agent health"

2. Stats row — 4 cards side by side (grid grid-cols-4 gap-4):
   - Total Traces: big number, bg-gray-900 border border-gray-800 rounded-xl p-6
   - Flagged: number in red (text-red-400) 
   - Healthy: number in green (text-green-400)
   - Flags Today: number in amber (text-amber-400)

3. Recent Runs table:
   - Title: "Recent Agent Runs"
   - Table with columns: Status, Run ID, Agent, Steps, Duration, Time, Flags
   - Status: green dot for ok, red dot for flagged (w-2 h-2 rounded-full inline-block)
   - Run ID: monospace font, first 12 chars + "..."
   - Flags: show badge with flag type if flagged, else "-"
   - Each row: hover:bg-gray-800 cursor-pointer (will navigate to detail)
   - Table styling: bg-gray-900 rounded-xl border border-gray-800, th text-gray-400 text-sm

4. Add a "Add to your agent" code snippet section at bottom:
   - Show install command and 2-line init code in a dark code block (bg-gray-950 border border-gray-800 rounded-lg p-4 font-mono text-sm)
   - "Copy" button that copies to clipboard

Full dark theme throughout. Purple accents for important elements.
Make it a client component ("use client") for now.
```

---

## PROMPT 15 — app/dashboard/traces/[run_id]/page.tsx (trace detail)

```
Create the trace detail page at app/dashboard/traces/[run_id]/page.tsx.

This shows a single agent run in full detail.

Use this mock data (we'll connect real API later):
const mockTrace = {
  run_id: "run_8f3a",
  agent_name: "support-bot",
  created_at: "2026-04-05T10:22:01Z",
  steps: [
    {
      id: "step-1", step_index: 1, step_type: "llm_call",
      input: "Customer message: Where is my refund? Order #4521",
      output: "Your refund of ₹450 has been approved and will be processed within 2-3 business days.",
      model: "gpt-4o", latency_ms: 920, tokens: 312, tool_calls: [],
      status: "flagged",
      flags: [{flag_type: "hallucination", severity: "high", 
               reason: "Agent claimed refund was approved but no tool call was made to verify",
               deep_analysis: {verdict: "hallucination", confidence: 0.92,
                 what_went_wrong: "The agent told the customer their refund was approved with a specific amount (₹450), but no get_refund_status or similar tool was called to verify this.",
                 root_cause: "The system prompt likely instructs the agent to be helpful and resolving, causing it to fabricate confirmations.",
                 suggested_fix: "Add to system prompt: Only confirm actions that are explicitly verified by a tool call response.",
                 severity: "high"}}]
    },
    {
      id: "step-2", step_index: 2, step_type: "tool_call",
      input: "get_order_status({order_id: '4521'})",
      output: '{"status": "processing", "refund_status": "not_requested"}',
      model: "", latency_ms: 340, tokens: 0, tool_calls: [{name: "get_order_status", result: "processing"}],
      status: "ok", flags: []
    },
    {
      id: "step-3", step_index: 3, step_type: "llm_call",
      input: "Tool result: order processing, no refund. Respond to customer.",
      output: "I've checked your order status. Your order is currently being processed.",
      model: "gpt-4o", latency_ms: 840, tokens: 198, tool_calls: [],
      status: "ok", flags: []
    }
  ]
}

Layout:
1. Back button: "← Back to Dashboard" link

2. Run header card:
   - Run ID (monospace), Agent name, Time, Total steps, Total duration
   - Status badge: "FLAGGED" in red pill or "OK" in green pill

3. Steps timeline — vertical list:
   For each step:
   - Step number badge (circle with number)
   - Step type label (LLM Call / Tool Call)
   - Latency badge
   - Status indicator
   
   If step is FLAGGED:
   - Wrap entire step in red-bordered card (border-red-500/30 bg-red-950/20)
   - Show flag badge with type
   - Show flag reason in red text
   - If deep_analysis exists: show in purple-bordered box:
     Title: "🔍 Deep Analysis (AI-powered)"
     Fields: What went wrong, Root cause, Suggested fix, Confidence %
   
   Expandable section for each step (click to expand):
   - Input label + full input text (bg-gray-950 rounded p-3 font-mono text-sm text-gray-300 max-h-40 overflow-y-auto)
   - Output label + full output text (same style)
   - If tool_calls not empty: show them

Full dark theme. This is the most important page — it's where developers understand what went wrong.
Make it "use client" with useState for expand/collapse.
```

---

---

# TESTING — End to end test

Once all files are built, test the full flow:

```python
# test_agentwatch.py — run from agentwatch-sdk/ folder
import sys
sys.path.insert(0, '.')

# Simulate what a developer does
import agentwatch

agentwatch.init(
    api_key="aw_devtest123",
    server_url="http://localhost:8000",
    agent_name="test-agent",
    silent=False
)

# Now simulate an agent call
import openai
client = agentwatch.watch(openai.OpenAI(api_key="your-openai-key"))

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Where is my refund for order 4521?"}]
)

print("Agent response:", response.choices[0].message.content)
print("Check your AgentWatch dashboard — a trace should appear!")
```

---

# DEPLOY CHECKLIST

- [ ] Supabase tables created and test data inserted
- [ ] agentwatch-api/ deployed to Railway with env vars set
- [ ] Test curl command returns flagged trace  
- [ ] agentwatch-sdk/ published to PyPI (or tested locally)
- [ ] agentwatch-dashboard/ deployed to Vercel with env vars set
- [ ] Sign up flow works with Clerk
- [ ] Dashboard shows mock data
- [ ] Connect dashboard to real API (replace mock data with fetch calls)
