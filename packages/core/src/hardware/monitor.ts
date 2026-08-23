import type {
  ContactQuality,
  ElectrodeHealth,
  SignalHealth,
  StreamStatus,
} from "../types.ts";
import type { EegFrame } from "../types.ts";

const WINDOW = 250;
const PACKET_WINDOW_MS = 1000;
const STALE_MS = 500;
const MIN_PACKET_HZ = 4;
const FLAT_RMS = 1;
const NOISY_RMS = 80;
const NOISY_PP = 200;
const CLIP_ABS = 250;
const CLIP_PP = 400;

export class SignalMonitor {
  private buffers: number[][] = [];
  private packetTs: number[] = [];
  private lastTs = 0;
  private sampleCount = 0;
  private channels = 0;
  private sampleRate = 0;
  private device = "";
  private source: SignalHealth["source"] = "idle";

  reset(): void {
    this.buffers = [];
    this.packetTs = [];
    this.lastTs = 0;
    this.sampleCount = 0;
    this.channels = 0;
    this.sampleRate = 0;
    this.device = "";
    this.source = "idle";
  }

  pushSample(raw: number[]): void {
    if (raw.length === 0) return;
    this.ensureChannels(raw.length);
    for (let i = 0; i < raw.length; i += 1) {
      const buf = this.buffers[i];
      buf.push(raw[i]);
      if (buf.length > WINDOW) buf.shift();
    }
    this.sampleCount += 1;
  }

  pushFrame(frame: EegFrame): void {
    this.source = frame.source;
    this.device = frame.device;
    this.sampleRate = frame.sampleRate;
    this.channels = frame.channels || frame.raw.length;
    this.lastTs = frame.ts;
    this.packetTs.push(frame.ts);
    const cutoff = frame.ts - PACKET_WINDOW_MS;
    while (this.packetTs.length > 0 && this.packetTs[0] < cutoff) {
      this.packetTs.shift();
    }
    this.ensureChannels(this.channels);
    if (frame.raw.length > 0) this.pushSample(frame.raw);
  }

  snapshot(now = Date.now()): SignalHealth {
    const ageMs = this.lastTs ? now - this.lastTs : 0;
    const packetHz = this.packetTs.length / (PACKET_WINDOW_MS / 1000);
    const electrodes = this.buffers.map((buf, index) => electrodeFrom(buf, index));
    const status = classifyStream({
      source: this.source,
      ageMs,
      packetHz,
    });
    const bad = electrodes.filter(
      (ch) => ch.contact === "flat" || ch.contact === "clipped",
    ).length;
    const healthy =
      status === "ok" &&
      electrodes.length > 0 &&
      bad / electrodes.length <= 0.25;

    return {
      source: this.source,
      device: this.device,
      channels: this.channels,
      sampleRate: this.sampleRate,
      packetHz,
      ageMs,
      jitterMs: jitter(this.packetTs),
      samples: this.sampleCount,
      status,
      healthy,
      electrodes,
    };
  }

  private ensureChannels(count: number): void {
    if (count <= this.buffers.length) return;
    while (this.buffers.length < count) this.buffers.push([]);
    this.channels = count;
  }
}

export function idleHealth(): SignalHealth {
  return {
    source: "idle",
    device: "",
    channels: 0,
    sampleRate: 0,
    packetHz: 0,
    ageMs: 0,
    jitterMs: 0,
    samples: 0,
    status: "idle",
    healthy: false,
    electrodes: [],
  };
}

function electrodeFrom(buf: number[], index: number): ElectrodeHealth {
  if (buf.length === 0) {
    return { index, rms: 0, pp: 0, std: 0, contact: "flat" };
  }
  let sum = 0;
  let sumSq = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const v of buf) {
    sum += v;
    sumSq += v * v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const n = buf.length;
  const mean = sum / n;
  const rms = Math.sqrt(sumSq / n);
  const variance = Math.max(0, sumSq / n - mean * mean);
  const std = Math.sqrt(variance);
  const pp = max - min;
  return { index, rms, pp, std, contact: classifyContact(rms, pp, min, max) };
}

function classifyContact(
  rms: number,
  pp: number,
  min: number,
  max: number,
): ContactQuality {
  if (rms < FLAT_RMS) return "flat";
  if (pp > CLIP_PP || min < -CLIP_ABS || max > CLIP_ABS) return "clipped";
  if (rms > NOISY_RMS || pp > NOISY_PP) return "noisy";
  return "ok";
}

function classifyStream(input: {
  source: SignalHealth["source"];
  ageMs: number;
  packetHz: number;
}): StreamStatus {
  if (input.source === "idle") return "idle";
  if (input.ageMs > STALE_MS) return "stale";
  if (input.packetHz < MIN_PACKET_HZ) return "slow";
  return "ok";
}

function jitter(times: number[]): number {
  if (times.length < 3) return 0;
  const gaps: number[] = [];
  for (let i = 1; i < times.length; i += 1) gaps.push(times[i] - times[i - 1]);
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  let acc = 0;
  for (const gap of gaps) acc += (gap - mean) ** 2;
  return Math.sqrt(acc / gaps.length);
}
