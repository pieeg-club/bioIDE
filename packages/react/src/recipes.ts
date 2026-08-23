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
// EEG is the latest frame from the broker. plot() draws in Output.

const eeg = EEG;
if (!eeg) {
  console.log("no EEG yet — start Mock or Connect, then Run again");
} else {
  console.log(eeg.source, eeg.device, eeg.channels + " ch @" + eeg.sampleRate + " Hz");
  console.log("relaxation", (eeg.relaxation * 100).toFixed(0) + "%");
  console.log("focus", (eeg.focus * 100).toFixed(0) + "%");

  plot({
    title: "band powers",
    kind: "bar",
    labels: ["delta", "theta", "alpha", "beta", "gamma"],
    values: [eeg.delta, eeg.theta, eeg.alpha, eeg.beta, eeg.gamma],
  });
  plot({ title: "raw window", kind: "line", values: eeg.raw });
}
`,
  },
  {
    id: "band-tensor",
    label: "Band tensor",
    content: `// Recipe: Band tensor
// tf is injected in the worker. plot() accepts tensors too.
// Click Mock, then Run.

const eeg = EEG;
if (!eeg) throw new Error("start Mock or Connect first");

const x = tf.tensor1d([eeg.delta, eeg.theta, eeg.alpha, eeg.beta, eeg.gamma]);

console.log("shape", x.shape);
console.log("mean", Number(x.mean().arraySync()).toFixed(4));

plot({
  title: "tf.tensor1d bands",
  kind: "bar",
  labels: ["δ", "θ", "α", "β", "γ"],
  values: x,
});

x.dispose();
`,
  },
  {
    id: "tiny-predict",
    label: "Tiny predict",
    content: `// Recipe: Tiny predict
// Untrained 5 → 8 → 1 net. Plot the input next to the random score.

const eeg = EEG;
if (!eeg) throw new Error("start Mock or Connect first");

const model = tf.sequential();
model.add(tf.layers.dense({ units: 8, activation: "relu", inputShape: [5] }));
model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));
model.compile({ optimizer: "adam", loss: "binaryCrossentropy" });

const bands = [eeg.delta, eeg.theta, eeg.alpha, eeg.beta, eeg.gamma];
const x = tf.tensor2d([bands]);
const out = model.predict(x);
const y = Array.isArray(out) ? out[0] : out;
const score = y.dataSync()[0];

console.log("layers", model.layers.length);
console.log("pred (untrained)", score.toFixed(3));

plot({
  title: "input bands",
  kind: "bar",
  labels: ["δ", "θ", "α", "β", "γ"],
  values: bands,
});
plot({
  title: "untrained score",
  kind: "bar",
  labels: ["focus-ish"],
  values: [score],
});

x.dispose();
y.dispose();
model.dispose();
`,
  },
  {
    id: "train-blink",
    label: "Train a blink",
    content: `// Recipe: Train a blink
// Fit a tiny classifier, then plot the loss curve.
// Keep epochs small — this runs in the worker.

const eeg = EEG;
if (!eeg) throw new Error("start Mock or Connect first");

const bands = [eeg.delta, eeg.theta, eeg.alpha, eeg.beta, eeg.gamma];
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
const loss = hist.history.loss.map((value) =>
  Array.isArray(value) ? value[0] : value,
);

const live = tf.tensor2d([bands]);
const out = model.predict(live);
const pred = Array.isArray(out) ? out[0] : out;
const score = pred.dataSync()[0];

console.log("final loss", loss.at(-1));
console.log("live focus-ish", (score * 100).toFixed(1) + "%");

plot({ title: "training loss", kind: "line", values: loss });
plot({
  title: "live score",
  kind: "bar",
  labels: ["focus-ish"],
  values: [score],
});

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
// DSP already computed focus / relaxation. Plot the two scores.

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

plot({
  title: "state",
  kind: "bar",
  labels: ["focus", "relax", "gate"],
  values: [eeg.focus, eeg.relaxation, FOCUS],
});

check(eeg.focus >= 0 && eeg.focus <= 1, "focus should be 0..1");
check(eeg.relaxation >= 0 && eeg.relaxation <= 1, "relaxation should be 0..1");
`,
  },
  {
    id: "hidden-check",
    label: "Assert a model",
    content: `// Recipe: Assert a model
// check() still works. plot() can chart layer sizes.

const model = tf.sequential();
model.add(tf.layers.dense({ units: 8, activation: "relu", inputShape: [5] }));
model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));

check(typeof tf !== "undefined", "tf is injected in the worker");
check(model.layers.length >= 2, "need at least 2 layers");
check(model.inputs[0].shape[1] === 5, "first layer should take 5 band powers");

plot({
  title: "units per layer",
  kind: "bar",
  labels: model.layers.map((layer, i) => (i + 1) + " " + layer.name),
  values: model.layers.map((layer) => layer.units ?? 0),
});

console.log("model ok —", model.layers.length, "layers");
model.dispose();
`,
  },
];
