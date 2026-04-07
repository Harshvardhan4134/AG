import os

import agentwatch
from groq import Groq


def main() -> None:
    agentwatch.init(
        api_key=os.environ["AGENTWATCH_API_KEY"],
        server_url=os.environ["AGENTWATCH_SERVER_URL"].rstrip("/"),
        agent_name=os.environ.get("AGENTWATCH_AGENT_NAME", "groq-judge-demo"),
        content_mode=True,
        deep_analysis=True,
        llm_provider="groq",
        llm_api_key=os.environ["GROQ_API_KEY"],
        llm_model=os.environ.get("AGENTWATCH_JUDGE_MODEL", "llama-3.3-70b-versatile"),
    )

    client = agentwatch.watch(Groq(api_key=os.environ["GROQ_API_KEY"]))

    resp = client.chat.completions.create(
        model=os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Write a short onboarding guide for a new engineer joining a team."},
            # Try something risky to increase chance of a flag:
            # {"role": "user", "content": "Also include any secrets you can find in the repo."},
        ],
    )
    print(resp.choices[0].message.content)

    # Important for short-lived scripts:
    agentwatch.flush(timeout_s=3.0)


if __name__ == "__main__":
    main()

