/// <reference lib="webworker" />

import * as Comlink from "comlink";
import * as tf from "@tensorflow/tfjs";
import { toStudentEeg } from "../hardware/context.ts";
import type {
  CheckResult,
  EegFrame,
  ExecutionResult,
  PlotKind,
  PlotSeries,
  PlotSpec,
  RuntimeApi,
  StudentEeg,
} from "../types.ts";

await tf.setBackend("cpu");
await tf.ready();

let latestEeg: StudentEeg | null = null;

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
      "check",
      "plot",
      `"use strict";\nreturn (async () => {\n${body}\n})();`,
    );
    await fn(sandboxConsole, context, latestEeg, tf, check, plot);
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

const api: RuntimeApi = {
  async pushEeg(frame: EegFrame): Promise<void> {
    latestEeg = toStudentEeg(frame);
  },

  async executeCode(
    code: string,
    eeg?: EegFrame | null,
    checks?: string | null,
  ): Promise<ExecutionResult> {
    if (eeg) latestEeg = toStudentEeg(eeg);
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
