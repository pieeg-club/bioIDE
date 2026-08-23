import { RuntimeHost } from "./runtime/host.ts";
import type {
  EngineListener,
  ExecutionResult,
  FileBuffer,
  Language,
} from "./types.ts";

const DEFAULTS: Record<Language, { name: string; content: string }> = {
  javascript: {
    name: "main.js",
    content: `console.log("hello from js");
const n = [1, 2, 3].reduce((a, b) => a + b, 0);
console.log("sum", n);`,
  },
  python: {
    name: "main.py",
    content: `print("hello from python")
print(sum([1, 2, 3]))`,
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
}

export class IdeEngine {
  private readonly runtime = new RuntimeHost();
  private readonly listeners = new Set<EngineListener>();
  private buffer: FileBuffer;
  private lastResult: ExecutionResult | null = null;
  private running = false;
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
    this.runtime.dispose();
  }

  private buildSnapshot(): IdeSnapshot {
    return {
      buffer: this.buffer,
      language: this.buffer.language,
      content: this.buffer.content,
      lastResult: this.lastResult,
      running: this.running,
    };
  }

  private emit(): void {
    this.snapshot = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }
}
