# bioIDE

Zero-backend JavaScript browser IDE monorepo. Package manager: npm workspaces.

## Layout

- `packages/core`: headless TypeScript engine (buffers, worker lifecycle). No UI deps.
- `packages/react`: React wrappers and CodeMirror 6. Exports `SynapseIDE`.
- `apps/demo`: Vite + React playground.

## Rules

- JavaScript executes in a Web Worker via Comlink.
- TensorFlow.js is injected in the worker (`tf`). Optional hidden checks append after user code.
- `packages/core` must stay UI-free. No course / lesson UI.
- Do not add a backend. Do not add tests unless asked.
