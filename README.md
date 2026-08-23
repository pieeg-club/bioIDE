# bioIDE

Zero-backend JavaScript browser IDE for EEG.

## Packages

- `packages/core` — headless engine, file buffers, Comlink worker lifecycle
- `packages/react` — CodeMirror 6 wrappers and `<SynapseIDE />`
- `apps/demo` — Vite playground (editor left, terminal right)

## Setup

```bash
npm install
npm run dev
```

Then open the printed local URL and click **Run**. JavaScript executes in a Web Worker.
