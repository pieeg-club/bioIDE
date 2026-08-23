// Pure, stateless EEG/ML helpers for the worker sandbox.
// No DOM, no tf dependency: deterministic numeric building blocks that user
// code composes into feature extraction, cross-validation and small models.

export interface LabeledSplit {
  trainIndex: number[];
  testIndex: number[];
}

export interface LogRegModel {
  classes: string[];
  predict(x: number[]): string;
  predictProba(x: number[]): number[];
  weights: number[][];
}

export interface CvResult {
  accuracy: number;
  balancedAccuracy: number;
  folds: number;
}

const EPS = 1e-9;

export function mean(values: number[]): number {
  if (!values.length) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

export function std(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  let acc = 0;
  for (const v of values) acc += (v - m) * (v - m);
  return Math.sqrt(acc / (values.length - 1));
}

export function rms(values: number[]): number {
  if (!values.length) return 0;
  let acc = 0;
  for (const v of values) acc += v * v;
  return Math.sqrt(acc / values.length);
}

export function zscore(values: number[]): number[] {
  const m = mean(values);
  const s = std(values) || 1;
  return values.map((v) => (v - m) / s);
}

// Cohen's d: standardized mean difference between two groups (within-session,
// descriptive only). Positive => group b > group a on average.
export function cohensD(a: number[], b: number[]): number {
  if (a.length < 2 || b.length < 2) return 0;
  const ma = mean(a);
  const mb = mean(b);
  const va = std(a) ** 2;
  const vb = std(b) ** 2;
  const pooled = Math.sqrt(
    ((a.length - 1) * va + (b.length - 1) * vb) / (a.length + b.length - 2) + EPS,
  );
  return (mb - ma) / (pooled || 1);
}

// Radix-2 Cooley-Tukey magnitude spectrum. Input is zero-padded to the next
// power of two. Returns magnitudes for bins 0..N/2 (real signal).
export function fft(signal: number[]): number[] {
  const n = nextPow2(signal.length);
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < signal.length; i += 1) re[i] = signal[i];

  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k += 1) {
        const aRe = re[i + k];
        const aIm = im[i + k];
        const bRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const bIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k] = aRe + bRe;
        im[i + k] = aIm + bIm;
        re[i + k + len / 2] = aRe - bRe;
        im[i + k + len / 2] = aIm - bIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }

  const half = n / 2;
  const mags = new Array<number>(half + 1);
  for (let i = 0; i <= half; i += 1) mags[i] = Math.hypot(re[i], im[i]) / n;
  return mags;
}

// Average power within [lo, hi] Hz for a raw time-domain signal.
export function bandpower(
  signal: number[],
  sampleRate: number,
  band: [number, number],
): number {
  if (signal.length < 2 || sampleRate <= 0) return 0;
  const detrended = signal.map((v) => v - mean(signal));
  const mags = fft(detrended);
  const n = nextPow2(detrended.length);
  const binHz = sampleRate / n;
  const [lo, hi] = band;
  let power = 0;
  let bins = 0;
  for (let i = 1; i < mags.length; i += 1) {
    const f = i * binHz;
    if (f >= lo && f <= hi) {
      power += mags[i] * mags[i];
      bins += 1;
    }
  }
  return bins > 0 ? power / bins : 0;
}

// Stratified k-fold indices (keeps class balance across folds).
export function kfold(labels: string[], k = 5): LabeledSplit[] {
  const byClass = new Map<string, number[]>();
  labels.forEach((label, i) => {
    const list = byClass.get(label) ?? [];
    list.push(i);
    byClass.set(label, list);
  });

  const folds: number[][] = Array.from({ length: k }, () => []);
  for (const idx of byClass.values()) {
    idx.forEach((sample, order) => folds[order % k].push(sample));
  }

  return folds.map((testIndex) => ({
    testIndex,
    trainIndex: labels.map((_, i) => i).filter((i) => !testIndex.includes(i)),
  }));
}

export function trainTestSplit(
  count: number,
  ratio = 0.75,
  seed = 42,
): LabeledSplit {
  const order = shuffled(count, seed);
  const cut = Math.max(1, Math.round(count * ratio));
  return { trainIndex: order.slice(0, cut), testIndex: order.slice(cut) };
}

export function accuracy(truth: string[], pred: string[]): number {
  if (!truth.length) return 0;
  let hit = 0;
  for (let i = 0; i < truth.length; i += 1) if (truth[i] === pred[i]) hit += 1;
  return hit / truth.length;
}

