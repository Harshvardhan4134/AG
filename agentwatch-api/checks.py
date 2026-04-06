"""Rule-based anomaly checks — pure logic, no I/O."""

from __future__ import annotations

import json
import re
from collections import Counter
from typing import Any


def _tool_calls_as_list(trace: dict[str, Any]) -> list[Any]:
    tc = trace.get("tool_calls")
    if tc is None:
        return []
    if isinstance(tc, list):
        return tc
    return []


def _tool_error_text(tc: Any) -> str:
    if isinstance(tc, dict):
        parts = []
        for k in ("result", "output", "content", "error", "message"):
            v = tc.get(k)
            if v is not None:
                parts.append(str(v))
        if not parts:
            parts.append(json.dumps(tc))
        return " ".join(parts).lower()
    return str(tc).lower()


def check_hallucination(trace: dict[str, Any]) -> dict[str, Any] | None:
    tool_calls = _tool_calls_as_list(trace)
    out = (trace.get("output") or "").lower()
    action_words = [
        "approved",
        "confirmed",
        "verified",
        "processed",
        "completed",
        "refunded",
        "scheduled",
        "booked",
        "cancelled",
        "sent",
        "created",
        "updated",
        "deleted",
        "transferred",
        "paid",
    ]
    if tool_calls:
        return None
    for w in action_words:
        if re.search(r"\b" + re.escape(w) + r"\b", out):
            return {
                "flag_type": "hallucination",
                "severity": "high",
                "reason": (
                    f"Agent claimed an action was completed (detected word: '{w}') "
                    "but no tool calls were made to verify or execute it"
                ),
            }
    return None


def check_error_swallowed(trace: dict[str, Any]) -> dict[str, Any] | None:
    tool_calls = _tool_calls_as_list(trace)
    err_markers = (
        "error",
        "404",
        "500",
        "403",
        "failed",
        "exception",
        "timeout",
        "not found",
        "unauthorized",
    )
    had_tool_error = False
    for tc in tool_calls:
        blob = _tool_error_text(tc)
        if any(m in blob for m in err_markers):
            had_tool_error = True
            break
    if not had_tool_error:
        return None
    out = (trace.get("output") or "").lower()
    acknowledgement_words = [
        "unable",
        "sorry",
        "error",
        "could not",
        "failed",
        "issue",
        "problem",
        "unfortunately",
        "cannot",
        "can't",
    ]
    if any(w in out for w in acknowledgement_words):
        return None
    return {
        "flag_type": "error_swallowed",
        "severity": "high",
        "reason": (
            "A tool call returned an error but the agent continued without acknowledging the failure"
        ),
    }


def check_latency_spike(trace: dict[str, Any], avg_latency: float) -> dict[str, Any] | None:
    if avg_latency <= 0 or avg_latency < 5:
        return None
    lat = float(trace.get("latency_ms") or 0)
    if lat > avg_latency * 3.0:
        return {
            "flag_type": "latency_spike",
            "severity": "medium",
            "reason": (
                f"Step took {lat:.0f}ms which is {round(lat / avg_latency, 1)}x longer than the average "
                f"{round(avg_latency)}ms for this agent"
            ),
        }
    return None


def check_empty_output(trace: dict[str, Any]) -> dict[str, Any] | None:
    out = trace.get("output")
    if out is None:
        s = ""
    else:
        s = str(out).strip()
    if s == "":
        return {
            "flag_type": "empty_output",
            "severity": "medium",
            "reason": "Agent produced an empty output — the LLM call may have failed or returned nothing",
        }
    return None


def check_content_repetition(trace: dict[str, Any]) -> dict[str, Any] | None:
    raw = str(trace.get("output") or "")
    if not raw.strip():
        return None
    sents = re.split(r"(?<=[.!?])\s+|\n+", raw.strip())
    normalized = [s.strip().lower() for s in sents if s.strip()]
    if len(normalized) >= 4:
        seen: set[str] = set()
        for s in normalized:
            if s in seen:
                return {
                    "flag_type": "content_repetition",
                    "severity": "medium",
                    "reason": (
                        "Agent output contains repeated sentences — likely stuck in a loop or poor prompt"
                    ),
                }
            seen.add(s)
    if len(raw) > 100:
        words = re.findall(r"\b\w+\b", raw.lower())
        if len(words) >= 5:
            phrases = [" ".join(words[i : i + 5]) for i in range(len(words) - 4)]
            if phrases:
                top = Counter(phrases).most_common(1)[0][1]
                if top >= 3:
                    return {
                        "flag_type": "content_repetition",
                        "severity": "medium",
                        "reason": (
                            "Agent output contains repeated sentences — likely stuck in a loop or poor prompt"
                        ),
                    }
    return None


def check_content_too_short(trace: dict[str, Any], min_words: int = 20) -> dict[str, Any] | None:
    if (trace.get("step_type") or "llm_call") != "llm_call":
        return None
    raw = str(trace.get("output") or "")
    word_count = len(raw.split())
    if word_count < min_words:
        return {
            "flag_type": "content_too_short",
            "severity": "low",
            "reason": (
                f"Content output is only {word_count} words — may be truncated or incomplete"
            ),
        }
    return None


def check_prompt_injection(trace: dict[str, Any]) -> dict[str, Any] | None:
    blob = str(trace.get("input") or "").lower()
    injection_patterns = [
        "ignore previous instructions",
        "ignore all previous",
        "disregard your instructions",
        "you are now",
        "forget everything",
        "new instructions:",
        "system: ",
        "act as if",
        "pretend you are",
        "jailbreak",
    ]
    for pat in injection_patterns:
        if pat in blob:
            return {
                "flag_type": "prompt_injection_attempt",
                "severity": "high",
                "reason": f"Possible prompt injection detected in user input: '{pat}'",
            }
    return None


def check_off_topic_content(trace: dict[str, Any]) -> dict[str, Any] | None:
    inp = str(trace.get("input") or "")
    out = str(trace.get("output") or "")
    in_words = re.findall(r"\b\w+\b", inp.lower())
    topic_words = in_words[:10]
    out_words = re.findall(r"\b\w+\b", out.lower())
    if len(out_words) <= 100:
        return None
    if len(topic_words) < 2:
        return None
    matches = 0
    for w in topic_words:
        if len(w) < 3:
            continue
        if re.search(r"\b" + re.escape(w) + r"\b", out.lower()):
            matches += 1
    if matches < 2:
        return {
            "flag_type": "off_topic_output",
            "severity": "medium",
            "reason": (
                "Agent output may not address the requested topic — content may be generic or off-track"
            ),
        }
    return None


def run_all_checks(
    trace: dict[str, Any], avg_latency: float = 0.0, content_mode: bool = False
) -> list[dict[str, Any]]:
    checks: list[Any] = [
        check_hallucination,
        check_error_swallowed,
        lambda t: check_latency_spike(t, avg_latency),
        check_empty_output,
    ]
    if content_mode:
        checks.extend(
            [
                check_content_repetition,
                check_content_too_short,
                check_prompt_injection,
                check_off_topic_content,
            ]
        )
    out: list[dict[str, Any]] = []
    for fn in checks:
        try:
            r = fn(trace)
            if r is not None:
                out.append(r)
        except Exception:
            continue
    return out


if __name__ == "__main__":
    sample = {
        "output": "Your refund has been approved.",
        "tool_calls": [],
        "latency_ms": 900,
    }
    print("hallucination:", check_hallucination(sample))
    print("all:", run_all_checks(sample, avg_latency=100.0))
