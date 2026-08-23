export const SDK_DOCS = "https://docs.pieeg.com/software/api/javascript-sdk/";

export interface ApiItem {
  name: string;
  type: "variable" | "property" | "function" | "class";
  detail: string;
  info: string;
  apply?: string;
}

export const FREQUENCY_BANDS = [
  { name: "Delta", low: 0.5, high: 4 },
  { name: "Theta", low: 4, high: 8 },
  { name: "Alpha", low: 8, high: 13 },
  { name: "Beta", low: 13, high: 30 },
  { name: "Gamma", low: 30, high: 100 },
] as const;

export const SANDBOX_API: ApiItem[] = [
  {
    name: "EEG",
    type: "variable",
    detail: "latest frame",
    info: "Latest streamed frame, or null if idle. Start Mock or Connect first.",
    apply: "EEG",
  },
  {
    name: "EEG.alpha",
    type: "property",
    detail: "8-13 Hz",
    info: "Latest alpha band power (averaged across channels).",
    apply: "EEG.alpha",
  },
  {
    name: "EEG.beta",
    type: "property",
    detail: "13-30 Hz",
    info: "Latest beta band power.",
    apply: "EEG.beta",
  },
  {
    name: "EEG.theta",
    type: "property",
    detail: "4-8 Hz",
    info: "Latest theta band power.",
    apply: "EEG.theta",
  },
  {
    name: "EEG.delta",
    type: "property",
    detail: "0.5-4 Hz",
    info: "Latest delta band power.",
    apply: "EEG.delta",
  },
  {
    name: "EEG.gamma",
    type: "property",
    detail: "30-100 Hz",
    info: "Latest gamma band power.",
    apply: "EEG.gamma",
  },
  {
    name: "EEG.focus",
    type: "property",
    detail: "beta / (beta + theta)",
    info: "Focus index from the SDK, 0..1.",
    apply: "EEG.focus",
  },
  {
    name: "EEG.relaxation",
    type: "property",
    detail: "alpha / (alpha + beta)",
    info: "Relaxation index from the SDK, 0..1.",
    apply: "EEG.relaxation",
  },
  {
    name: "EEG.meditation",
    type: "property",
    detail: "(theta + alpha) / total",
    info: "Meditation index from the SDK, 0..1.",
    apply: "EEG.meditation",
  },
  {
    name: "EEG.raw",
    type: "property",
    detail: "µV snapshot",
    info: "Latest per-channel sample (one frame, not the full 250 Hz stream).",
    apply: "EEG.raw",
  },
  {
    name: "EEG.bands",
    type: "property",
    detail: "Delta..Gamma",
    info: "Named band powers for this frame.",
    apply: "EEG.bands",
  },
  {
    name: "EEG.source",
    type: "property",
    detail: "mock | live",
    info: "Where the frame came from.",
    apply: "EEG.source",
  },
  {
    name: "EEG.device",
    type: "property",
    detail: "board id",
    info: "Connected or mock device id.",
    apply: "EEG.device",
  },
  {
    name: "EEG.channels",
    type: "property",
    detail: "channel count",
    info: "Number of electrodes on this stream.",
    apply: "EEG.channels",
  },
  {
    name: "EEG.sampleRate",
    type: "property",
    detail: "Hz",
    info: "Device sample rate (250 or 500). History itself is frame-rate.",
    apply: "EEG.sampleRate",
  },
  {
    name: "bio.window",
    type: "function",
    detail: "(seconds) => window",
    info: "Frames from the last N seconds. Needs Mock or Connect running.",
    apply: "bio.window(2)",
  },
  {
    name: "bio.signal",
    type: "function",
    detail: "(name|ch, seconds) => number[]",
    info: 'Time series. Name is "alpha".."meditation", or a raw channel index.',
    apply: 'bio.signal("alpha", 2)',
  },
  {
    name: "bio.features",
    type: "function",
    detail: "(frames) => number[]",
    info: "Mean band powers plus focus and relaxation. Order: bio.featureNames.",
    apply: "bio.features(bio.window(2).frames)",
  },
  {
    name: "bio.record",
    type: "function",
    detail: "(label, ms) => epoch",
    info: "Wait while the stream runs, then append a labelled epoch to the session dataset.",
    apply: 'await bio.record("rest", 1000)',
  },
  {
    name: "bio.dataset",
    type: "function",
    detail: "() => { X, y, labels }",
    info: "Session epochs as a training table. Lives in the worker until reload.",
    apply: "bio.dataset()",
  },
  {
    name: "bio.clearDataset",
    type: "function",
    detail: "() => void",
    info: "Drop all recorded epochs.",
    apply: "bio.clearDataset()",
  },
  {
    name: "bio.epochs",
    type: "function",
    detail: "() => Epoch[]",
    info: "Copy of recorded epochs.",
    apply: "bio.epochs()",
  },
  {
    name: "bio.isFocused",
    type: "function",
    detail: "(threshold = 0.6)",
    info: "True when EEG.focus is above the threshold. Same rule as the SDK.",
    apply: "bio.isFocused(0.6)",
  },
  {
    name: "bio.isRelaxed",
    type: "function",
    detail: "(threshold = 0.6)",
    info: "True when EEG.relaxation is above the threshold. Same rule as the SDK.",
    apply: "bio.isRelaxed(0.6)",
  },
  {
    name: "bio.bandPower",
    type: "function",
    detail: '(name) => number',
    info: 'Latest band: "Delta", "Theta", "Alpha", "Beta", or "Gamma".',
    apply: 'bio.bandPower("Alpha")',
  },
  {
    name: "bio.bands",
    type: "property",
    detail: "band definitions",
    info: "Name and Hz range for each frequency band (same cutoffs as the SDK).",
    apply: "bio.bands",
  },
  {
    name: "bio.sleep",
    type: "function",
    detail: "(ms) => Promise",
    info: "Wait while frames keep arriving. Use inside an async recipe.",
    apply: "await bio.sleep(1000)",
  },
  {
    name: "bio.mean",
    type: "function",
    detail: "(values) => number",
    info: "Arithmetic mean.",
    apply: "bio.mean(values)",
  },
  {
    name: "bio.std",
    type: "function",
    detail: "(values) => number",
    info: "Sample standard deviation.",
    apply: "bio.std(values)",
  },
  {
    name: "bio.rms",
    type: "function",
    detail: "(values) => number",
    info: "Root-mean-square.",
    apply: "bio.rms(values)",
  },
  {
    name: "bio.zscore",
    type: "function",
    detail: "(values) => number[]",
    info: "Standardize a series.",
    apply: "bio.zscore(values)",
  },
  {
    name: "bio.cohensD",
    type: "function",
    detail: "(a, b) => number",
    info: "Within-session effect size. Positive means b > a on average.",
    apply: "bio.cohensD(a, b)",
  },
  {
    name: "bio.fft",
    type: "function",
    detail: "(signal) => magnitudes",
    info: "Radix-2 magnitude spectrum. Input is padded to the next power of two.",
    apply: "bio.fft(signal)",
  },
  {
    name: "bio.bandpower",
    type: "function",
    detail: "(signal, hz, [lo, hi])",
    info: "Average power of a time series in a frequency range.",
    apply: "bio.bandpower(signal, 250, [8, 13])",
  },
  {
    name: "bio.logreg",
    type: "function",
    detail: "(X, y) => model",
    info: "L2 logistic regression. model.predict(x) / model.predictProba(x).",
    apply: "bio.logreg(data.X, data.y)",
  },
  {
    name: "bio.crossValScore",
    type: "function",
    detail: "(X, y, k = 5)",
    info: "Stratified k-fold. Returns accuracy, balancedAccuracy, folds.",
    apply: "bio.crossValScore(data.X, data.y, 5)",
  },
  {
    name: "bio.kfold",
    type: "function",
    detail: "(labels, k) => splits",
    info: "Stratified fold indices.",
    apply: "bio.kfold(data.y, 5)",
  },
  {
    name: "bio.trainTestSplit",
    type: "function",
    detail: "(n, ratio = 0.75)",
    info: "Shuffled train / test indices.",
    apply: "bio.trainTestSplit(data.X.length, 0.75)",
  },
  {
    name: "bio.accuracy",
    type: "function",
    detail: "(truth, pred)",
    info: "Fraction of matching labels.",
    apply: "bio.accuracy(truth, pred)",
  },
  {
    name: "bio.balancedAccuracy",
    type: "function",
    detail: "(truth, pred)",
    info: "Mean of per-class recall. Use this when classes are uneven.",
    apply: "bio.balancedAccuracy(truth, pred)",
  },
  {
    name: "bio.confusion",
    type: "function",
    detail: "(truth, pred)",
    info: "{ labels, matrix } counts.",
    apply: "bio.confusion(truth, pred)",
  },
  {
    name: "bio.help",
    type: "function",
    detail: "() => string",
    info: "Printable sandbox API. Also see the API panel and the SDK docs.",
    apply: "console.log(bio.help())",
  },
  {
    name: "plot",
    type: "function",
    detail: "(spec | title, values)",
    info: 'Draw in Output. plot({ title, kind: "bar"|"line", labels, values }).',
    apply: 'plot({ title: "bands", kind: "bar", values: [EEG.delta, EEG.theta, EEG.alpha, EEG.beta, EEG.gamma] })',
  },
  {
    name: "check",
    type: "function",
    detail: "(condition, message)",
    info: "Assert. Logs pass/fail and throws if the condition is false.",
    apply: 'check(EEG, "start Mock or Connect first")',
  },
  {
    name: "tf",
    type: "class",
    detail: "TensorFlow.js",
    info: "CPU backend, already ready. Dispose tensors when you are done.",
    apply: "tf",
  },
  {
    name: "console.log",
    type: "function",
    detail: "(...args)",
    info: "Writes to Output.",
    apply: "console.log(EEG)",
  },
];

export const SANDBOX_HELP = `Sandbox (runs in a Web Worker)

1. Click Mock or Connect so a stream is running.
2. Type EEG. or bio. for completions.
3. Run (Ctrl+Enter / Cmd+Enter).

EEG          latest frame (or null)
bio.window   last N seconds of frames
bio.record   labelled epoch for training
bio.dataset  { X, y, labels }
plot / check / tf

SDK docs: ${SDK_DOCS}
`;
