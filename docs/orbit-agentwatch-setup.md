# Orbit-Ai + AgentWatch (no app code changes)

## 1. Install

From your Orbit-Ai project root:

```bash
npm install agentwatch-io
```

## 2. Environment

Add to **`.env`** (or your shell before `npm run dev`):

```bash
AGENTWATCH_KEY=aw_your_key_from_dashboard
AGENTWATCH_SERVER_URL=https://your-cloud-run-agentwatch-api.example.com
AGENTWATCH_AGENT_NAME=orbit
NODE_OPTIONS=--require agentwatch-io/register
```

Use the **`/register`** export (CommonJS preload). Example:

```bash
NODE_OPTIONS=--require agentwatch-io/register
```

## 3. Run Orbit as usual

```bash
npm run dev
```

Traces are sent to your AgentWatch API when OpenAI- or Groq-compatible clients are loaded after the preload patches those modules.

## 4. Dashboard

Open your AgentWatch dashboard, set the **same** `aw_...` key in the UI, and confirm traces under **Traces** / **Dashboard**.

## Optional — manual init (no NODE_OPTIONS)

```js
const { init, watch } = require("agentwatch-io");
const OpenAI = require("openai").OpenAI;
init({ apiKey: process.env.AGENTWATCH_KEY, serverUrl: process.env.AGENTWATCH_SERVER_URL });
const client = watch(new OpenAI());
```

Do **not** commit real API keys. Rotate any key that was pasted into chat or committed.
