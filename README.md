
# bioIDE

Zero-backend JavaScript browser IDE for EEG.

<img width="1909" height="787" alt="image" src="https://github.com/user-attachments/assets/bbf61ce1-dcbe-4796-a39f-43cd568b3a92" />


## Packages

- `packages/core` — headless engine, file buffers, Comlink worker lifecycle
- `packages/react` — CodeMirror 6 wrappers and `<SynapseIDE />`
- `apps/demo` — Vite playground (editor left, terminal right)

## Runtime

Student JS runs in a Web Worker. The sandbox injects:

- `tf` (`@tensorflow/tfjs`, CPU backend)
- `EEG` / `Context.EEG` — latest streamed frame
- `bio` — windowed history, recording, features, and small models
- `console`, `check(condition, message)`
- `plot(title, values)` / `plot({ title, kind, labels, values|series })`

Plots render above stdout in Output.

The host keeps a rolling frame history (mock or live) and seeds the worker on Run. `EEG` is one frame. `bio.window(seconds)` is the time window behind it.

### `bio`

| Call | Role |
| --- | --- |
| `bio.window(seconds)` | frames in the last N seconds |
| `bio.signal(name\|channel, seconds)` | one series over that window |
| `bio.features(frames)` | mean bands + focus / relaxation |
| `bio.record(label, ms)` | wait, then append a labelled epoch |
| `bio.dataset()` | `{ X, y, labels }` for the session |
| `bio.logreg(X, y)` | L2 logistic regression |
| `bio.crossValScore(X, y, k)` | stratified k-fold, balanced accuracy |
| `bio.cohensD(a, b)` | within-session effect size |

Also: `mean`, `std`, `rms`, `zscore`, `fft`, `bandpower`, `kfold`, `trainTestSplit`, `accuracy`, `balancedAccuracy`, `confusion`, `sleep`, `clearDataset`, `epochs`.

The session dataset lives in the worker until reload. History is frame-rate (about 12-30 Hz), not the full 250 Hz raw stream.

## Recipes

The toolbar **Recipes** menu loads commented examples:

1. Hello EEG
2. Band tensor
3. Tiny predict
4. Train a blink
5. Focus gate
6. Assert a model
7. Window features
8. Calibrate a classifier

Click **Mock** (or **Connect**), pick a recipe, then **Run** (`Ctrl+Enter` / `⌘↵`). Window / calibrate recipes need the stream running first.

Optional hidden checks can be passed to `IdeEngine` (`checks` option or `setChecks()`). They are appended after the buffer on Run and never shown in the editor.

## Setup

```bash
npm install
npm run dev
```

Then open the printed local URL and click **Run**. JavaScript executes in a Web Worker.
