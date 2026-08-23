import { useEffect, useMemo } from "react";
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

  const sourceLabel =
    state.hardware === "live"
      ? "live"
      : state.hardware === "mock"
        ? "mock"
        : "idle";

  return (
    <div className="bioide-root">
      <header className="bioide-toolbar">
        <label>
          Runtime
          <select
            value={state.language}
            onChange={(event) => setLanguage(event.target.value as Language)}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
          </select>
        </label>
        <label>
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
        <button
          type="button"
          disabled={state.hardware === "mock"}
          onClick={() => engine.startMock()}
        >
          Mock
        </button>
        <button
          type="button"
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
          disabled={state.hardware === "idle"}
          onClick={() => engine.disconnectHardware()}
        >
          Stop
        </button>
        <span className={`bioide-hw bioide-hw-${sourceLabel}`}>
          {sourceLabel}
          {state.eeg
            ? ` α ${state.eeg.alpha.toFixed(2)} rel ${(state.eeg.relaxation * 100).toFixed(0)}%`
            : ""}
        </span>
        <button
          type="button"
          disabled={state.running}
          onClick={() => {
            void engine.execute();
          }}
        >
          {state.running ? "Running..." : "Run"}
        </button>
      </header>
      {state.hardwareError ? (
        <p className="bioide-hw-error">{state.hardwareError}</p>
      ) : null}
      <SignalHealthPanel health={state.health} />
      <div className="bioide-panes">
        <CodeEditor
          value={state.content}
          language={state.language}
          onChange={(value) => engine.setContent(value)}
        />
        <Terminal result={state.lastResult} running={state.running} />
      </div>
    </div>
  );
}
