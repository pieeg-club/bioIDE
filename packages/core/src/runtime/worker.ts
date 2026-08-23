/// <reference lib="webworker" />

import * as Comlink from "comlink";
import * as tf from "@tensorflow/tfjs";
import { toStudentEeg } from "../hardware/context.ts";
import * as bioLib from "./bio.ts";
import { FREQUENCY_BANDS, SANDBOX_HELP } from "./apiRef.ts";
import type {
  CheckResult,
  Dataset,
  EegFrame,
  EegWindow,
  Epoch,
  ExecutionResult,
  PlotKind,
  PlotSeries,
  PlotSpec,
  RuntimeApi,
  StudentEeg,
} from "../types.ts";

await tf.setBackend("cpu");
await tf.ready();

// Rolling frame history so user code can read a time window instead of a single
// instantaneous frame. Capacity is bounded to keep worker memory flat.
const HISTORY_CAP = 4096;
const history: StudentEeg[] = [];
const recordings: Epoch[] = [];

let latestEeg: StudentEeg | null = null;

const FEATURE_NAMES = [
  "delta",
  "theta",
  "alpha",
  "beta",
  "gamma",
  "focus",
  "relaxation",
] as const;

type SignalName =
  | "delta"
  | "theta"
  | "alpha"
  | "beta"
  | "gamma"
  | "focus"
  | "relaxation"
  | "meditation";

function pushHistory(frame: StudentEeg): void {
  history.push(frame);
  if (history.length > HISTORY_CAP) history.splice(0, history.length - HISTORY_CAP);
}

function windowFrames(seconds: number): StudentEeg[] {
  if (!history.length) return [];
  const now = history[history.length - 1].ts;
  const cutoff = now - seconds * 1000;
  const out: StudentEeg[] = [];
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i].ts < cutoff) break;
    out.push(history[i]);
  }
  return out.reverse();
}

function readWindow(seconds = 2): EegWindow {
  const frames = windowFrames(seconds);
  const last = frames[frames.length - 1] ?? latestEeg;
  return {
    seconds,
    count: frames.length,
    sampleRate: last?.sampleRate ?? 0,
    channels: last?.channels ?? 0,
    frames,
  };
}

function scalarOf(frame: StudentEeg, name: SignalName): number {
  switch (name) {
    case "delta":
      return frame.delta;
    case "theta":
      return frame.theta;
    case "alpha":
      return frame.alpha;
    case "beta":
      return frame.beta;
    case "gamma":
      return frame.gamma;
    case "focus":
      return frame.focus;
    case "relaxation":
      return frame.relaxation;
    case "meditation":
      return frame.meditation;
    default:
      return 0;
  }
}

// Time series of one feature over the window. A number selects a raw channel;
// a name selects a band power or derived state.
function readSignal(name: SignalName | number, seconds = 2): number[] {
  const frames = windowFrames(seconds);
  if (typeof name === "number") {
    return frames.map((f) => f.raw[name] ?? 0);
  }
  return frames.map((f) => scalarOf(f, name));
}

// Fixed feature vector: mean band powers + mean derived states over the frames.
function featuresOf(frames: StudentEeg[]): number[] {
  if (!frames.length) return FEATURE_NAMES.map(() => 0);
  return [
    bioLib.mean(frames.map((f) => f.delta)),
    bioLib.mean(frames.map((f) => f.theta)),
    bioLib.mean(frames.map((f) => f.alpha)),
    bioLib.mean(frames.map((f) => f.beta)),
    bioLib.mean(frames.map((f) => f.gamma)),
    bioLib.mean(frames.map((f) => f.focus)),
    bioLib.mean(frames.map((f) => f.relaxation)),
  ];
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

// Awaits `ms` of live streaming, then snapshots the window into a labelled epoch
// and appends it to the session dataset. Frames keep arriving during the await.
async function record(label: string, ms = 1000): Promise<Epoch> {
  await sleep(ms);
  const frames = windowFrames(ms / 1000);
  const epoch: Epoch = {
    label,
    ts: Date.now(),
    durationMs: ms,
    features: featuresOf(frames),
    frames: frames.length,
  };
  recordings.push(epoch);
  return epoch;
}

function dataset(): Dataset {
  return {
    X: recordings.map((e) => e.features),
    y: recordings.map((e) => e.label),
    labels: [...new Set(recordings.map((e) => e.label))].sort(),
  };
}

function clearDataset(): void {
  recordings.length = 0;
}

function isFocused(threshold = 0.6): boolean {
  return (latestEeg?.focus ?? 0) > threshold;
}

function isRelaxed(threshold = 0.6): boolean {
  return (latestEeg?.relaxation ?? 0) > threshold;
}

function bandPower(name: string): number {
  if (!latestEeg) return 0;
  switch (name.toLowerCase()) {
    case "delta":
      return latestEeg.delta;
    case "theta":
      return latestEeg.theta;
    case "alpha":
      return latestEeg.alpha;
    case "beta":
      return latestEeg.beta;
    case "gamma":
      return latestEeg.gamma;
    default:
      return 0;
  }
}

const bio = {
  featureNames: [...FEATURE_NAMES],
  bands: FREQUENCY_BANDS,
  window: readWindow,
  signal: readSignal,
  features: featuresOf,
  sleep,
  record,
  dataset,
  clearDataset,
  epochs: () => [...recordings],
  isFocused,
  isRelaxed,
  bandPower,
  help: () => SANDBOX_HELP,
  mean: bioLib.mean,
  std: bioLib.std,
  rms: bioLib.rms,
  zscore: bioLib.zscore,
  cohensD: bioLib.cohensD,
  fft: bioLib.fft,
  bandpower: bioLib.bandpower,
  kfold: bioLib.kfold,
  trainTestSplit: bioLib.trainTestSplit,
  logreg: bioLib.logreg,
  crossValScore: bioLib.crossValScore,
  accuracy: bioLib.accuracy,
  balancedAccuracy: bioLib.balancedAccuracy,
  confusion: bioLib.confusion,
};

function formatArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ");
}

