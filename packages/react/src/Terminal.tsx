import type { ExecutionResult } from "@bioide/core";

export interface TerminalProps {
  result: ExecutionResult | null;
  running: boolean;
}

export function Terminal({ result, running }: TerminalProps) {
  let body = "Ready.";
  if (running) body = "Running...";
  else if (result) {
    const parts = [];
    if (result.stdout) parts.push(result.stdout);
    if (result.error) parts.push(result.error);
    if (parts.length === 0) parts.push(result.ok ? "(no output)" : "Failed.");
    parts.push(`\n[${result.language} ${result.ok ? "ok" : "error"} ${result.durationMs.toFixed(1)}ms]`);
    body = parts.join("\n");
  }

  return (
    <pre className="bioide-terminal">
      {body}
    </pre>
  );
}
