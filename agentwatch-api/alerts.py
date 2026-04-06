"""Email + Slack alerts for flagged traces."""

from __future__ import annotations

import logging
import os
from typing import Any

import requests

from deep_analysis import format_analysis_for_alert

logger = logging.getLogger(__name__)


def send_slack_alert(
    webhook_url: str,
    trace: dict[str, Any],
    flags: list[dict[str, Any]],
    analysis_text: str = "",
) -> bool:
    if not webhook_url or not flags:
        return False
    payload = {
        "text": "🚨 AgentWatch: Agent flagged in production",
        "blocks": [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": "🚨 Agent Flagged"},
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Agent:* {trace.get('agent_name', 'unknown')}"},
                    {
                        "type": "mrkdwn",
                        "text": f"*Run ID:* {str(trace.get('run_id', ''))[:12]}...",
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Severity:* {flags[0].get('severity', 'unknown').upper()}",
                    },
                    {"type": "mrkdwn", "text": f"*Issues:* {len(flags)} flag(s)"},
                ],
            },
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": f"*Issue:* {flags[0].get('reason', '')}"},
            },
        ],
    }
    if analysis_text:
        payload["blocks"].append(
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": analysis_text[:2800]},
            }
        )
    try:
        r = requests.post(webhook_url, json=payload, timeout=5)
        return r.status_code == 200
    except Exception:
        return False


def send_email_alert(
    to_email: str,
    trace: dict[str, Any],
    flags: list[dict[str, Any]],
    analysis_text: str = "",
) -> bool:
    if not to_email or not flags:
        return False
    try:
        import resend
    except ImportError:
        return False
    key = os.environ.get("RESEND_API_KEY")
    if not key:
        return False
    resend.api_key = key
    from_addr = os.environ.get("RESEND_FROM", "AgentWatch <onboarding@resend.dev>")
    subject = f"[AgentWatch] 🚨 Agent flagged: {trace.get('agent_name', 'unknown')}"
    rows = "".join(
        f"<tr><td>{f.get('flag_type')}</td><td>{f.get('reason', '')}</td></tr>" for f in flags
    )
    body = f"""<html><body style="font-family:system-ui,sans-serif">
<h2>Agent Flagged in Production</h2>
<table border="1" cellpadding="6"><tr><th>Agent</th><td>{trace.get('agent_name', '')}</td></tr>
<tr><th>Run</th><td>{trace.get('run_id', '')}</td></tr>
<tr><th>Step</th><td>{trace.get('step_index', '')}</td></tr></table>
<h3>Flags</h3><table border="1">{rows}</table>
<div style="border:1px solid #a855f7;padding:12px;margin-top:12px">{analysis_text or ''}</div>
<p style="color:#666">AgentWatch — production reliability for AI agents</p>
</body></html>"""
    try:
        resend.Emails.send(
            {
                "from": from_addr,
                "to": [to_email],
                "subject": subject,
                "html": body,
            }
        )
        return True
    except Exception:
        return False


def dispatch_alerts(
    user: dict[str, Any],
    trace: dict[str, Any],
    flags: list[dict[str, Any]],
    analysis: dict[str, Any] | None,
    *,
    skip_dedup: bool = False,
) -> None:
    if not flags:
        return
    analysis_text = format_analysis_for_alert(analysis)
    try:
        types_allowed = user.get("alert_flag_types")
        if isinstance(types_allowed, list) and types_allowed:
            flags = [f for f in flags if f.get("flag_type") in types_allowed]
        if not flags:
            return
    except Exception:
        pass

    try:
        if user.get("slack_webhook"):
            send_slack_alert(user["slack_webhook"], trace, flags, analysis_text)
    except Exception as e:
        logger.debug("slack alert: %s", e)
    try:
        em = user.get("alert_email")
        if em:
            send_email_alert(em, trace, flags, analysis_text)
    except Exception as e:
        logger.debug("email alert: %s", e)
