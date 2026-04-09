let _state = {
  initialized: false,
  apiKey: "",
  serverUrl: "",
  deepConfig: {},
  agentName: "default",
  contentMode: false,
};

let _pending = 0;
let _pendingZeroResolve = null;
function _incPending() {
  _pending += 1;
  _pendingZeroResolve = null;
}
function _decPending() {
  _pending = Math.max(0, _pending - 1);
  if (_pending === 0 && _pendingZeroResolve) {
    try {
      _pendingZeroResolve(true);
    } catch {
      // ignore
    }
    _pendingZeroResolve = null;
  }
}

export function init({
  apiKey,
  serverUrl,
  agentName = "default",
  contentMode = false,
  deepAnalysis = false,
  llmProvider = "openai",
  llmApiKey = "",
  llmModel = "",
} = {}) {
  if (!apiKey) throw new Error("agentwatch.init: apiKey is required");
  if (!serverUrl) throw new Error("agentwatch.init: serverUrl is required");
  _state.initialized = true;
  _state.apiKey = apiKey;
  _state.serverUrl = String(serverUrl).replace(/\/$/, "");
  _state.agentName = agentName;
  _state.contentMode = !!contentMode;

  const judgeKey = llmApiKey || "";
  if (deepAnalysis && judgeKey) {
    _state.deepConfig = {
      enabled: true,
      provider: String(llmProvider || "openai").toLowerCase(),
      api_key: judgeKey,
      model: llmModel || "",
    };
  } else {
    _state.deepConfig = {};
  }
}

async function _postTrace(payload) {
  const url = _state.serverUrl + "/v1/trace";
  const headers = {
    Authorization: `Bearer ${_state.apiKey}`,
    "Content-Type": "application/json",
  };
  _incPending();
  // Best-effort: 2 attempts
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        if (r.ok) return;
      } catch {
        // ignore
      }
      if (attempt === 0) await new Promise((res) => setTimeout(res, 250));
    }
  } finally {
    _decPending();
  }
}

function _safeJson(x) {
  try {
    return JSON.stringify(x);
  } catch {
    return String(x);
  }
}

function _extractOutputText(response) {
  try {
    const ch0 = response?.choices?.[0];
    return ch0?.message?.content ?? "";
  } catch {
    return "";
  }
}

function _extractTokens(response) {
  const u = response?.usage;
  if (!u) return 0;
  return u.total_tokens ?? (u.prompt_tokens ?? 0) + (u.completion_tokens ?? 0);
}

export function watch(client, { provider = "openai" } = {}) {
  if (!_state.initialized) throw new Error("Call agentwatch.init() before agentwatch.watch()");
  if (!client?.chat?.completions?.create) {
    // Not an OpenAI-style chat client
    return client;
  }

  const originalCreate = client.chat.completions.create.bind(client.chat.completions);

  client.chat.completions.create = async (params = {}, options = {}) => {
    const runId = params.aw_run_id || crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    const agentName = params.aw_agent_name || _state.agentName || "default";
    const start = Date.now();
    const resp = await originalCreate(params, options);
    const latencyMs = Date.now() - start;

    const trace = {
      run_id: runId,
      agent_name: agentName,
      step_type: "llm_call",
      input: (_safeJson(params.messages || [])).slice(0, 2000),
      output: String(_extractOutputText(resp) || "").slice(0, 2000),
      model: resp?.model || params.model || "",
      provider,
      latency_ms: latencyMs,
      tokens: _extractTokens(resp),
      tool_calls: [],
      content_mode: _state.contentMode,
      deep_analysis_config: _state.deepConfig || {},
    };

    // fire-and-forget (don’t block caller)
    _postTrace(trace);
    return resp;
  };

  return client;
}

export async function flush({ timeoutMs = 3000 } = {}) {
  if (_pending === 0) return true;
  return await Promise.race([
    new Promise((resolve) => {
      _pendingZeroResolve = resolve;
    }),
    new Promise((resolve) => setTimeout(() => resolve(false), timeoutMs)),
  ]);
}

