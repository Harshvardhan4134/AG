/**
 * Standalone AgentWatch runner (no app code changes).
 *
 * Requires:
 *  - AGENTWATCH_API_KEY
 *  - AGENTWATCH_SERVER_URL (no trailing slash)
 *
 * Provider keys (one of):
 *  - GROQ_API_KEY (default)
 *  - OPENAI_API_KEY
 *
 * Optional:
 *  - AW_PROVIDER=groq|openai
 *  - AW_MODEL=...
 *  - AW_PROMPT=...
 *  - AW_AGENT_NAME=...
 */

const env = (k, d) => {
  const v = process.env[k] ?? d;
  if (v === undefined || v === "") throw new Error(`Missing env var: ${k}`);
  return v;
};

const AW_KEY = env("AGENTWATCH_API_KEY");
const AW_SERVER = env("AGENTWATCH_SERVER_URL").replace(/\/$/, "");
const PROVIDER = (process.env.AW_PROVIDER ?? "groq").toLowerCase();
const MODEL = process.env.AW_MODEL ?? (PROVIDER === "openai" ? "gpt-4o-mini" : "llama-3.3-70b-versatile");
const PROMPT = process.env.AW_PROMPT ?? "Write a short onboarding guide for a new engineer joining a team.";
const AGENT_NAME = process.env.AW_AGENT_NAME ?? "standalone-js-runner";
const CONTENT_MODE = (process.env.AW_CONTENT_MODE ?? "1") !== "0";

const deepAnalysis = (process.env.AW_DEEP_ANALYSIS ?? "1") !== "0";
const judgeModel = process.env.AW_JUDGE_MODEL ?? MODEL;

const providerKey =
  PROVIDER === "openai" ? (process.env.OPENAI_API_KEY ?? "") : (process.env.GROQ_API_KEY ?? "");
if (deepAnalysis && !providerKey) {
  // Judge is optional, but if enabled you need a key.
  // We still run; server will just skip judge if key missing.
}

async function callOpenAICompatibleChat({ baseUrl, apiKey, model, prompt }) {
  const url = baseUrl.replace(/\/$/, "") + "/chat/completions";
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`LLM error (${r.status}): ${t}`);
  }
  return await r.json();
}

async function postTrace(trace) {
  const url = AW_SERVER + "/v1/trace";
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AW_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(trace),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`AgentWatch API error (${r.status}): ${t}`);
  }
}

function uuid() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function safeString(x) {
  try {
    return typeof x === "string" ? x : JSON.stringify(x);
  } catch {
    return String(x);
  }
}

async function main() {
  const runId = uuid();

  const llmStart = Date.now();
  const resp =
    PROVIDER === "openai"
      ? await callOpenAICompatibleChat({
          baseUrl: "https://api.openai.com/v1",
          apiKey: process.env.OPENAI_API_KEY,
          model: MODEL,
          prompt: PROMPT,
        })
      : await callOpenAICompatibleChat({
          baseUrl: "https://api.groq.com/openai/v1",
          apiKey: process.env.GROQ_API_KEY,
          model: MODEL,
          prompt: PROMPT,
        });
  const latencyMs = Date.now() - llmStart;

  const output = resp?.choices?.[0]?.message?.content ?? "";
  console.log(output);

  const trace = {
    run_id: runId,
    agent_name: AGENT_NAME,
    step_type: "llm_call",
    input: safeString([{ role: "user", content: PROMPT }]).slice(0, 2000),
    output: String(output).slice(0, 2000),
    model: resp?.model ?? MODEL,
    provider: PROVIDER,
    latency_ms: latencyMs,
    tokens: resp?.usage?.total_tokens ?? 0,
    tool_calls: [],
    content_mode: CONTENT_MODE,
    deep_analysis_config:
      deepAnalysis && providerKey
        ? { enabled: true, provider: PROVIDER, api_key: providerKey, model: judgeModel }
        : {},
  };

  await postTrace(trace);
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exitCode = 1;
});

