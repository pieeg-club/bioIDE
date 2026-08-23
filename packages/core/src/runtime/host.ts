import * as Comlink from "comlink";
import type { EegFrame, ExecutionResult, RuntimeApi } from "../types.ts";

export class RuntimeHost {
  private worker: Worker | null = null;
  private api: Comlink.Remote<RuntimeApi> | null = null;

  private ensureApi(): Comlink.Remote<RuntimeApi> {
    if (this.api) return this.api;

    this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    this.api = Comlink.wrap<RuntimeApi>(this.worker);
    return this.api;
  }

  executeCode(
    code: string,
    eeg?: EegFrame | null,
    checks?: string | null,
  ): Promise<ExecutionResult> {
    return this.ensureApi().executeCode(code, eeg, checks);
  }

  pushEeg(frame: EegFrame): Promise<void> {
    return this.ensureApi().pushEeg(frame);
  }

  dispose(): void {
    this.api?.[Comlink.releaseProxy]();
    this.api = null;
    this.worker?.terminate();
    this.worker = null;
  }
}