// Mean of per-class recall: robust to class imbalance.
export function balancedAccuracy(truth: string[], pred: string[]): number {
  const classes = [...new Set(truth)];
  if (!classes.length) return 0;
  let sum = 0;
  for (const c of classes) {
    let tp = 0;
    let total = 0;
    for (let i = 0; i < truth.length; i += 1) {
      if (truth[i] !== c) continue;
      total += 1;
      if (pred[i] === c) tp += 1;
    }
    sum += total > 0 ? tp / total : 0;
  }
  return sum / classes.length;
}

export interface Confusion {
  labels: string[];
  matrix: number[][];
}

export function confusion(truth: string[], pred: string[]): Confusion {
  const labels = [...new Set([...truth, ...pred])].sort();
  const index = new Map(labels.map((l, i) => [l, i]));
  const matrix = labels.map(() => labels.map(() => 0));
  for (let i = 0; i < truth.length; i += 1) {
    const r = index.get(truth[i]);
    const c = index.get(pred[i]);
    if (r != null && c != null) matrix[r][c] += 1;
  }
  return { labels, matrix };
}

// L2-regularized logistic regression (one-vs-rest for >2 classes).
// Features are standardized internally; trained with batch gradient descent.
export function logreg(
  X: number[][],
  y: string[],
  options: { epochs?: number; lr?: number; l2?: number } = {},
): LogRegModel {
  const epochs = options.epochs ?? 300;
  const lr = options.lr ?? 0.1;
  const l2 = options.l2 ?? 0.01;
  const classes = [...new Set(y)].sort();
  const dim = X[0]?.length ?? 0;

  const mu = new Array<number>(dim).fill(0);
  const sigma = new Array<number>(dim).fill(1);
  for (let d = 0; d < dim; d += 1) {
    const col = X.map((row) => row[d]);
    mu[d] = mean(col);
    sigma[d] = std(col) || 1;
  }
  const Z = X.map((row) => row.map((v, d) => (v - mu[d]) / sigma[d]));

  const weights = classes.map(() => new Array<number>(dim + 1).fill(0));
  for (let c = 0; c < classes.length; c += 1) {
    const w = weights[c];
    const target = y.map((label) => (label === classes[c] ? 1 : 0));
    for (let epoch = 0; epoch < epochs; epoch += 1) {
      const grad = new Array<number>(dim + 1).fill(0);
      for (let i = 0; i < Z.length; i += 1) {
        const p = sigmoid(dot(w, Z[i]));
        const err = p - target[i];
        grad[0] += err;
        for (let d = 0; d < dim; d += 1) grad[d + 1] += err * Z[i][d];
      }
      w[0] -= (lr * grad[0]) / Z.length;
      for (let d = 0; d < dim; d += 1) {
        w[d + 1] -= (lr * (grad[d + 1] / Z.length + l2 * w[d + 1]));
      }
    }
  }

  const standardize = (x: number[]) => x.map((v, d) => (v - mu[d]) / sigma[d]);
  const scores = (x: number[]) => {
    const z = standardize(x);
    return weights.map((w) => sigmoid(dot(w, z)));
  };

  return {
    classes,
    weights,
    predictProba: scores,
    predict(x: number[]) {
      const s = scores(x);
      let best = 0;
      for (let i = 1; i < s.length; i += 1) if (s[i] > s[best]) best = i;
      return classes[best];
    },
  };
}

// Stratified k-fold cross-validation using logreg. Reports plain and balanced
// accuracy so class imbalance cannot inflate the score.
export function crossValScore(
  X: number[][],
  y: string[],
  k = 5,
  options?: { epochs?: number; lr?: number; l2?: number },
): CvResult {
  const folds = kfold(y, Math.min(k, y.length));
  const truthAll: string[] = [];
  const predAll: string[] = [];
  for (const { trainIndex, testIndex } of folds) {
    if (!trainIndex.length || !testIndex.length) continue;
    const model = logreg(
      trainIndex.map((i) => X[i]),
      trainIndex.map((i) => y[i]),
      options,
    );
    for (const i of testIndex) {
      truthAll.push(y[i]);
      predAll.push(model.predict(X[i]));
    }
  }
  return {
    accuracy: accuracy(truthAll, predAll),
    balancedAccuracy: balancedAccuracy(truthAll, predAll),
    folds: folds.length,
  };
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

function dot(w: number[], x: number[]): number {
  let s = w[0];
  for (let i = 0; i < x.length; i += 1) s += w[i + 1] * x[i];
  return s;
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return Math.max(2, p);
}

function shuffled(count: number, seed: number): number[] {
  const order = Array.from({ length: count }, (_, i) => i);
  let state = seed >>> 0;
  for (let i = count - 1; i > 0; i -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
