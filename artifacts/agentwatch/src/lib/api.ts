const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

const STORAGE_KEY = "agentwatch_api_key";

export function getStoredApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredApiKey(key: string) {
  localStorage.setItem(STORAGE_KEY, key);
}

export function clearStoredApiKey() {
  localStorage.removeItem(STORAGE_KEY);
}

async function firebaseToken(): Promise<string | null> {
  const { auth } = await import("./firebase");
  if (!auth?.currentUser) return null;
  return auth.currentUser.getIdToken();
}

export async function syncUser(email?: string | null, displayName?: string | null) {
  const token = await firebaseToken();
  if (!token) return;
  await fetch(`${API_BASE}/v1/user/sync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: email ?? undefined, display_name: displayName ?? undefined }),
  });
}

export async function fetchUserMe() {
  const token = await firebaseToken();
  if (!token) throw new Error("Not signed in");
  const r = await fetch(`${API_BASE}/v1/user/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{ user: Record<string, unknown> }>;
}

export async function patchUserMe(body: Record<string, unknown>) {
  const token = await firebaseToken();
  if (!token) throw new Error("Not signed in");
  const r = await fetch(`${API_BASE}/v1/user/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{ user: Record<string, unknown> }>;
}

export async function createApiKey(name: string) {
  const token = await firebaseToken();
  if (!token) throw new Error("Not signed in");
  const r = await fetch(`${API_BASE}/v1/api-keys`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{ api_key: string; key: Record<string, unknown> }>;
}

export async function listApiKeys() {
  const token = await firebaseToken();
  if (!token) throw new Error("Not signed in");
  const r = await fetch(`${API_BASE}/v1/api-keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{
    keys: Array<{
      id: string;
      name: string;
      key_prefix: string;
      created_at?: string;
      last_used_at?: string;
    }>;
  }>;
}

export async function deleteApiKey(keyId: string) {
  const token = await firebaseToken();
  if (!token) throw new Error("Not signed in");
  const r = await fetch(`${API_BASE}/v1/api-keys/${keyId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(await r.text());
}

function awHeaders() {
  const k = getStoredApiKey();
  if (!k) throw new Error("No AgentWatch API key");
  return { Authorization: `Bearer ${k}` };
}

export async function fetchStats() {
  const r = await fetch(`${API_BASE}/v1/stats`, { headers: awHeaders() });
  if (r.status === 401) throw new Error("Invalid API key");
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{
    total_traces: number;
    flagged_traces: number;
    ok_traces: number;
    flags_today: number;
    flags_by_type: Record<string, number>;
    last_24h: { traces: number; flagged: number };
  }>;
}

export async function fetchTraces(params?: { limit?: number; offset?: number; status?: string }) {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  if (params?.status) q.set("status", params.status);
  const r = await fetch(`${API_BASE}/v1/traces?${q}`, { headers: awHeaders() });
  if (r.status === 401) throw new Error("Invalid API key");
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{
    traces: Array<{
      run_id: string;
      agent_name: string;
      status: string;
      steps: number;
      latency_ms: number;
      created_at: string;
      flags: Array<{ flag_type: string; severity: string }>;
    }>;
    total: number;
  }>;
}

export async function fetchRunDetail(runId: string) {
  const r = await fetch(`${API_BASE}/v1/traces/${encodeURIComponent(runId)}`, {
    headers: awHeaders(),
  });
  if (r.status === 404) return null;
  if (r.status === 401) throw new Error("Invalid API key");
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{
    run_id: string;
    agent_name: string;
    created_at: string;
    steps: Array<Record<string, unknown>>;
    flags: unknown[];
  }>;
}

export { API_BASE };
