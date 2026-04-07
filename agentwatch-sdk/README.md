# AgentWatch Python SDK (`agentwatch-io`)

Server-side rule checks on every trace, optional **LLM judge** (your OpenAI / Anthropic / Groq key), and async delivery to your AgentWatch API.

| | |
|--|--|
| **PyPI package** | `agentwatch-io` |
| **Import** | `import agentwatch` |

## Install

```bash
pip install agentwatch-io
```

Editable install from a clone:

```bash
pip install -e ./agentwatch-sdk
```

## Quick start

```python
import os
import agentwatch
import openai

agentwatch.init(
    api_key=os.environ["AGENTWATCH_API_KEY"],
    server_url=os.environ["AGENTWATCH_SERVER_URL"],
    agent_name="my-agent",
)

client = agentwatch.watch(openai.OpenAI())

client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello"}],
)

agentwatch.flush(timeout_s=3.0)
```

`init()` does not trace by itself — you must **`watch()`** the client used for completions. Use **`flush()`** in short scripts so traces upload before exit.

## Environment variables (recommended)

| Variable | Purpose |
|----------|---------|
| `AGENTWATCH_API_KEY` | `aw_...` key from the dashboard |
| `AGENTWATCH_SERVER_URL` | API base URL (HTTPS, no trailing slash) |

## Groq

```bash
pip install groq
```

```python
import os
import agentwatch
from groq import Groq

agentwatch.init(
    api_key=os.environ["AGENTWATCH_API_KEY"],
    server_url=os.environ["AGENTWATCH_SERVER_URL"],
    agent_name="my-agent",
)

client = agentwatch.watch(Groq())
client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[{"role": "user", "content": "Hello"}],
)
```

## Anthropic

```python
import anthropic

agentwatch.init(api_key="aw_...", server_url="https://...", agent_name="bot")
client = agentwatch.watch(anthropic.Anthropic())
client.messages.create(model="claude-3-5-haiku-20241022", max_tokens=256, messages=[...])
```

## Optional auto-instrument

If `AGENTWATCH_API_KEY` and `AGENTWATCH_SERVER_URL` are set:

```python
import agentwatch.auto_instrument as aw
aw.install()
```

Patches constructors for `OpenAI`, `Groq`, and `Anthropic` so new clients are traced without calling `watch()` manually.

## LLM judge (server-side)

When rules flag a trace, the API can call **your** provider. Configure the judge from `init()`:

```python
agentwatch.init(
    api_key=os.environ["AGENTWATCH_API_KEY"],
    server_url=os.environ["AGENTWATCH_SERVER_URL"],
    agent_name="my-agent",
    deep_analysis=True,
    llm_provider="openai",
    llm_api_key=os.environ["OPENAI_API_KEY"],
    llm_model="gpt-4o-mini",
)
```

Your provider key is sent only to that provider from the AgentWatch API process; it is not stored by AgentWatch.

## CLI

```bash
python -m agentwatch ping
```

Checks `GET /health` on `AGENTWATCH_SERVER_URL`.

## Parameters

| Parameter | Description |
|-----------|-------------|
| `api_key` | AgentWatch key (`aw_...`). |
| `server_url` | FastAPI base URL, no trailing slash. |
| `agent_name` | Shown in the dashboard. |
| `deep_analysis` | Enable LLM judge for eligible flags. |
| `llm_provider` | `"openai"`, `"anthropic"`, or `"groq"`. |
| `llm_api_key` | Provider key for the judge. |
| `groq_api_key` | Optional; same as putting the Groq key in `llm_api_key`. |
| `llm_model` | Optional model override. |
| `content_mode` | Extra content checks on the server. |
| `redact_fields` | Field names to redact in trace payloads. |
| `silent` | Suppress stdout from `init`. |

## More documentation

In-app guide: open your deployed dashboard at **`/docs`**.
