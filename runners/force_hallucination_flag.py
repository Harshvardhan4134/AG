#!/usr/bin/env python3
"""Part A test: POST a trace that should trigger hallucination rule (no tool calls).

Usage (PowerShell):
  $env:AGENTWATCH_API_KEY="aw_..."
  $env:AGENTWATCH_SERVER_URL="https://your-api.run.app"
  python runners/force_hallucination_flag.py

Expect HTTP 200 and a flagged response if checks run on the API.
"""

from __future__ import annotations

import json
import os
import sys
import uuid

try:
    import requests
except ImportError:
    print("pip install requests", file=sys.stderr)
    raise


def main() -> None:
    key = os.environ.get("AGENTWATCH_API_KEY") or os.environ.get("AGENTWATCH_KEY")
    base = (os.environ.get("AGENTWATCH_SERVER_URL") or "").rstrip("/")
    if not key or not base:
        print("Set AGENTWATCH_API_KEY and AGENTWATCH_SERVER_URL", file=sys.stderr)
        sys.exit(1)

    run_id = str(uuid.uuid4())
    payload = {
        "run_id": run_id,
        "step_index": 0,
        "step_type": "llm_call",
        "agent_name": "hallucination-test",
        "input": "What's the status of my ticket?",
        "output": (
            "Your refund of $45.00 has been processed. "
            "Confirmation ORD-928374651."
        ),
        "model": "test",
        "latency_ms": 900,
        "tokens": 40,
        "tool_calls": [],
        "provider": "openai",
        "content_mode": False,
        "deep_analysis_config": {},
    }
    url = base + "/v1/trace"
    r = requests.post(
        url,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json=payload,
        timeout=30,
    )
    print("status:", r.status_code)
    try:
        print(json.dumps(r.json(), indent=2))
    except Exception:
        print(r.text)
    if r.status_code != 200:
        sys.exit(1)


if __name__ == "__main__":
    main()
