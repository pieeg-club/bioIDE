import { WorkerBroker } from "./hardware/broker.ts";
import { toStudentEeg } from "./hardware/context.ts";
import { PieegHost } from "./hardware/live.ts";
import { MockPieeg } from "./hardware/mock.ts";
import { idleHealth, SignalMonitor } from "./hardware/monitor.ts";
import { RuntimeHost } from "./runtime/host.ts";
import type {
  EegFrame,
  EngineListener,
  ExecutionResult,
  FileBuffer,
  HardwareSource,
  SignalHealth,
  StudentEeg,
} from "./types.ts";

const DEFAULT_BUFFER = {
  name: "main.js",
  content: `const eeg = EEG;
if (!eeg) {
  console.log("no EEG yet - start mock or connect hardware");
} else {
  const x = tf.tensor1d([eeg.alpha, eeg.beta, eeg.theta, eeg.delta, eeg.gamma]);
  console.log(eeg.source, eeg.device);
  console.log("bands", x.arraySync());
  console.log("mean", x.mean().arraySync());
  x.dispose();
}`,
};

export interface IdeEngineOptions {
  content?: string;
  checks?: string | null;
}

export interface IdeSnapshot {
  buffer: FileBuffer;
  content: string;
  lastResult: ExecutionResult | null;
  running: boolean;
  checks: string | null;
  hardware: HardwareSource;
  deviceId: string;
  hardwareError: string | null;
  eeg: StudentEeg | null;
  health: SignalHealth;
}

const HISTORY_CAP = 4096;

export class IdeEngine {
  private readonly runtime = new RuntimeHost();
  private readonly mock = new MockPieeg();
  private readonly monitor = new SignalMonitor();
  private readonly live = new PieegHost();
  private readonly frames: EegFrame[] = [];
  private readonly broker = new WorkerBroker((frame) => {
    void this.runtime.pushEeg(frame);
  });
  private readonly listeners = new Set<EngineListener>();
  private buffer: FileBuffer;
  private lastResult: ExecutionResult | null = null;
  private checks: string | null = null;
  private running = false;
  private hardware: HardwareSource = "idle";
  private deviceId = "ironbci-8";
  private hardwareError: string | null = null;
  private snapshot: IdeSnapshot;

  constructor(options: IdeEngineOptions = {}) {
    this.buffer = {
      id: "main",
      name: DEFAULT_BUFFER.name,
      content: options.content ?? DEFAULT_BUFFER.content,
    };
    this.checks = options.checks ?? null;
    this.broker.start();
    this.snapshot = this.buildSnapshot();
  }

  getSnapshot(): IdeSnapshot {
    return this.snapshot;
  }

  getBuffer(): FileBuffer {
    return this.buffer;
  }

  getContent(): string {
    return this.buffer.content;
  }

  getLastResult(): ExecutionResult | null {
    return this.lastResult;
  }

  isRunning(): boolean {
    return this.running;
  }

  getHardware(): HardwareSource {
    return this.hardware;
  }

  getDeviceId(): string {
    return this.deviceId;
  }

  getEeg(): StudentEeg | null {
    return toStudentEeg(this.broker.getLatest());
  }

  setDeviceId(deviceId: string): void {
    if (this.deviceId === deviceId) return;
    this.deviceId = deviceId;
    this.emit();
  }

  startMock(): void {
    this.stopHardware();
    this.hardware = "mock";
    this.hardwareError = null;
    this.broker.start();
    this.mock.start(
      (frame) => this.ingest(frame),
      (raw) => this.monitor.pushSample(raw),
    );
    this.emit();
  }

  async connectHardware(): Promise<void> {
    this.stopHardware();
    this.hardwareError = null;
    this.emit();
    try {
      await this.live.connect(
        this.deviceId,
        (frame) => this.ingest(frame),
        () => {
          this.hardware = "idle";
          this.emit();
        },
        (message) => {
          this.hardwareError = message;
          this.emit();
        },
        (raw) => this.monitor.pushSample(raw),
      );
      this.broker.start();
      this.hardware = "live";
      this.emit();
    } catch (err) {
      this.hardware = "idle";
      this.hardwareError = err instanceof Error ? err.message : String(err);
      this.emit();
    }
  }

  disconnectHardware(): void {
    this.stopHardware();
    this.emit();
  }

  setContent(content: string): void {
    if (this.buffer.content === content) return;
    this.buffer = { ...this.buffer, content };
    this.emit();
  }

  setChecks(checks: string | null): void {
    this.checks = checks;
    this.emit();
  }

  async execute(): Promise<ExecutionResult> {
    this.running = true;
    this.emit();
    try {
      const result = await this.runtime.executeCode(
        this.buffer.content,
        this.broker.getLatest(),
        this.checks,
        this.frames,
      );
      this.lastResult = result;
      return result;
    } finally {
      this.running = false;
      this.emit();
    }
  }

  subscribe(listener: EngineListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  dispose(): void {
    this.listeners.clear();
    this.stopHardware();
    this.broker.stop();
    this.runtime.dispose();
  }

  private ingest(frame: EegFrame): void {
    this.monitor.pushFrame(frame);
    this.broker.push(frame);
    this.frames.push(frame);
    if (this.frames.length > HISTORY_CAP) {
      this.frames.splice(0, this.frames.length - HISTORY_CAP);
    }
    this.emit();
  }

  private stopHardware(): void {
    this.mock.stop();
    this.live.disconnect();
    this.monitor.reset();
    this.frames.length = 0;
    this.hardware = "idle";
  }

  private buildSnapshot(): IdeSnapshot {
    return {
      buffer: this.buffer,
      content: this.buffer.content,
      lastResult: this.lastResult,
      running: this.running,
      checks: this.checks,
      hardware: this.hardware,
      deviceId: this.deviceId,
      hardwareError: this.hardwareError,
      eeg: toStudentEeg(this.broker.getLatest()),
      health: this.hardware === "idle" ? idleHealth() : this.monitor.snapshot(),
    };
  }

  private emit(): void {
    this.snapshot = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }
}