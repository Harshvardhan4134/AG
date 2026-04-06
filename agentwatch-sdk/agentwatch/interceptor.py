"""Monkey-patch LLM clients to capture traces."""

from __future__ import annotations

import time
import uuid
from typing import Any, Callable


def wrap_openai_client(client: Any, on_trace: Callable[[dict], None]) -> Any:
    try:
        original_create = client.chat.completions.create

        def patched_create(*args: Any, **kwargs: Any) -> Any:
            run_id = kwargs.pop("aw_run_id", str(uuid.uuid4()))
            agent_name = kwargs.pop("aw_agent_name", "default")
            start = time.time()
            response = original_create(*args, **kwargs)
            latency_ms = int((time.time() - start) * 1000)
            input_text = str(kwargs.get("messages", []))
            output_text = ""
            model = kwargs.get("model", "")
            tokens = 0
            if response.choices:
                ch0 = response.choices[0]
                output_text = ch0.message.content or ""
            if response.usage:
                tokens = response.usage.total_tokens or 0
            if getattr(response, "model", None):
                model = response.model or model
            trace = {
                "run_id": run_id,
                "agent_name": agent_name,
                "input": input_text[:2000],
                "output": (output_text or "")[:2000],
                "model": model,
                "provider": "openai",
                "latency_ms": latency_ms,
                "tokens": tokens,
                "tool_calls": extract_tool_calls(response),
                "step_type": "llm_call",
            }
            try:
                on_trace(trace)
            except Exception:
                pass
            return response

        client.chat.completions.create = patched_create
    except Exception:
        pass
    return client


def wrap_anthropic_client(client: Any, on_trace: Callable[[dict], None]) -> Any:
    try:
        original_create = client.messages.create

        def patched_create(*args: Any, **kwargs: Any) -> Any:
            run_id = kwargs.pop("aw_run_id", str(uuid.uuid4()))
            agent_name = kwargs.pop("aw_agent_name", "default")
            start = time.time()
            response = original_create(*args, **kwargs)
            latency_ms = int((time.time() - start) * 1000)
            msgs = kwargs.get("messages", [])
            input_text = str(msgs)[:2000]
            output_text = ""
            if response.content:
                output_text = response.content[0].text
            tokens = 0
            if response.usage:
                tokens = (response.usage.input_tokens or 0) + (response.usage.output_tokens or 0)
            model = getattr(response, "model", "") or kwargs.get("model", "")
            trace = {
                "run_id": run_id,
                "agent_name": agent_name,
                "input": input_text,
                "output": (output_text or "")[:2000],
                "model": model,
                "provider": "anthropic",
                "latency_ms": latency_ms,
                "tokens": tokens,
                "tool_calls": [],
                "step_type": "llm_call",
            }
            try:
                on_trace(trace)
            except Exception:
                pass
            return response

        client.messages.create = patched_create
    except Exception:
        pass
    return client


def wrap_groq_client(client: Any, on_trace: Callable[[dict], None]) -> Any:
    """Patch Groq's OpenAI-compatible client (same interface as OpenAI chat completions)."""
    try:
        original_create = client.chat.completions.create

        def patched_create(*args: Any, **kwargs: Any) -> Any:
            run_id = kwargs.pop("aw_run_id", str(uuid.uuid4()))
            agent_name = kwargs.pop("aw_agent_name", "default")
            start = time.time()
            response = original_create(*args, **kwargs)
            latency_ms = int((time.time() - start) * 1000)
            input_text = str(kwargs.get("messages", []))
            output_text = ""
            model = kwargs.get("model", "")
            tokens = 0
            if response.choices:
                ch0 = response.choices[0]
                output_text = ch0.message.content or ""
            if response.usage:
                tokens = getattr(response.usage, "total_tokens", None) or 0
            if getattr(response, "model", None):
                model = response.model or model

            groq_prompt_time_ms = 0
            groq_completion_time_ms = 0
            groq_request_id = None
            try:
                u = response.usage
                if u is not None:
                    pt = getattr(u, "prompt_time", None)
                    ct = getattr(u, "completion_time", None)
                    if pt is not None:
                        groq_prompt_time_ms = int(float(pt) * 1000)
                    if ct is not None:
                        groq_completion_time_ms = int(float(ct) * 1000)
            except Exception:
                pass
            try:
                xg = getattr(response, "x_groq", None)
                if xg is not None:
                    groq_request_id = getattr(xg, "id", None)
            except Exception:
                pass

            trace = {
                "run_id": run_id,
                "agent_name": agent_name,
                "input": input_text[:2000],
                "output": (output_text or "")[:2000],
                "model": model,
                "provider": "groq",
                "latency_ms": latency_ms,
                "tokens": tokens,
                "tool_calls": extract_groq_tool_calls(response),
                "step_type": "llm_call",
                "groq_prompt_time_ms": groq_prompt_time_ms,
                "groq_completion_time_ms": groq_completion_time_ms,
                "groq_request_id": groq_request_id,
            }
            try:
                on_trace(trace)
            except Exception:
                pass
            return response

        client.chat.completions.create = patched_create
    except Exception:
        pass
    return client


def extract_groq_tool_calls(response: Any) -> list[dict[str, Any]]:
    """Tool calls on Groq responses (OpenAI-compatible message shape)."""
    return extract_tool_calls(response)


def extract_tool_calls(response: Any) -> list[dict[str, Any]]:
    try:
        if not response.choices:
            return []
        msg = response.choices[0].message
        tcs = getattr(msg, "tool_calls", None)
        if not tcs:
            return []
        out = []
        for tc in tcs:
            fn = getattr(tc, "function", None)
            name = getattr(fn, "name", "") if fn else ""
            args = getattr(fn, "arguments", "") if fn else ""
            out.append({"name": name, "arguments": args, "result": ""})
        return out
    except Exception:
        return []
