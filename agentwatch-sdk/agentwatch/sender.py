"""Send traces to AgentWatch API (non-blocking, with one retry)."""

from __future__ import annotations

import json
import threading
import time
from typing import Any

import requests


def send_trace_async(
    trace_data: dict[str, Any],
    aw_key: str,
    server_url: str,
    deep_config: dict[str, Any] | None = None,
) -> None:
    deep_config = deep_config or {}

    def _do_send() -> None:
        payload = {**trace_data, "deep_analysis_config": deep_config}
        url = server_url.rstrip("/") + "/v1/trace"
        headers = {
            "Authorization": f"Bearer {aw_key}",
            "Content-Type": "application/json",
        }
        for attempt in range(2):
            try:
                r = requests.post(url, headers=headers, json=payload, timeout=5)
                if r.status_code == 200:
                    return
            except Exception:
                pass
            if attempt == 0:
                time.sleep(0.25)

    t = threading.Thread(target=_do_send, daemon=True)
    t.start()


def validate_connection(aw_key: str, server_url: str) -> bool:
    url = server_url.rstrip("/") + "/health"
    try:
        r = requests.get(url, timeout=3)
        return r.status_code == 200
    except Exception:
        return False
