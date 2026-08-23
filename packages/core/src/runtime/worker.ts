/// <reference lib="webworker" />

import * as Comlink from "comlink";
import * as tf from "@tensorflow/tfjs";
import { toStudentEeg } from "../hardware/context.ts";
import type {
  CheckResult,
  EegFrame,
  ExecutionResult,
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

async function executeJavaScript(
  code: string,
  checks?: string | null,
): Promise<{ stdout: string; checks: CheckResult[]; error?: string }> {
  const lines: string[] = [];
  const checkResults: CheckResult[] = [];
  const sandboxConsole = createConsole(lines);
  const check = createCheck(checkResults);
  const context = { EEG: latestEeg };
  const body = checks ? `${code}\n;\n${checks}\n` : `${code}\n`;
  try {
    const fn = new Function(
      "console",
      "Context",
      "EEG",
      "tf",
      "check",
      `"use strict";\nreturn (async () => {\n${body}\n})();`,
    );
    await fn(sandboxConsole, context, latestEeg, tf, check);
    return { stdout: lines.join("\n"), checks: checkResults };
  } catch (err) {
    return {
      stdout: lines.join("\n"),
      checks: checkResults,
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
    };
  },
};

Comlink.expose(api);
