# bioIDE

Zero-backend, dual-runtime (JS / Python) browser IDE.

## Packages

- `packages/core` — headless engine, file buffers, Comlink worker lifecycle
- `packages/react` — CodeMirror 6 wrappers and `<SynapseIDE />`
- `apps/demo` — Vite playground (editor left, terminal right)

## Setup

```bash
npm install
npm run dev
```

Then open the printed local URL. Switch runtime in the toolbar and click **Run**.

Python is lazy-loaded via Pyodide on first Python execution (CDN). JavaScript runs immediately in the worker.
