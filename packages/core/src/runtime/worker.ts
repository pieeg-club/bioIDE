/// <reference lib="webworker" />

import * as Comlink from "comlink";
import { toStudentEeg } from "../hardware/context.ts";
import type { EegFrame, ExecutionResult, Language, RuntimeApi, StudentEeg } from "../types.ts";

const PYODIDE_VERSION = "0.27.7";
const PYODIDE_INDEX = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

type PyodideLike = {
  setStdout: (opts: { batched: (text: string) => void }) => void;
  setStderr: (opts: { batched: (text: string) => void }) => void;
  runPythonAsync: (code: string) => Promise<unknown>;
  globals: { set: (name: string, value: unknown) => void };
  toPy: (value: unknown) => unknown;
};

let latestEeg: StudentEeg | null = null;

let pyodidePromise: Promise<PyodideLike> | null = null;

async function loadPyodideRuntime(): Promise<PyodideLike> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      const { loadPyodide } = await import(
        /* @vite-ignore */
        `${PYODIDE_INDEX}pyodide.mjs`
      );
      return loadPyodide({ indexURL: PYODIDE_INDEX });
    })();
  }
  return pyodidePromise;
}

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

async function executePython(code: string): Promise<{ stdout: string }> {
  const pyodide = await loadPyodideRuntime();
  const lines: string[] = [];
  const collect = (text: string) => {
    if (text.length > 0) lines.push(text);
  };

  pyodide.globals.set("Context", pyodide.toPy({ EEG: latestEeg }));
  pyodide.setStdout({ batched: collect });
  pyodide.setStderr({ batched: collect });
  await pyodide.runPythonAsync(code);
  return { stdout: lines.join("") };
}

const api: RuntimeApi = {
  async pushEeg(frame: EegFrame): Promise<void> {
    latestEeg = toStudentEeg(frame);
  },

  async executeCode(
    code: string,
    lang: Language,
    eeg?: EegFrame | null,
  ): Promise<ExecutionResult> {
    if (eeg) latestEeg = toStudentEeg(eeg);
    const started = performance.now();
    try {
      const { stdout } =
        lang === "python"
          ? await executePython(code)
          : executeJavaScript(code);
      return {
        ok: true,
        language: lang,
        stdout,
        durationMs: performance.now() - started,
      };
    } catch (err) {
      return {
        ok: false,
        language: lang,
        stdout: "",
        error: err instanceof Error ? err.message : String(err),
        durationMs: performance.now() - started,
      };
    }
  },

  async isPythonReady(): Promise<boolean> {
    return pyodidePromise !== null;
  },
};

Comlink.expose(api);
