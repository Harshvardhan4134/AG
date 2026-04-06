"""Manual smoke test for Groq + AgentWatch (requires GROQ_API_KEY and a running API)."""

import os

import agentwatch
from groq import Groq

# export AGENTWATCH_API_KEY=aw_...
# export GROQ_API_KEY=...
# export AGENTWATCH_URL=http://localhost:8000

agentwatch.init(
    api_key=os.environ.get("AGENTWATCH_API_KEY", "aw_devtest"),
    server_url=os.environ.get("AGENTWATCH_URL", "http://localhost:8000"),
    agent_name="content-generator",
    deep_analysis=True,
    llm_provider="groq",
    llm_api_key=os.environ.get("GROQ_API_KEY", ""),
    llm_model="llama-3.3-70b-versatile",
    content_mode=False,
    silent=True,
)

client = agentwatch.watch(Groq())

r = client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[{"role": "user", "content": "Say hello in one sentence."}],
)
print((r.choices[0].message.content or "")[:200])
