import type { ExecutionResult } from "@bioide/core";
import { Plot } from "./Plot.tsx";

export interface TerminalProps {
  result: ExecutionResult | null;
  running: boolean;
}

export function Terminal({ result, running }: TerminalProps) {
  const empty = !running && !result;
  const stdout = result?.stdout ?? "";
  const error = result?.error ?? "";
  const checks = result?.checks ?? [];
  const plots = result?.plots ?? [];
  const silent = Boolean(
    result && !stdout && !error && checks.length === 0 && plots.length === 0,
  );

  return (
    <section className="bioide-pane bioide-terminal-pane">
      <header className="bioide-pane-head">
        <span>Output</span>
        <span className="bioide-pane-meta">
          {running
            ? "running"
            : result
              ? `${result.ok ? "ok" : "error"} · ${result.durationMs.toFixed(1)} ms`
              : "idle"}
        </span>
      </header>
      <div className="bioide-output">
        {plots.length ? (
          <div className="bioide-plots">
            {plots.map((spec, index) => (
              <Plot key={`${index}-${spec.title}`} spec={spec} />
            ))}
          </div>
        ) : null}
        <pre className="bioide-terminal">
          {running ? (
            <span className="bioide-term-muted">Running...</span>
          ) : empty ? (
            <span className="bioide-term-muted">
              Run the buffer to see stdout and plots here.
            </span>
          ) : (
            <>
              {stdout ? <span className="bioide-term-out">{stdout}</span> : null}
              {checks.map((item, index) => (
                <span
                  key={`${index}-${item.message}`}
                  className={item.ok ? "bioide-term-check" : "bioide-term-err"}
                >
                  {item.ok ? "ok" : "fail"} {item.message}
                </span>
              ))}
              {error ? <span className="bioide-term-err">{error}</span> : null}
              {silent ? (
                <span className="bioide-term-muted">
                  {result?.ok ? "(no output)" : "Failed."}
                </span>
              ) : null}
            </>
          )}
        </pre>
      </div>
    </section>
  );
}
