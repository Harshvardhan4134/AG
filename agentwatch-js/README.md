# agentwatch-io (JavaScript)

## 1) Preload (no app code changes)

```bash
npm install agentwatch-io
```

```bash
AGENTWATCH_KEY=aw_...
AGENTWATCH_SERVER_URL=https://your-agentwatch-api.example.com
NODE_OPTIONS=--require agentwatch-io/register
```

The package **`main`** is `register.cjs` (CommonJS). For ESM apps, use `import { init, watch } from "agentwatch-io"` (see `src/index.js`).

## 2) Explicit wrap

```js
const { init, watch } = require("agentwatch-io");
const { OpenAI } = require("openai");
init({ apiKey: process.env.AGENTWATCH_KEY, serverUrl: process.env.AGENTWATCH_SERVER_URL });
const client = watch(new OpenAI());
```

See also `docs/orbit-agentwatch-setup.md` in the AgentWatch repo.
