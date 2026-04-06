"""Optional PII redaction before sending traces."""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any


def redact_text(text: str, fields_to_redact: list[str]) -> str:
    out = text
    email_re = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
    phone_re = r"\b\d{10,12}\b"
    card_re = r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b"
    out = re.sub(email_re, "[EMAIL_REDACTED]", out)
    out = re.sub(phone_re, "[PHONE_REDACTED]", out)
    out = re.sub(card_re, "[CARD_REDACTED]", out)
    for field in fields_to_redact:
        pat = rf'{re.escape(field)}["\']?\s*[:=]\s*["\']?([^"\',\s}}]+)'
        out = re.sub(pat, f'[{field.upper()}_REDACTED]', out)
    return out


def redact_trace(trace: dict[str, Any], fields_to_redact: list[str]) -> dict[str, Any]:
    t = dict(trace)
    t["input"] = redact_text(str(t.get("input", "")), fields_to_redact)
    t["output"] = redact_text(str(t.get("output", "")), fields_to_redact)
    tc = t.get("tool_calls", [])
    try:
        s = json.dumps(tc)
        t["tool_calls"] = json.loads(redact_text(s, fields_to_redact))
    except Exception:
        t["tool_calls"] = tc
    return t


def hash_value(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()
