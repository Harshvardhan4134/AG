"""Send traces to AgentWatch API (async, buffered, best-effort).

Why buffering matters:
- Many LLM calls happen in short-lived processes (scripts, notebooks, CLIs).
- A fire-and-forget daemon thread can be killed before the POST completes,
  leading to "only one trace" or missing traces.
"""

from __future__ import annotations

import atexit
import queue
import threading
import time
from typing import Any

import requests


_Q_MAX = 1000
_SEND_TIMEOUT_S = 6
_RETRY_SLEEP_S = 0.35
_DRAIN_ON_EXIT_S = 1.5

_q: "queue.Queue[tuple[dict[str, Any], str, str, dict[str, Any]]]" = queue.Queue(maxsize=_Q_MAX)
_worker_started = False
_worker_lock = threading.Lock()
_pending = 0
_pending_lock = threading.Lock()
_pending_zero = threading.Event()
_pending_zero.set()


def _inc_pending() -> None:
    global _pending
    with _pending_lock:
        _pending += 1
        _pending_zero.clear()


def _dec_pending() -> None:
    global _pending
    with _pending_lock:
        _pending = max(0, _pending - 1)
        if _pending == 0:
            _pending_zero.set()


def _ensure_worker() -> None:
    global _worker_started
    if _worker_started:
        return
    with _worker_lock:
        if _worker_started:
            return

        def _loop() -> None:
            while True:
                item = _q.get()
                try:
                    trace_data, aw_key, server_url, deep_config = item
                    payload = {**trace_data, "deep_analysis_config": deep_config or {}}
                    url = server_url.rstrip("/") + "/v1/trace"
                    headers = {
                        "Authorization": f"Bearer {aw_key}",
                        "Content-Type": "application/json",
                    }
                    for attempt in range(2):
                        try:
                            r = requests.post(url, headers=headers, json=payload, timeout=_SEND_TIMEOUT_S)
                            if r.status_code == 200:
                                break
                        except Exception:
                            pass
                        if attempt == 0:
                            time.sleep(_RETRY_SLEEP_S)
                finally:
                    _dec_pending()
                    _q.task_done()

        t = threading.Thread(target=_loop, daemon=True, name="agentwatch-sender")
        t.start()
        _worker_started = True

        def _drain_at_exit() -> None:
            # Best-effort: give the worker a moment to flush before interpreter exits.
            try:
                _pending_zero.wait(timeout=_DRAIN_ON_EXIT_S)
            except Exception:
                pass

        atexit.register(_drain_at_exit)


def send_trace_async(
    trace_data: dict[str, Any],
    aw_key: str,
    server_url: str,
    deep_config: dict[str, Any] | None = None,
) -> None:
    _ensure_worker()
    _inc_pending()
    try:
        _q.put_nowait((trace_data, aw_key, server_url, deep_config or {}))
    except queue.Full:
        # Drop if overloaded; keep app behavior non-blocking.
        _dec_pending()


def flush(timeout_s: float = 3.0) -> bool:
    """Wait for pending traces to send (best-effort)."""
    _ensure_worker()
    try:
        return _pending_zero.wait(timeout=timeout_s)
    except Exception:
        return False


def validate_connection(aw_key: str, server_url: str) -> bool:
    url = server_url.rstrip("/") + "/health"
    try:
        r = requests.get(url, timeout=3)
        return r.status_code == 200
    except Exception:
        return False
