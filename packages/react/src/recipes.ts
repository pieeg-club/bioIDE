export interface Recipe {
  id: string;
  label: string;
  content: string;
}

export const RECIPES: Recipe[] = [
  {
    id: "hello-eeg",
    label: "Hello EEG",
    content: `// Recipe: Hello EEG
// Click Mock (or Connect) first, then Run.
// EEG is the latest frame from the broker. No hardware? Mock is identical.

const eeg = EEG;
if (!eeg) {
  console.log("no EEG yet — start Mock or Connect, then Run again");
} else {
  // bands are already DSP-cleaned on the main thread
  console.log(eeg.source, eeg.device, eeg.channels + " ch @" + eeg.sampleRate + " Hz");
  console.log("delta", eeg.delta.toFixed(3), "theta", eeg.theta.toFixed(3));
  console.log("alpha", eeg.alpha.toFixed(3), "beta", eeg.beta.toFixed(3), "gamma", eeg.gamma.toFixed(3));
  console.log("relaxation", (eeg.relaxation * 100).toFixed(0) + "%");
  console.log("focus", (eeg.focus * 100).toFixed(0) + "%");
}
`,
  },
  {
    id: "band-tensor",
    label: "Band tensor",
    content: `// Recipe: Band tensor
// tf is TensorFlow.js, already injected in the worker (CPU backend).
// Click Mock, then Run.

const eeg = EEG;
if (!eeg) throw new Error("start Mock or Connect first");

// one vector: [delta, theta, alpha, beta, gamma]
const x = tf.tensor1d([eeg.delta, eeg.theta, eeg.alpha, eeg.beta, eeg.gamma]);

console.log("shape", x.shape);           // [5]
console.log("bands", x.arraySync());
console.log("mean", Number(x.mean().arraySync()).toFixed(4));
console.log("max band", Number(x.max().arraySync()).toFixed(4));

// always dispose tensors you create — the worker is long-lived
x.dispose();
`,
  },
  {
    id: "tiny-predict",
    label: "Tiny predict",
    content: `// Recipe: Tiny predict
// Build a 5 → 8 → 1 network and score the current EEG frame.
// Weights are random until you train (see "Train a blink").

const eeg = EEG;
if (!eeg) throw new Error("start Mock or Connect first");

const model = tf.sequential();
model.add(tf.layers.dense({ units: 8, activation: "relu", inputShape: [5] }));
model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));
model.compile({ optimizer: "adam", loss: "binaryCrossentropy" });

const x = tf.tensor2d([[eeg.delta, eeg.theta, eeg.alpha, eeg.beta, eeg.gamma]]);
const out = model.predict(x);
const y = Array.isArray(out) ? out[0] : out;

console.log("layers", model.layers.length);
console.log("input", x.arraySync());
console.log("pred (untrained)", y.arraySync());

x.dispose();
y.dispose();
model.dispose();
`,
  },
  {
    id: "train-blink",
    label: "Train a blink",
    content: `// Recipe: Train a blink
// Fit a tiny classifier on synthetic samples around this EEG frame.
// Keep epochs small — this runs in the worker, not the UI thread.

const eeg = EEG;
if (!eeg) throw new Error("start Mock or Connect first");

const bands = [eeg.delta, eeg.theta, eeg.alpha, eeg.beta, eeg.gamma];

// 16 fake windows: even rows ≈ "relaxed", odd rows ≈ "focused"
const rows = [];
const labels = [];
for (let i = 0; i < 16; i++) {
  const noise = () => (Math.random() - 0.5) * 0.05;
  const focused = i % 2 === 1;
  rows.push([
    bands[0] + noise(),
    bands[1] + noise(),
    bands[2] + (focused ? -0.08 : 0.08) + noise(),
    bands[3] + (focused ? 0.08 : -0.08) + noise(),
    bands[4] + noise(),
  ]);
  labels.push([focused ? 1 : 0]);
}

const xs = tf.tensor2d(rows);
const ys = tf.tensor2d(labels);

const model = tf.sequential();
model.add(tf.layers.dense({ units: 8, activation: "relu", inputShape: [5] }));
model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));
model.compile({ optimizer: "adam", loss: "binaryCrossentropy" });

const hist = await model.fit(xs, ys, { epochs: 8, batchSize: 8, verbose: 0 });
const last = hist.history.loss.at(-1);
console.log("loss", Array.isArray(last) ? last[0] : last);

const live = tf.tensor2d([bands]);
const out = model.predict(live);
const pred = Array.isArray(out) ? out[0] : out;
const score = pred.dataSync()[0];
console.log("live focus-ish", (score * 100).toFixed(1) + "%");

xs.dispose();
ys.dispose();
live.dispose();
pred.dispose();
model.dispose();
`,
  },
  {
    id: "focus-gate",
    label: "Focus gate",
    content: `// Recipe: Focus gate
// DSP already computed focus / relaxation on the main thread.
// This is the "if brain state then …" pattern — no model required.

const eeg = EEG;
if (!eeg) throw new Error("start Mock or Connect first");

const FOCUS = 0.58;
const REST = 0.58;

console.log("focus", (eeg.focus * 100).toFixed(0) + "%");
console.log("relaxation", (eeg.relaxation * 100).toFixed(0) + "%");

if (eeg.focus >= FOCUS) {
  console.log("gate: focused — good moment to capture a sample");
} else if (eeg.relaxation >= REST) {
  console.log("gate: relaxed — hold still, let alpha rise");
} else {
  console.log("gate: mixed — blink, unclench jaw, check electrodes");
}

// optional assertion helpers (also used by hidden host checks)
check(eeg.focus >= 0 && eeg.focus <= 1, "focus should be 0..1");
check(eeg.relaxation >= 0 && eeg.relaxation <= 1, "relaxation should be 0..1");
`,
  },
  {
    id: "hidden-check",
    label: "Assert a model",
    content: `// Recipe: Assert a model
// check(condition, message) is injected. Hosts can also append hidden
// checks after your buffer via IdeEngine({ checks }) — they never appear here.

const model = tf.sequential();
model.add(tf.layers.dense({ units: 8, activation: "relu", inputShape: [5] }));
model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));

check(typeof tf !== "undefined", "tf is injected in the worker");
check(model.layers.length >= 2, "need at least 2 layers");
check(model.inputs[0].shape[1] === 5, "first layer should take 5 band powers");

console.log("model ok —", model.layers.length, "layers, input", model.inputs[0].shape);
model.dispose();
`,
  },
];
