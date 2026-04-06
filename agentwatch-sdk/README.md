# AgentWatch Python SDK

Production monitoring for AI agents: **rule-based checks** on every trace, optional **LLM judge analysis** when a step is flagged, plus async delivery to your AgentWatch API.

## Install

```bash
pip install agentwatch-io
```

From a clone of this repo (editable / dev):

```bash
pip install -e ./agentwatch-sdk
```

Import name is always `agentwatch` after either install.

## Quick start

```python
import agentwatch
import openai

agentwatch.init(
    api_key="aw_...",                 # Dashboard → API Keys
    server_url="http://localhost:8000",
    agent_name="my-agent",
)

client = agentwatch.watch(openai.OpenAI())

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello"}],
)
```

`init` alone does not trace calls — you must use `watch(client)` (or a patched default client) so requests go through the wrapper.

## LLM analysis (optional judge)

When **rule checks** flag a trace, the server can call **your** OpenAI, Anthropic, or **Groq** API with a judge prompt. Enable in `init`:

```python
import os

agentwatch.init(
    api_key="aw_...",
    server_url="https://your-api.example.com",
    agent_name="my-agent",
    deep_analysis=True,
    llm_provider="openai",
    llm_api_key=os.environ["OPENAI_API_KEY"],
    llm_model="gpt-4o-mini",
)
```

Your LLM key is sent only to your provider from the API process; AgentWatch does not log or store it.

## Parameters

| Parameter | Description |
|-----------|-------------|
| `api_key` | AgentWatch key (`aw_...`). |
| `server_url` | FastAPI base URL. |
| `agent_name` | Shown in dashboard. |
| `deep_analysis` | Enable LLM judge on flagged traces. |
| `llm_provider` | `"openai"`, `"anthropic"`, or `"groq"`. |
| `llm_api_key` | Provider key for judge (including Groq). |
| `groq_api_key` | Optional; same as putting the Groq key in `llm_api_key`. |
| `llm_model` | Optional model override. |
| `content_mode` | If True, server runs extra content-creation checks (repetition, length, injection phrases, off-topic heuristic). |
| `redact_fields` | Field names to redact in trace text. |
| `silent` | Suppress stdout from `init`. |

## Anthropic

```python
import anthropic

agentwatch.init(api_key="aw_...", server_url="...", agent_name="bot")
client = agentwatch.watch(anthropic.Anthropic())
client.messages.create(model="claude-3-5-haiku-20241022", max_tokens=256, messages=[...])
```

## Groq

Install [Groq’s Python SDK](https://console.groq.com/) (`pip install groq`). The client is OpenAI-compatible for `chat.completions`:

```python
import os
import agentwatch
from groq import Groq

agentwatch.init(
    api_key="aw_...",
    server_url="http://localhost:8000",
    agent_name="content-generator",
    deep_analysis=True,
    llm_provider="groq",
    llm_api_key=os.environ["GROQ_API_KEY"],
    llm_model="llama-3.3-70b-versatile",
)

client = agentwatch.watch(Groq())
client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[{"role": "user", "content": "Write a short paragraph about Python."}],
)
```

## Full documentation

See the **Documentation** page in the AgentWatch dashboard (`/docs`) for architecture, runs, alerts, and dashboard setup.
