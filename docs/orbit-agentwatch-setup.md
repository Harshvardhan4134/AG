# Orbit-Ai + AgentWatch (no app code changes)

Wire AgentWatch into Orbit by installing the Node package and preloading its register hook. OpenAI- and Groq-compatible clients are patched when the process starts.

## 1. Install

From your Orbit-Ai project root:

```bash
npm install agentwatch-io
```

## 2. Environment

Add to **`.env`** (or export in your shell before `npm run dev`):

```bash
AGENTWATCH_API_KEY=aw_your_key_from_dashboard
AGENTWATCH_SERVER_URL=https://your-cloud-run-agentwatch-api.example.com
AGENTWATCH_AGENT_NAME=orbit
NODE_OPTIONS=--require agentwatch-io/register
```

`AGENTWATCH_KEY` is accepted as an alias for `AGENTWATCH_API_KEY` (same as the preload).

The **`agentwatch-io/register`** entry is a CommonJS preload. Keep `NODE_OPTIONS` on one line or set it in your process manager so every Node process that runs Orbit loads the patch.

## 3. Run Orbit as usual

```bash
npm run dev
```

Traces are sent to your AgentWatch API when compatible clients are constructed after the preload has patched the modules.

## 4. Dashboard

Open your AgentWatch dashboard, enter the **same** `aw_...` key in the UI (so the browser can call your API with the correct tenant), and confirm events under **Traces** / **Dashboard**.

## Optional — manual init (no `NODE_OPTIONS`)

```js
const { init, watch } = require("agentwatch-io");
const { OpenAI } = require("openai");

init({
  apiKey: process.env.AGENTWATCH_API_KEY,
  serverUrl: process.env.AGENTWATCH_SERVER_URL,
});
const client = watch(new OpenAI());
```

Do **not** commit real API keys. Rotate any key that was pasted into chat or committed.
