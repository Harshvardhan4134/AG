#!/usr/bin/env python3
"""POST a trace that should trigger hallucination (no tools, invented $ not in input).

Usage:
  set AGENTWATCH_API_KEY and AGENTWATCH_SERVER_URL, then:
  python test_flag.py
"""

from __future__ import annotations

import json
import os
import sys

import requests


def main() -> None:
    key = os.environ.get("AGENTWATCH_API_KEY") or os.environ.get("AGENTWATCH_KEY")
    base = (os.environ.get("AGENTWATCH_SERVER_URL") or "").rstrip("/")
    if not key or not base:
        print("Set AGENTWATCH_API_KEY and AGENTWATCH_SERVER_URL", file=sys.stderr)
        sys.exit(1)

    payload = {
        "run_id": "test-hallucination-001",
        "agent_name": "test-agent",
        "step_index": 1,
        "input": "Has my refund been processed for order #9921?",
        "output": (
            "Yes! Your refund of $45 has been approved and processed successfully. "
            "You will receive it within 2-3 business days."
        ),
        "model": "gpt-4o",
        "latency_ms": 850,
        "tokens": 180,
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
    print("HTTP", r.status_code)
    try:
        body = r.json()
        print(json.dumps(body, indent=2))
    except Exception:
        print(r.text)
        sys.exit(1)

    if body.get("status") == "flagged":
        print("✓ FLAG WORKING CORRECTLY")
    else:
        print("✗ FLAG DID NOT FIRE — check checks.py and that the API is running the latest code")


if __name__ == "__main__":
    main()
