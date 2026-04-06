"""LLM analysis (judge) for flagged traces — calls your OpenAI, Anthropic, or Groq key; never logged or stored here."""

from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)


def build_judge_prompt(trace: dict[str, Any], flags: list[Any]) -> tuple[str, str]:
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

    inp = str(trace.get("input", ""))[:600]
    outp = str(trace.get("output", ""))[:600]
    tc_raw = trace.get("tool_calls", [])[:3]
    try:
        tc_s = json.dumps(tc_raw)[:300]
    except Exception:
        tc_s = "[]"
    try:
        fl_s = json.dumps(flags)
    except Exception:
        fl_s = "[]"
    user_message = (
        "Agent's task (input): "
        + inp
        + "\nAgent's response (output): "
        + outp
        + "\nTool calls made: "
        + tc_s
        + "\nRule-based flags triggered: "
        + fl_s
        + "\nAgent name: "
        + str(trace.get("agent_name", "unknown"))
    )
    return system_prompt, user_message


def _failed() -> dict[str, Any]:
    return {
        "verdict": "analysis_failed",
        "confidence": 0,
        "what_went_wrong": "Deep analysis encountered an error",
        "root_cause": "Unknown",
        "suggested_fix": "Check your API key and try again",
        "severity": "low",
    }


def analyse_with_groq(
    trace: dict[str, Any],
    flags: list[Any],
    api_key: str,
    model: str = "llama-3.3-70b-versatile",
) -> dict[str, Any]:
    try:
        from groq import Groq

        client = Groq(api_key=api_key)
        system_prompt, user_message = build_judge_prompt(trace, flags)
        resp = client.chat.completions.create(
            model=model,
            max_completion_tokens=350,
            temperature=0,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
        )
        content = (resp.choices[0].message.content or "").strip()
        return json.loads(content)
    except Exception as e:
        logger.debug("groq analysis failed: %s", e)
        return _failed()


def analyse_with_openai(
    trace: dict[str, Any], flags: list[Any], api_key: str, model: str = "gpt-4o-mini"
) -> dict[str, Any]:
    try:
        import openai

        client = openai.OpenAI(api_key=api_key)
        system_prompt, user_message = build_judge_prompt(trace, flags)
        resp = client.chat.completions.create(
            model=model,
            max_tokens=350,
            temperature=0,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
        )
        content = (resp.choices[0].message.content or "").strip()
        return json.loads(content)
    except Exception as e:
        logger.debug("openai analysis failed: %s", e)
        return _failed()


def analyse_with_anthropic(
    trace: dict[str, Any],
    flags: list[Any],
    api_key: str,
    model: str = "claude-3-5-haiku-20241022",
) -> dict[str, Any]:
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        system_prompt, user_message = build_judge_prompt(trace, flags)
        resp = client.messages.create(
            model=model,
            max_tokens=350,
            temperature=0,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
        text = resp.content[0].text if resp.content else ""
        return json.loads(text.strip())
    except Exception as e:
        logger.debug("anthropic analysis failed: %s", e)
        return _failed()


def run_deep_analysis(
    trace: dict[str, Any], flags: list[Any], config: dict[str, Any]
) -> dict[str, Any] | None:
    if not config.get("enabled"):
        return None
    if not config.get("api_key"):
        return None
    if not flags:
        return None
    provider = (config.get("provider") or "openai").lower()
    model = config.get("model") or ""
    api_key = config["api_key"]
    if provider == "anthropic":
        return analyse_with_anthropic(
            trace, flags, api_key, model or "claude-3-5-haiku-20241022"
        )
    if provider == "groq":
        return analyse_with_groq(
            trace, flags, api_key, model or "llama-3.3-70b-versatile"
        )
    return analyse_with_openai(trace, flags, api_key, model or "gpt-4o-mini")


def format_analysis_for_alert(analysis: dict[str, Any] | None) -> str:
    if analysis is None:
        return ""
    v = analysis.get("verdict")
    if v in ("ok", "analysis_failed"):
        return ""
    return (
        "\n\n🔍 Deep Analysis:\n"
        + f"What went wrong: {analysis.get('what_went_wrong', '')}\n"
        + f"Root cause: {analysis.get('root_cause', '')}\n"
        + f"Suggested fix: {analysis.get('suggested_fix', '')}\n"
        + f"Confidence: {int(float(analysis.get('confidence') or 0) * 100)}%"
    )
