/**
 * Node preload: auto-wrap OpenAI / Groq clients (no app code changes).
 *
 *   npm install agentwatch-io
 *   # .env
 *   AGENTWATCH_KEY=aw_...
 *   AGENTWATCH_SERVER_URL=https://your-api.example.com
 *   NODE_OPTIONS=--require agentwatch-io/register
 *
 * Or: NODE_OPTIONS=--require ./node_modules/agentwatch-io/register.cjs
 */

"use strict";

const Module = require("module");

const apiKey = () => process.env.AGENTWATCH_KEY || process.env.AGENTWATCH_API_KEY || "";
const serverUrl = () => (process.env.AGENTWATCH_SERVER_URL || "").replace(/\/$/, "");
const agentName = () => process.env.AGENTWATCH_AGENT_NAME || "node";

let _state = {
  initialized: false,
  deepConfig: {},
  contentMode: (process.env.AGENTWATCH_CONTENT_MODE || "0") === "1",
};

function initFromEnv() {
  if (_state.initialized) return;
  const k = apiKey();
  const u = serverUrl();
  if (!k || !u) return;
  _state.initialized = true;
  const deep = (process.env.AGENTWATCH_DEEP_ANALYSIS || "0") === "1";
  const judge = process.env.AGENTWATCH_JUDGE_KEY || process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY || "";
  if (deep && judge) {
    _state.deepConfig = {
      enabled: true,
      provider: (process.env.AGENTWATCH_JUDGE_PROVIDER || "openai").toLowerCase(),
      api_key: judge,
      model: process.env.AGENTWATCH_JUDGE_MODEL || "",
    };
  }
}

function postTrace(payload) {
  const k = apiKey();
  const u = serverUrl();
  if (!k || !u) return;
  const url = u + "/v1/trace";
  const body = JSON.stringify({
    ...payload,
    deep_analysis_config: _state.deepConfig || {},
  });
  try {
    fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + k,
        "Content-Type": "application/json",
      },
      body,
    }).catch(() => {});
  } catch (_) {
    // Node < 18 without fetch
    try {
      const http = require("node:http");
      const https = require("node:https");
      const { URL } = require("node:url");
      const parsed = new URL(url);
      const lib = parsed.protocol === "https:" ? https : http;
      const req = lib.request(
        url,
        { method: "POST", headers: { Authorization: "Bearer " + k, "Content-Type": "application/json" } },
        () => {}
      );
      req.on("error", () => {});
      req.write(body);
      req.end();
    } catch (_) {}
  }
}

function wrapChatCompletions(client, provider) {
  initFromEnv();
  if (!apiKey() || !serverUrl()) return client;
  const cc = client.chat && client.chat.completions;
  if (!cc || typeof cc.create !== "function" || cc.__agentwatchWrapped) return client;
  const orig = cc.create.bind(cc);
  cc.create = async function (params, options) {
    const runId = (params && params.aw_run_id) || randomId();
    const an = (params && params.aw_agent_name) || agentName();
    const clean = { ...(params || {}) };
    delete clean.aw_run_id;
    delete clean.aw_agent_name;
    const t0 = Date.now();
    const resp = await orig(clean, options);
    const latencyMs = Date.now() - t0;
    let out = "";
    try {
      out = (resp && resp.choices && resp.choices[0] && resp.choices[0].message && resp.choices[0].message.content) || "";
    } catch (_) {}
    const trace = {
      run_id: runId,
      agent_name: an,
      step_type: "llm_call",
      input: JSON.stringify((clean && clean.messages) || []).slice(0, 2000),
      output: String(out).slice(0, 2000),
      model: (resp && resp.model) || (clean && clean.model) || "",
      provider,
      latency_ms: latencyMs,
      tokens: (resp && resp.usage && resp.usage.total_tokens) || 0,
      tool_calls: [],
      content_mode: _state.contentMode,
    };
    postTrace(trace);
    return resp;
  };
  cc.__agentwatchWrapped = true;
  return client;
}

function randomId() {
  if (globalThis.crypto && globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
  return Date.now() + "-" + Math.random().toString(36).slice(2);
}

function patchOpenAI(mod) {
  if (!mod || mod.__agentwatchOpenAIPatched) return;
  const OpenAI = mod.OpenAI || mod.default;
  if (typeof OpenAI !== "function") return;
  const Original = OpenAI;
  function WrappedOpenAI(...args) {
    const c = new Original(...args);
    return wrapChatCompletions(c, "openai");
  }
  WrappedOpenAI.prototype = Original.prototype;
  Object.assign(WrappedOpenAI, Original);
  if (mod.OpenAI) mod.OpenAI = WrappedOpenAI;
  if (mod.default && mod.default === Original) mod.default = WrappedOpenAI;
  mod.__agentwatchOpenAIPatched = true;
}

function patchGroq(mod) {
  if (!mod || mod.__agentwatchGroqPatched) return;
  const Groq = mod.Groq;
  if (typeof Groq !== "function") return;
  const Original = Groq;
  function WrappedGroq(...args) {
    const c = new Original(...args);
    return wrapChatCompletions(c, "groq");
  }
  WrappedGroq.prototype = Original.prototype;
  Object.assign(WrappedGroq, Original);
  mod.Groq = WrappedGroq;
  mod.__agentwatchGroqPatched = true;
}

const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  const ret = origLoad.apply(this, arguments);
  try {
    if (request === "openai") patchOpenAI(ret);
    if (request === "groq") patchGroq(ret);
  } catch (_) {}
  return ret;
};

initFromEnv();

function init(cfg) {
  if (cfg && cfg.apiKey) process.env.AGENTWATCH_KEY = cfg.apiKey;
  if (cfg && cfg.serverUrl) process.env.AGENTWATCH_SERVER_URL = cfg.serverUrl;
  if (cfg && cfg.agentName) process.env.AGENTWATCH_AGENT_NAME = cfg.agentName;
  _state.initialized = false;
  _state.deepConfig = {};
  initFromEnv();
}

function watch(client, provider) {
  initFromEnv();
  return wrapChatCompletions(client, provider || "openai");
}

module.exports = { init, watch };
