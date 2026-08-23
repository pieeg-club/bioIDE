import { useEffect, useMemo } from "react";
import { IdeEngine, type IdeEngineOptions, type Language } from "@bioide/core";
import { CodeEditor } from "./CodeEditor.tsx";
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
