export type HardwareSource = "mock" | "live" | "idle";
export type ContactQuality = "ok" | "flat" | "noisy" | "clipped";
export type StreamStatus = "idle" | "ok" | "slow" | "stale";

export interface ElectrodeHealth {
  index: number;
  rms: number;
  pp: number;
  std: number;
  contact: ContactQuality;
}

export interface SignalHealth {
  source: HardwareSource;
  device: string;
  channels: number;
  sampleRate: number;
  packetHz: number;
  ageMs: number;
  jitterMs: number;
  samples: number;
  status: StreamStatus;
  healthy: boolean;
  electrodes: ElectrodeHealth[];
}

export interface FileBuffer {
  id: string;
  name: string;
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

export interface EegWindow {
  seconds: number;
  count: number;
  sampleRate: number;
  channels: number;
  frames: StudentEeg[];
}

export interface Epoch {
  label: string;
  ts: number;
  durationMs: number;
  features: number[];
  frames: number;
}

export interface Dataset {
  X: number[][];
  y: string[];
  labels: string[];
}

export interface CheckResult {
  ok: boolean;
  message: string;
}

export type PlotKind = "line" | "bar";

export interface PlotSeries {
  name?: string;
  values: number[];
}

export interface PlotSpec {
  title: string;
  kind: PlotKind;
  labels?: string[];
  series: PlotSeries[];
}

export interface ExecutionResult {
  ok: boolean;
  stdout: string;
  error?: string;
  durationMs: number;
  checks?: CheckResult[];
  plots?: PlotSpec[];
}

export interface RuntimeApi {
  executeCode(
    code: string,
    eeg?: EegFrame | null,
    checks?: string | null,
    history?: EegFrame[] | null,
  ): Promise<ExecutionResult>;
  pushEeg(frame: EegFrame): Promise<void>;
}

export type EngineListener = () => void;
