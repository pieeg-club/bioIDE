# bioIDE

Zero-backend JavaScript browser IDE monorepo. Package manager: npm workspaces.

## Layout

- `packages/core`: headless TypeScript engine (buffers, worker lifecycle). No UI deps.
- `packages/react`: React wrappers and CodeMirror 6. Exports `SynapseIDE`.
- `apps/demo`: Vite + React playground.

## Rules

- JavaScript executes in a Web Worker via Comlink.
- `packages/core` must stay UI-free.
- Do not add a backend. Do not add tests unless asked.
