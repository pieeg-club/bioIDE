import type { EegBands, EegFrame, StudentEeg } from "../types.ts";

export function emptyBands(): EegBands {
  return { Delta: 0, Theta: 0, Alpha: 0, Beta: 0, Gamma: 0 };
}

export function normalizeBands(bands: Record<string, number> | null | undefined): EegBands {
  const next = emptyBands();
  if (!bands) return next;
  next.Delta = bands.Delta ?? 0;
  next.Theta = bands.Theta ?? 0;
  next.Alpha = bands.Alpha ?? 0;
  next.Beta = bands.Beta ?? 0;
  next.Gamma = bands.Gamma ?? 0;
  return next;
}

export function derivedStates(bands: EegBands) {
  const alpha = bands.Alpha;
  const beta = bands.Beta;
  const theta = bands.Theta;
  const total = bands.Delta + theta + alpha + beta + bands.Gamma;
  return {
    relaxation: alpha + beta > 0 ? alpha / (alpha + beta) : 0.5,
    focus: beta + theta > 0 ? beta / (beta + theta) : 0.5,
    meditation: total > 0 ? (theta + alpha) / total : 0,
  };
}

export function toStudentEeg(frame: EegFrame | null): StudentEeg | null {
  if (!frame) return null;
  return {
    raw: frame.raw,
    bands: { ...frame.bands },
    delta: frame.bands.Delta,
    theta: frame.bands.Theta,
    alpha: frame.bands.Alpha,
    beta: frame.bands.Beta,
    gamma: frame.bands.Gamma,
    relaxation: frame.relaxation,
    focus: frame.focus,
    meditation: frame.meditation,
    source: frame.source,
    device: frame.device,
    channels: frame.channels,
    sampleRate: frame.sampleRate,
    ts: frame.ts,
  };
}
