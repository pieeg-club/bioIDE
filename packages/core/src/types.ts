export type Language = "javascript" | "python";
export type HardwareSource = "mock" | "live" | "idle";

export interface FileBuffer {
  id: string;
  name: string;
  language: Language;
  content: string;
}

export interface EegBands {
  Delta: number;
  Theta: number;
  Alpha: number;
  Beta: number;
  Gamma: number;
}

export interface EegFrame {
  ts: number;
  source: Exclude<HardwareSource, "idle">;
  device: string;
  channels: number;
  sampleRate: number;
  raw: number[];
  bands: EegBands;
  relaxation: number;
  focus: number;
  meditation: number;
}

export interface StudentEeg {
  raw: number[];
  bands: EegBands;
  delta: number;
  theta: number;
  alpha: number;
  beta: number;
  gamma: number;
  relaxation: number;
  focus: number;
  meditation: number;
  source: Exclude<HardwareSource, "idle">;
  device: string;
  channels: number;
  sampleRate: number;
  ts: number;
}

export interface ExecutionResult {
  ok: boolean;
  language: Language;
  stdout: string;
  error?: string;
  durationMs: number;
}

export interface RuntimeApi {
  executeCode(
    code: string,
    lang: Language,
    eeg?: EegFrame | null,
  ): Promise<ExecutionResult>;
  pushEeg(frame: EegFrame): Promise<void>;
  isPythonReady(): Promise<boolean>;
}

export type EngineListener = () => void;
