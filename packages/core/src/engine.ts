import { WorkerBroker } from "./hardware/broker.ts";
import { toStudentEeg } from "./hardware/context.ts";
import { PieegHost } from "./hardware/live.ts";
import { MockPieeg } from "./hardware/mock.ts";
import { RuntimeHost } from "./runtime/host.ts";
import type {
  EegFrame,
  EngineListener,
  ExecutionResult,
  FileBuffer,
  HardwareSource,
  Language,
  StudentEeg,
} from "./types.ts";

const DEFAULTS: Record<Language, { name: string; content: string }> = {
  javascript: {
    name: "main.js",
    content: `const eeg = Context.EEG;
if (!eeg) {
  console.log("no EEG yet - start mock or connect hardware");
} else {
  console.log(eeg.source, eeg.device);
  console.log("alpha", eeg.alpha.toFixed(3));
  console.log("relaxation", (eeg.relaxation * 100).toFixed(0) + "%");
}`,
  },
  python: {
    name: "main.py",
    content: `eeg = Context["EEG"]
if eeg is None:
    print("no EEG yet - start mock or connect hardware")
else:
    print(eeg["source"], eeg["device"])
    print("alpha", round(eeg["alpha"], 3))
    print("relaxation", f"{eeg['relaxation'] * 100:.0f}%")`,
  },
};

export interface IdeEngineOptions {
  language?: Language;
  content?: string;
}

export interface IdeSnapshot {
  buffer: FileBuffer;
  language: Language;
  content: string;
  lastResult: ExecutionResult | null;
  running: boolean;
  hardware: HardwareSource;
  deviceId: string;
  hardwareError: string | null;
  eeg: StudentEeg | null;
}

export class IdeEngine {
  private readonly runtime = new RuntimeHost();
  private readonly mock = new MockPieeg();
  private readonly live = new PieegHost();
  private readonly broker = new WorkerBroker((frame) => {
    void this.runtime.pushEeg(frame);
  });
  private readonly listeners = new Set<EngineListener>();
  private buffer: FileBuffer;
  private lastResult: ExecutionResult | null = null;
  private running = false;
  private hardware: HardwareSource = "idle";
  private deviceId = "ironbci-8";
  private hardwareError: string | null = null;
  private snapshot: IdeSnapshot;

  constructor(options: IdeEngineOptions = {}) {
    const language = options.language ?? "javascript";
    const preset = DEFAULTS[language];
    this.buffer = {
      id: "main",
      name: preset.name,
      language,
      content: options.content ?? preset.content,
    };
    this.broker.start();
    this.snapshot = this.buildSnapshot();
  }

  getSnapshot(): IdeSnapshot {
    return this.snapshot;
  }

  getBuffer(): FileBuffer {
    return this.buffer;
  }

  getLanguage(): Language {
    return this.buffer.language;
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
    this.mock.start((frame) => this.ingest(frame));
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
      );
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

  setLanguage(language: Language): void {
    if (this.buffer.language === language) return;
    const preset = DEFAULTS[language];
    this.buffer = {
      ...this.buffer,
      language,
      name: preset.name,
    };
    this.emit();
  }

  async execute(): Promise<ExecutionResult> {
    this.running = true;
    this.emit();
    try {
      const result = await this.runtime.executeCode(
        this.buffer.content,
        this.buffer.language,
        this.broker.getLatest(),
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
    this.broker.push(frame);
    this.emit();
  }

  private stopHardware(): void {
    this.mock.stop();
    this.live.disconnect();
    this.hardware = "idle";
  }

  private buildSnapshot(): IdeSnapshot {
    return {
      buffer: this.buffer,
      language: this.buffer.language,
      content: this.buffer.content,
      lastResult: this.lastResult,
      running: this.running,
      hardware: this.hardware,
      deviceId: this.deviceId,
      hardwareError: this.hardwareError,
      eeg: toStudentEeg(this.broker.getLatest()),
    };
  }

  private emit(): void {
    this.snapshot = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }
}
