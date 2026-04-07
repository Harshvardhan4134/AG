"""CLI: ``python -m agentwatch ping`` — health check against AGENTWATCH_SERVER_URL."""

from __future__ import annotations

import os
import sys
import urllib.error
import urllib.request


def ping() -> int:
    key = os.environ.get("AGENTWATCH_KEY") or os.environ.get("AGENTWATCH_API_KEY")
    base = (
        os.environ.get("AGENTWATCH_SERVER_URL")
        or os.environ.get("AGENTWATCH_URL")
        or "https://api.agentwatch.io"
    ).rstrip("/")
    url = base + "/health"
    try:
        with urllib.request.urlopen(url, timeout=5) as r:
            body = r.read().decode("utf-8", errors="replace")
        print("✓", url, "->", r.status, body[:200])
        if not key:
            print("(Set AGENTWATCH_KEY to test authenticated trace POST.)")
        return 0
    except urllib.error.HTTPError as e:
        print("✗ HTTP", e.code, e.reason)
        return 1
    except Exception as e:
        print("✗", e)
        return 1


def main() -> None:
    arg = sys.argv[1] if len(sys.argv) > 1 else "ping"
    if arg in ("ping", "health"):
        raise SystemExit(ping())
    print("Usage: python -m agentwatch [ping|health]", file=sys.stderr)
    raise SystemExit(2)
