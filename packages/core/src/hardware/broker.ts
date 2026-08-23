import type { EegFrame } from "../types.ts";

const DEFAULT_HZ = 30;

export class WorkerBroker {
  private latest: EegFrame | null = null;
  private lastSentTs = -1;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly dispatch: (frame: EegFrame) => void,
    private readonly hz = DEFAULT_HZ,
  ) {}

  push(frame: EegFrame): void {
    this.latest = frame;
  }

  getLatest(): EegFrame | null {
    return this.latest;
  }

  start(): void {
    if (this.timer != null) return;
    const ms = Math.max(1, Math.round(1000 / this.hz));
    this.timer = setInterval(() => {
      const frame = this.latest;
      if (!frame || frame.ts === this.lastSentTs) return;
      this.lastSentTs = frame.ts;
      this.dispatch(frame);
    }, ms);
  }

  stop(): void {
    if (this.timer == null) return;
    clearInterval(this.timer);
    this.timer = null;
  }
}