function createConsole(lines: string[]) {
  const capture = (...args: unknown[]) => {
    lines.push(formatArgs(args));
  };
  return {
    log: capture,
    info: capture,
    debug: capture,
    warn: capture,
    error: capture,
  };
}

function createCheck(results: CheckResult[]) {
  return (condition: unknown, message: string) => {
    const ok = Boolean(condition);
    results.push({
      ok,
      message: message || (ok ? "ok" : "check failed"),
    });
    if (!ok) throw new Error(message || "check failed");
  };
}

function toNumbers(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => toNumbers(item));
  }
  if (typeof value === "number" && Number.isFinite(value)) return [value];
  if (value && typeof value === "object" && "arraySync" in value) {
    try {
      return toNumbers((value as { arraySync: () => unknown }).arraySync());
    } catch {
      return [];
    }
  }
  const n = Number(value);
  return Number.isFinite(n) ? [n] : [];
}

function createPlot(plots: PlotSpec[]) {
  return (titleOrSpec: unknown, data?: unknown) => {
    const spec =
      titleOrSpec && typeof titleOrSpec === "object" && !Array.isArray(titleOrSpec)
        ? (titleOrSpec as Record<string, unknown>)
        : { title: titleOrSpec, values: data, series: undefined, kind: undefined, labels: undefined };

    const title = String(spec.title ?? "plot");
    const rawSeries = spec.series;
    const series: PlotSeries[] = [];

    if (Array.isArray(rawSeries)) {
      for (const item of rawSeries) {
        if (item && typeof item === "object" && "values" in item) {
          const row = item as { name?: string; values: unknown };
          series.push({ name: row.name, values: toNumbers(row.values) });
        } else {
          series.push({ values: toNumbers(item) });
        }
      }
    } else if (
      spec.values &&
      typeof spec.values === "object" &&
      !Array.isArray(spec.values) &&
      !("arraySync" in spec.values)
    ) {
      const entries = Object.entries(spec.values as Record<string, unknown>);
      series.push({ values: entries.map(([, value]) => toNumbers(value)[0] ?? 0) });
      spec.labels = spec.labels ?? entries.map(([key]) => key);
    } else if (spec.values !== undefined) {
      series.push({ values: toNumbers(spec.values) });
    }

    const kind: PlotKind =
      spec.kind === "bar" || spec.kind === "line"
        ? spec.kind
        : (spec.labels as unknown[] | undefined)?.length
          ? "bar"
          : "line";

    const labels = Array.isArray(spec.labels)
      ? spec.labels.map((label) => String(label))
      : undefined;

    if (!series.length || series.every((row) => !row.values.length)) {
      throw new Error(`plot("${title}") needs numbers`);
    }

    plots.push({ title, kind, labels, series });
  };
}

async function executeJavaScript(
  code: string,
  checks?: string | null,
): Promise<{
  stdout: string;
  checks: CheckResult[];
  plots: PlotSpec[];
  error?: string;
}> {
  const lines: string[] = [];
  const checkResults: CheckResult[] = [];
  const plots: PlotSpec[] = [];
  const sandboxConsole = createConsole(lines);
  const check = createCheck(checkResults);
  const plot = createPlot(plots);
  const context = { EEG: latestEeg };
  const body = checks ? `${code}\n;\n${checks}\n` : `${code}\n`;
  try {
    const fn = new Function(
      "console",
      "Context",
      "EEG",
      "tf",
      "bio",
      "check",
      "plot",
      `"use strict";\nreturn (async () => {\n${body}\n})();`,
    );
    await fn(sandboxConsole, context, latestEeg, tf, bio, check, plot);
    return { stdout: lines.join("\n"), checks: checkResults, plots };
  } catch (err) {
    return {
      stdout: lines.join("\n"),
      checks: checkResults,
      plots,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function seedLatest(frame: EegFrame | null | undefined, intoHistory: boolean): void {
  if (!frame) return;
  const student = toStudentEeg(frame);
  latestEeg = student;
  if (intoHistory && student) pushHistory(student);
}

const api: RuntimeApi = {
  async pushEeg(frame: EegFrame): Promise<void> {
    seedLatest(frame, true);
  },

  async executeCode(
    code: string,
    eeg?: EegFrame | null,
    checks?: string | null,
    frames?: EegFrame[] | null,
  ): Promise<ExecutionResult> {
    if (frames?.length) {
      history.length = 0;
      for (const frame of frames) seedLatest(frame, true);
    } else {
      seedLatest(eeg, history.length === 0);
    }
    const started = performance.now();
    const result = await executeJavaScript(code, checks);
    return {
      ok: !result.error,
      stdout: result.stdout,
      error: result.error,
      durationMs: performance.now() - started,
      checks: result.checks,
      plots: result.plots,
    };
  },
};

Comlink.expose(api);
