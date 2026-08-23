/// <reference lib="webworker" />

import * as Comlink from "comlink";
import { toStudentEeg } from "../hardware/context.ts";
import type { EegFrame, ExecutionResult, RuntimeApi, StudentEeg } from "../types.ts";

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

function executeJavaScript(code: string): { stdout: string } {
  const lines: string[] = [];
  const capture = (...args: unknown[]) => {
    lines.push(formatArgs(args));
  };

  const sandboxConsole = {
    log: capture,
    info: capture,
    debug: capture,
    warn: capture,
    error: capture,
  };

  const context = { EEG: latestEeg };
  const fn = new Function(
    "console",
    "Context",
    `"use strict";\n${code}\n`,
  );
  fn(sandboxConsole, context);
  return { stdout: lines.join("\n") };
}

const api: RuntimeApi = {
  async pushEeg(frame: EegFrame): Promise<void> {
    latestEeg = toStudentEeg(frame);
  },

  async executeCode(
    code: string,
    eeg?: EegFrame | null,
  ): Promise<ExecutionResult> {
    if (eeg) latestEeg = toStudentEeg(eeg);
    const started = performance.now();
    try {
      const { stdout } = executeJavaScript(code);
      return {
        ok: true,
        stdout,
        durationMs: performance.now() - started,
      };
    } catch (err) {
      return {
        ok: false,
        stdout: "",
        error: err instanceof Error ? err.message : String(err),
        durationMs: performance.now() - started,
      };
    }
  },
};

Comlink.expose(api);
