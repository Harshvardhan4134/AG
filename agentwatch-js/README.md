# `agentwatch-io` (Node.js)

Instrument OpenAI- and Groq-compatible clients without changing call sites: preload **`agentwatch-io/register`**, or call **`init()`** then **`watch()`** on each client.

| | |
|--|--|
| **npm package** | `agentwatch-io` |
| **Preload entry** | `agentwatch-io/register` (CommonJS) |

## Preload (recommended)

```bash
npm install agentwatch-io
```

```bash
AGENTWATCH_API_KEY=aw_...
AGENTWATCH_SERVER_URL=https://your-agentwatch-api.example.com
AGENTWATCH_AGENT_NAME=my-service
NODE_OPTIONS=--require agentwatch-io/register
```

`AGENTWATCH_KEY` works the same as `AGENTWATCH_API_KEY`.

The package **`main`** points at `register.cjs`. For ESM apps you can still use `import { init, watch } from "agentwatch-io"` (see `src/index.js`).

## Explicit wrap

```js
const { init, watch } = require("agentwatch-io");
const { OpenAI } = require("openai");

init({
  apiKey: process.env.AGENTWATCH_API_KEY,
  serverUrl: process.env.AGENTWATCH_SERVER_URL,
});
const client = watch(new OpenAI());
```

## Orbit-Ai

Step-by-step: [docs/orbit-agentwatch-setup.md](../docs/orbit-agentwatch-setup.md) in this repo.

## Full guide

Use the dashboard at **`/docs`** after deploy for rules, judge, runs, and API behavior.
