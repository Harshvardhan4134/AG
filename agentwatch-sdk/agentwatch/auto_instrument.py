"""Optional auto-instrumentation (opt-in).

Do **not** rely on site-wide .pth hooks (fragile, surprises CI/pip). Use one of:

1. ``import agentwatch.auto_instrument`` at the top of your entrypoint (after ``pip install agentwatch-io``), or
2. ``PYTHONSTARTUP`` pointing to a one-liner file that imports this module.

Requires env: ``AGENTWATCH_KEY`` or ``AGENTWATCH_API_KEY``, and ``AGENTWATCH_SERVER_URL``
(or ``AGENTWATCH_URL``).
"""

from __future__ import annotations

import os
from typing import Any

_PATCHED = False


def install(silent: bool | None = None) -> bool:
    """Patch OpenAI / Groq / Anthropic client constructors so new instances are traced."""
    global _PATCHED
    if _PATCHED:
        return True

    key = os.environ.get("AGENTWATCH_KEY") or os.environ.get("AGENTWATCH_API_KEY") or ""
    server = (
        os.environ.get("AGENTWATCH_SERVER_URL")
        or os.environ.get("AGENTWATCH_URL")
        or "https://api.agentwatch.io"
    ).rstrip("/")
    if not key:
        return False

    if silent is None:
        silent = os.environ.get("AGENTWATCH_SILENT", "false").lower() == "true"

    from . import init, watch

    init(
        api_key=key,
        server_url=server,
        agent_name=os.environ.get("AGENTWATCH_AGENT", "auto"),
        silent=silent,
    )

    def _wrap_openai_init(original_init: Any) -> Any:
        def patched(self: Any, *a: Any, **kw: Any) -> None:
            original_init(self, *a, **kw)
            try:
                watch(self)
            except Exception:
                pass

        return patched

    patched: list[str] = []
    try:
        import openai

        if hasattr(openai, "OpenAI"):
            oi = openai.OpenAI.__init__
            if not getattr(oi, "__agentwatch_wrapped__", False):
                w = _wrap_openai_init(oi)
                w.__agentwatch_wrapped__ = True  # type: ignore[attr-defined]
                openai.OpenAI.__init__ = w
                patched.append("openai.OpenAI")
    except Exception:
        pass

    try:
        from groq import Groq

        gi = Groq.__init__
        if not getattr(gi, "__agentwatch_wrapped__", False):
            w = _wrap_openai_init(gi)
            w.__agentwatch_wrapped__ = True  # type: ignore[attr-defined]
            Groq.__init__ = w
            patched.append("groq.Groq")
    except Exception:
        pass

    try:
        import anthropic

        if hasattr(anthropic, "Anthropic"):
            ai = anthropic.Anthropic.__init__
            if not getattr(ai, "__agentwatch_wrapped__", False):
                w = _wrap_openai_init(ai)
                w.__agentwatch_wrapped__ = True  # type: ignore[attr-defined]
                anthropic.Anthropic.__init__ = w
                patched.append("anthropic.Anthropic")
    except Exception:
        pass

    _PATCHED = True
    if patched and not silent:
        print(f"✓ AgentWatch auto-instrumented: {', '.join(patched)}")
    return True


# Call ``install()`` from your app entrypoint, or:
#   import agentwatch.auto_instrument as aw; aw.install()
