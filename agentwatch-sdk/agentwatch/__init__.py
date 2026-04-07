"""AgentWatch — monitor LLM calls in production.

Two layers of analysis run on the AgentWatch **server** after each trace is received:

1. **Rule-based checks** — Fast, deterministic (hallucination heuristics, swallowed errors,
   latency spikes, empty output). Always on. Optional **content mode** adds repetition,
   length, injection, and off-topic checks for writing tools.

2. **LLM analysis (judge)** — Optional. If you enable ``deep_analysis`` and pass a provider
   API key, and the trace is **flagged** by rules, the API calls your OpenAI, Anthropic, or
   Groq account to produce a structured root-cause JSON. Your LLM key is never logged or
   persisted by AgentWatch.

You must wrap your OpenAI, Anthropic, or **Groq** client with :func:`watch` so completions
are traced.
"""

from __future__ import annotations

from typing import Any, Optional

_state: dict[str, Any] = {
    "initialized": False,
    "aw_key": None,
    "server_url": None,
    "deep_config": {},
    "redact_fields": [],
    "on_trace": None,
    "content_mode": False,
}


def init(
    api_key: str,
    server_url: str = "https://api.agentwatch.io",
    deep_analysis: bool = False,
    llm_provider: str = "openai",
    llm_api_key: str = "",
    groq_api_key: str = "",
    llm_model: str = "",
    redact_fields: Optional[list[str]] = None,
    agent_name: str = "default",
    silent: bool = False,
    content_mode: bool = False,
) -> None:
    """Configure AgentWatch and register the trace callback.

    Args:
        api_key: AgentWatch API key (``aw_...``) from the dashboard.
        server_url: Base URL of the AgentWatch FastAPI service (no trailing slash).
        deep_analysis: If True and a judge API key is set, flagged traces trigger **LLM judge**
            analysis on the server using your provider key.
        llm_provider: ``\"openai\"``, ``\"anthropic\"``, or ``\"groq\"`` for judge calls.
        llm_api_key: Your OpenAI or Anthropic API key (only sent to your provider; never stored).
        groq_api_key: Optional. Use for judge when your key lives in ``GROQ_API_KEY`` — same as
            ``llm_api_key`` for Groq-only setups (``llm_api_key`` and ``groq_api_key`` are merged).
        llm_model: Model for the judge; defaults per provider (e.g. ``gpt-4o-mini``, Haiku, Llama).
        redact_fields: Optional names of fields to scrub from trace text before send.
        agent_name: Label for this agent in the dashboard.
        silent: If True, skip stdout messages for connection status.
        content_mode: If True, the server runs extra content-creation checks (repetition, length,
            prompt-injection patterns, off-topic heuristics) in addition to core rules.
    """
    from .interceptor import wrap_anthropic_client, wrap_groq_client, wrap_openai_client
    from .redactor import redact_trace
    from .sender import send_trace_async, validate_connection

    redact_fields = redact_fields or []
    _state["aw_key"] = api_key
    _state["server_url"] = server_url
    _state["redact_fields"] = redact_fields
    _state["initialized"] = True
    _state["content_mode"] = content_mode

    default_models = {
        "openai": "gpt-4o-mini",
        "anthropic": "claude-3-5-haiku-20241022",
        "groq": "llama-3.3-70b-versatile",
    }
    actual_model = llm_model or default_models.get(llm_provider, "gpt-4o-mini")

    judge_key = llm_api_key or groq_api_key
    if deep_analysis and judge_key:
        prov = (llm_provider or "openai").lower()
        if groq_api_key and not llm_api_key:
            prov = "groq"
        _state["deep_config"] = {
            "enabled": True,
            "provider": prov,
            "api_key": judge_key,
            "model": actual_model,
        }
    else:
        _state["deep_config"] = {}

    if not silent:
        ok = validate_connection(api_key, server_url)
        if ok:
            print(f"✓ AgentWatch connected. Monitoring agent: '{agent_name}'")
            if deep_analysis and judge_key:
                print(f"✓ LLM analysis enabled for flagged traces ({_state['deep_config'].get('provider')} / {actual_model})")
        else:
            print(f"⚠ AgentWatch: Could not connect to {server_url}. Traces will be retried in background.")

    def on_trace(trace_data: dict[str, Any]) -> None:
        td = trace_data
        if redact_fields:
            td = redact_trace(dict(trace_data), redact_fields)
        td["agent_name"] = agent_name
        td["content_mode"] = _state.get("content_mode", False)
        send_trace_async(td, api_key, server_url, _state["deep_config"])

    _state["on_trace"] = on_trace

    try:
        import openai

        if hasattr(openai, "_default_client") and openai._default_client:
            wrap_openai_client(openai._default_client, on_trace)
    except ImportError:
        pass


def watch(client: Any) -> Any:
    """Wrap an OpenAI, Anthropic, or Groq client so each completion is traced.

    Returns the same client instance with patched ``chat.completions.create`` or
    ``messages.create``.
    """
    if not _state["initialized"]:
        raise RuntimeError("Call agentwatch.init() before agentwatch.watch()")
    from .interceptor import wrap_anthropic_client, wrap_groq_client, wrap_openai_client

    on_trace = _state.get("on_trace")
    if not on_trace:
        return client
    name = type(client).__name__
    if "OpenAI" in name:
        return wrap_openai_client(client, on_trace)
    if "Anthropic" in name:
        return wrap_anthropic_client(client, on_trace)
    if "Groq" in name:
        return wrap_groq_client(client, on_trace)
    print(
        f"⚠ AgentWatch: Unknown client type '{name}'. Manual instrumentation required."
    )
    return client


def flush(timeout_s: float = 3.0) -> bool:
    """Flush any pending trace sends (best-effort).

    Useful for short-lived scripts/CLIs where the process exits immediately
    after an LLM call.
    """
    from .sender import flush as _flush

    return _flush(timeout_s=timeout_s)
