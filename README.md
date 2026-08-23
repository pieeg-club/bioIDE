# bioIDE

Zero-backend JavaScript browser IDE for EEG.

## Packages

- `packages/core` — headless engine, file buffers, Comlink worker lifecycle
- `packages/react` — CodeMirror 6 wrappers and `<SynapseIDE />`
- `apps/demo` — Vite playground (editor left, terminal right)

## Runtime

Student JS runs in a Web Worker. The sandbox injects `tf` (`@tensorflow/tfjs`, CPU backend), `EEG` / `Context.EEG`, `console`, and `check(condition, message)`.

Optional hidden checks can be passed to `IdeEngine` (`checks` option or `setChecks()`). They are appended after the buffer on Run and never shown in the editor.

## Setup

```bash
npm install
npm run dev
```

Then open the printed local URL and click **Run**. JavaScript executes in a Web Worker.
