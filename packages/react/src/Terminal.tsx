import type { ExecutionResult } from "@bioide/core";

export interface TerminalProps {
  result: ExecutionResult | null;
  running: boolean;
}

export function Terminal({ result, running }: TerminalProps) {
  const empty = !running && !result;
  const stdout = result?.stdout ?? "";
  const error = result?.error ?? "";
  const checks = result?.checks ?? [];
  const silent = Boolean(result && !stdout && !error && checks.length === 0);

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
      <pre className="bioide-terminal">
        {running ? (
          <span className="bioide-term-muted">Running...</span>
        ) : empty ? (
          <span className="bioide-term-muted">Run the buffer to see stdout here.</span>
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
    </section>
  );
}
