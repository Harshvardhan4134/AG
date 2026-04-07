import os

import agentwatch


def _env(name: str, default: str | None = None) -> str:
    v = os.environ.get(name, default)
    if v is None or v == "":
        raise RuntimeError(f"Missing env var: {name}")
    return v


def main() -> None:
    # Required
    aw_key = _env("AGENTWATCH_API_KEY")
    server_url = _env("AGENTWATCH_SERVER_URL").rstrip("/")

    # Optional knobs
    agent_name = os.environ.get("AGENTWATCH_AGENT_NAME", "standalone-runner")
    provider = os.environ.get("AW_PROVIDER", "groq").lower()  # groq | openai | anthropic
    prompt = os.environ.get("AW_PROMPT", "Write a short onboarding guide for a new engineer joining a team.")
    model = os.environ.get("AW_MODEL", "llama-3.3-70b-versatile")

    deep_analysis = os.environ.get("AW_DEEP_ANALYSIS", "1") not in ("0", "false", "False")
    content_mode = os.environ.get("AW_CONTENT_MODE", "1") not in ("0", "false", "False")

    # Judge key (optional but recommended if deep_analysis=1)
    groq_key = os.environ.get("GROQ_API_KEY", "")
    openai_key = os.environ.get("OPENAI_API_KEY", "")
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
    llm_api_key = (
        groq_key
        if provider == "groq"
        else openai_key
        if provider == "openai"
        else anthropic_key
    )

    agentwatch.init(
        api_key=aw_key,
        server_url=server_url,
        agent_name=agent_name,
        content_mode=content_mode,
        deep_analysis=deep_analysis,
        llm_provider=provider,
        llm_api_key=llm_api_key,
        llm_model=os.environ.get("AW_JUDGE_MODEL", model),
        silent=False,
    )

    if provider == "groq":
        from groq import Groq

        client = agentwatch.watch(Groq(api_key=groq_key or None))
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
        )
        print(resp.choices[0].message.content)

    elif provider == "openai":
        import openai

        client = agentwatch.watch(openai.OpenAI(api_key=openai_key or None))
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
        )
        print(resp.choices[0].message.content)

    elif provider == "anthropic":
        import anthropic

        client = agentwatch.watch(anthropic.Anthropic(api_key=anthropic_key or None))
        resp = client.messages.create(
            model=model,
            max_tokens=int(os.environ.get("AW_MAX_TOKENS", "256")),
            messages=[{"role": "user", "content": prompt}],
        )
        # anthropic response shape
        out = ""
        try:
            out = resp.content[0].text  # type: ignore[attr-defined]
        except Exception:
            out = str(resp)
        print(out)

    else:
        raise RuntimeError("AW_PROVIDER must be one of: groq, openai, anthropic")

    # Important: flush buffered trace sends for short-lived script
    agentwatch.flush(timeout_s=float(os.environ.get("AW_FLUSH_S", "3.0")))


if __name__ == "__main__":
    main()

