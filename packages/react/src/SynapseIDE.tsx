import { useEffect, useMemo, useRef } from "react";
import {
  EEG_DEVICES,
  IdeEngine,
  type IdeEngineOptions,
  type Language,
} from "@bioide/core";
import { CodeEditor } from "./CodeEditor.tsx";
import { SignalHealthPanel } from "./SignalHealth.tsx";
import { Terminal } from "./Terminal.tsx";
import { useIdeEngine } from "./useIdeEngine.ts";

const RUN_SHORTCUT =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
    ? "⌘↵"
    : "Ctrl+Enter";

export interface SynapseIDEProps extends IdeEngineOptions {
  engine?: IdeEngine;
}

export function SynapseIDE({ engine: external, ...options }: SynapseIDEProps) {
  const engine = useMemo(
    () => external ?? new IdeEngine(options),
    [external],
  );

  useEffect(() => {
    if (external) return;
    return () => engine.dispose();
  }, [engine, external]);

  const state = useIdeEngine(engine);

  const setLanguage = (language: Language) => {
    engine.setLanguage(language);
  };

  const runningRef = useRef(state.running);
  runningRef.current = state.running;

  const run = () => {
    if (runningRef.current) return;
    void engine.execute();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key !== "Enter") return;
      event.preventDefault();
      run();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine]);

  const sourceLabel =
    state.hardware === "live"
      ? "live"
      : state.hardware === "mock"
        ? "mock"
        : "idle";

  return (
    <div className="bioide-root">
      <header className="bioide-toolbar">
        <div className="bioide-brand">bioIDE</div>
        <div className="bioide-cluster">
          <label className="bioide-field">
            Runtime
            <select
              value={state.language}
              onChange={(event) => setLanguage(event.target.value as Language)}
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
            </select>
          </label>
          <label className="bioide-field">
            Board
            <select
              value={state.deviceId}
              disabled={state.hardware === "live"}
              onChange={(event) => engine.setDeviceId(event.target.value)}
            >
              {EEG_DEVICES.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="bioide-cluster">
          <button
            type="button"
            className={`bioide-btn${state.hardware === "mock" ? " bioide-btn-active" : ""}`}
            disabled={state.hardware === "mock"}
            onClick={() => engine.startMock()}
          >
            Mock
          </button>
          <button
            type="button"
            className="bioide-btn"
            onClick={() => {
              if (state.hardware === "live") {
                engine.disconnectHardware();
                return;
              }
              void engine.connectHardware();
            }}
          >
            {state.hardware === "live" ? "Disconnect" : "Connect"}
          </button>
          <button
            type="button"
            className="bioide-btn"
            disabled={state.hardware === "idle"}
            onClick={() => engine.disconnectHardware()}
          >
            Stop
          </button>
        </div>
        <div className="bioide-toolbar-end">
          <div className={`bioide-hw bioide-hw-${sourceLabel}`}>
            <span className="bioide-hw-dot" aria-hidden="true" />
            <span className="bioide-hw-source">{sourceLabel}</span>
            {state.eeg ? (
              <>
                <span className="bioide-metric">
                  <em>α</em> {state.eeg.alpha.toFixed(2)}
                </span>
                <span className="bioide-metric">
                  <em>rel</em> {(state.eeg.relaxation * 100).toFixed(0)}%
                </span>
              </>
            ) : (
              <span className="bioide-hw-empty">no frame</span>
            )}
          </div>
          <button
            type="button"
            className="bioide-btn bioide-btn-primary"
            disabled={state.running}
            onClick={run}
          >
            {state.running ? "Running" : "Run"}
            <kbd>{RUN_SHORTCUT}</kbd>
          </button>
        </div>
      </header>
      {state.hardwareError ? (
        <p className="bioide-hw-error">{state.hardwareError}</p>
      ) : null}
      <SignalHealthPanel health={state.health} />
      <div className="bioide-panes">
        <section className="bioide-pane">
          <header className="bioide-pane-head">
            <span>{state.buffer.name}</span>
            <span className="bioide-pane-meta">{state.language}</span>
          </header>
          <CodeEditor
            value={state.content}
            language={state.language}
            onChange={(value) => engine.setContent(value)}
          />
        </section>
        <Terminal result={state.lastResult} running={state.running} />
      </div>
    </div>
  );
}
