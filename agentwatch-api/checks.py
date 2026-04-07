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


def _normalize_for_match(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").lower()).strip()


def _digits_normalized(s: str) -> str:
    return re.sub(r"\D+", "", s or "")


def _token_grounded_in_input(token: str, inp_n: str, inp_raw: str) -> bool:
    """True if this invented token is actually echoed from the user message."""
    t = (token or "").strip()
    if not t:
        return True
    tl = t.lower()
    if tl in inp_n or re.sub(r"\s+", "", tl) in re.sub(r"\s+", "", inp_n):
        return True
    # Same dollar amount: $45 vs 45.00 in input
    if "$" in t or re.search(r"\d+\.\d{2}", t):
        dig = _digits_normalized(t)
        if dig and dig == _digits_normalized(inp_raw):
            return True
        if dig and dig in _digits_normalized(inp_raw):
            return True
    # Long numeric id echoed
    if t.isdigit() and t in inp_raw:
        return True
    return False


def _invented_specifics_in_output_not_input(inp: str, out: str) -> list[str]:
    """Find concrete invented facts in output (money, long ids, order-style tokens) absent from input."""
    inp_n = _normalize_for_match(inp)
    out_raw = out or ""
    found: list[str] = []

    # USD amounts like $45, $45.00, $1,234.56
    for m in re.finditer(r"\$\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\$\d+(?:\.\d{2})?", out_raw):
        token = m.group(0).replace(" ", "")
        if _token_grounded_in_input(token, inp_n, inp):
            continue
        if token.lower() not in inp_n and re.sub(r"\s+", "", token.lower()) not in re.sub(
            r"\s+", "", inp_n
        ):
            found.append(token)

    # Order / confirmation IDs (ORD-12345, #12345678, order 12345678)
    for m in re.finditer(
        r"\b(?:ord|order|ticket|confirmation|ref(?:und)?)\s*[#:]?\s*[A-Z0-9-]{6,}\b",
        out_raw,
        re.IGNORECASE,
    ):
        frag = m.group(0)
        if _token_grounded_in_input(frag, inp_n, inp):
            continue
        if frag.lower() not in inp_n:
            found.append(frag.strip())

    # Standalone long digit runs (likely invented transaction / card tail / id) not in input
    for m in re.finditer(r"\b\d{5,}\b", out_raw):
        num = m.group(0)
        if num in inp_n or num in inp:
            continue
        found.append(num)

    # Dedupe preserving order
    seen: set[str] = set()
    out_list: list[str] = []
    for x in found:
        key = x.lower()
        if key not in seen:
            seen.add(key)
            out_list.append(x)
    return out_list


def check_hallucination(trace: dict[str, Any]) -> dict[str, Any] | None:
    """Flag when output invents concrete specifics (amounts/IDs) not grounded in input; no tools."""
    tool_calls = _tool_calls_as_list(trace)
    if tool_calls:
        return None

    inp = str(trace.get("input") or "")
    out = str(trace.get("output") or "")
    if not out.strip():
        return None

    invented = _invented_specifics_in_output_not_input(inp, out)
    if not invented:
        return None

    out_l = out.lower()
    claim_cues = (
        "refund",
        "processed",
        "completed",
        "approved",
        "confirmed",
        "charged",
        "paid",
        "credited",
        "debited",
        "order",
        "ticket",
        "confirmation",
        "transaction",
        "balance",
        "account",
        "transfer",
        "shipped",
        "delivered",
        "booking",
        "reservation",
    )
    if not any(re.search(r"\b" + re.escape(c) + r"\b", out_l) for c in claim_cues):
        return None

    preview = ", ".join(invented[:3])
    # Confidence: dollar amounts highest, invented IDs next, long digits lower
    conf = 0.6
    if any("$" in x for x in invented):
        conf = max(conf, 0.9)
    if any(re.search(r"(?i)(ord|order|ticket|confirmation)", x) for x in invented):
        conf = max(conf, 0.85)
    if conf < 0.85 and any(x.isdigit() and len(x) >= 5 for x in invented):
        conf = max(conf, 0.7)

    return {
        "flag_type": "hallucination",
        "severity": "high",
        "confidence": round(min(conf, 1.0), 2),
        "reason": (
            "Output contains specific values (e.g. amounts or IDs) that do not appear in the input "
            f"and no tool calls were recorded to ground them: [{preview}]"
        ),
    }


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
    # Require a *positive* false success signal, not just silence
    positive = (
        "approved",
        "confirmed",
        "success",
        "successful",
        "done",
        "processed",
        "completed",
        "all set",
        "here you go",
        "created",
        "updated",
    )
    if not any(p in out for p in positive):
        return None
    return {
        "flag_type": "error_swallowed",
        "severity": "high",
        "confidence": 0.9,
        "reason": (
            "A tool call returned an error but the assistant replied with a positive confirmation "
            "without acknowledging the failure"
        ),
    }


def check_latency_spike(trace: dict[str, Any], avg_latency: float) -> dict[str, Any] | None:
    if avg_latency <= 0 or avg_latency < 5:
        return None
    lat = float(trace.get("latency_ms") or 0)
    ratio = lat / avg_latency if avg_latency else 0
    if ratio >= 5.0:
        return {
            "flag_type": "latency_spike",
            "severity": "medium",
            "confidence": 0.95,
            "reason": (
                f"Step took {lat:.0f}ms which is {round(ratio, 1)}x longer than the average "
                f"{round(avg_latency)}ms for this agent"
            ),
        }
    if ratio >= 3.0:
        return {
            "flag_type": "latency_spike",
            "severity": "medium",
            "confidence": 0.7,
            "reason": (
                f"Step took {lat:.0f}ms which is {round(ratio, 1)}x longer than the average "
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
            "confidence": 0.75,
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
                if "confidence" not in r:
                    r["confidence"] = 0.75
                out.append(r)
        except Exception:
            continue
    return out


if __name__ == "__main__":
    benign = {
        "input": "What's the status of my ticket?",
        "output": "Your ticket has been received and we're looking into it.",
        "tool_calls": [],
        "latency_ms": 900,
    }
    bad = {
        "input": "What's the status of my ticket?",
        "output": "Your refund of $45.00 has been processed. Confirmation ORD-928374651.",
        "tool_calls": [],
        "latency_ms": 900,
    }
    echo_from_input = {
        "input": "Refund $45 for order #991",
        "output": "Your refund of $45 has been processed.",
        "tool_calls": [],
        "latency_ms": 900,
    }
    print("benign hallucination:", check_hallucination(benign))
    print("bad hallucination:", check_hallucination(bad))
    print("echo (should be None):", check_hallucination(echo_from_input))
    print("all bad:", run_all_checks(bad, avg_latency=100.0))
