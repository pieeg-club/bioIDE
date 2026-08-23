# bioIDE

Zero-backend JavaScript browser IDE for EEG.

## Packages

- `packages/core` — headless engine, file buffers, Comlink worker lifecycle
- `packages/react` — CodeMirror 6 wrappers and `<SynapseIDE />`
- `apps/demo` — Vite playground (editor left, terminal right)

## Runtime

Student JS runs in a Web Worker. The sandbox injects `tf` (`@tensorflow/tfjs`, CPU backend), `EEG` / `Context.EEG`, `console`, `check(condition, message)`, and `plot(title, values)` / `plot({ title, kind, labels, values|series })`. Plots render above stdout in Output.

The toolbar **Recipes** menu loads commented examples into the editor (EEG stream, tensors, predict, train, focus gate, assertions). Click Mock, pick a recipe, Run.

Optional hidden checks can be passed to `IdeEngine` (`checks` option or `setChecks()`). They are appended after the buffer on Run and never shown in the editor.

## Setup

```bash
npm install
npm run dev
```

Then open the printed local URL and click **Run**. JavaScript executes in a Web Worker.
