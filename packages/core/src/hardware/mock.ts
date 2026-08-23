import type { EegFrame } from "../types.ts";
import { derivedStates } from "./context.ts";

const CHANNELS = 8;
const SAMPLE_RATE = 250;
const UPDATE_HZ = 12;
const DEVICE = "mock-8";

export class MockPieeg {
  private timer: ReturnType<typeof setInterval> | null = null;
  private sampleIndex = 0;

  start(onFrame: (frame: EegFrame) => void): void {
    this.stop();
    const batch = Math.round(SAMPLE_RATE / UPDATE_HZ);
    this.timer = setInterval(() => {
      let raw: number[] = [];
      for (let i = 0; i < batch; i += 1) {
        raw = synthesizeSample(this.sampleIndex);
        this.sampleIndex += 1;
      }
      const t = this.sampleIndex / SAMPLE_RATE;
      const bands = {
        Delta: 0.18 + 0.04 * Math.sin(t / 7),
        Theta: 0.22 + 0.05 * Math.sin(t / 5 + 1),
        Alpha: 0.42 + 0.16 * Math.sin(t / 3),
        Beta: 0.2 + 0.08 * Math.sin(t / 4 + 2),
        Gamma: 0.08 + 0.03 * Math.sin(t / 6 + 0.5),
      };
      const states = derivedStates(bands);
      onFrame({
        ts: Date.now(),
        source: "mock",
        device: DEVICE,
        channels: CHANNELS,
        sampleRate: SAMPLE_RATE,
        raw,
        bands,
        relaxation: states.relaxation,
        focus: states.focus,
        meditation: states.meditation,
      });
    }, Math.round(1000 / UPDATE_HZ));
  }

  stop(): void {
    if (this.timer == null) return;
    clearInterval(this.timer);
    this.timer = null;
  }
}

function synthesizeSample(index: number): number[] {
  const t = index / SAMPLE_RATE;
  const raw = new Array<number>(CHANNELS);
  for (let ch = 0; ch < CHANNELS; ch += 1) {
    const phase = ch * 0.35;
    raw[ch] =
      18 * Math.sin(2 * Math.PI * 10 * t + phase) +
      8 * Math.sin(2 * Math.PI * 6 * t + phase) +
      4 * Math.sin(2 * Math.PI * 20 * t + phase * 0.5) +
      (Math.random() - 0.5) * 3;
  }
  return raw;
}
