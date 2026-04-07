# agentwatch-io (JavaScript)

Two ways to use this package:

## 1) Preload (no app code changes)

Install next to your app:

```bash
npm install agentwatch-io
```

In `.env` (or shell):

```bash
AGENTWATCH_KEY=aw_...
AGENTWATCH_SERVER_URL=https://your-agentwatch-api.example.com
NODE_OPTIONS=--require agentwatch-io/register
```

Then start your app as usual (`npm run dev`). The preload wraps `openai` and `groq` chat completion clients so traces POST to `/v1/trace`.

Use `agentwatch-io/register` (the `/register` export). The ESM `import` entry does not support `require()` preload.

## 2) Explicit wrap (ESM)

```js
import { init, watch } from "agentwatch-io";
import OpenAI from "openai";

init({ apiKey: process.env.AGENTWATCH_KEY, serverUrl: process.env.AGENTWATCH_SERVER_URL });
const client = watch(new OpenAI());
```
