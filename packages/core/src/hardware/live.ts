import type { PieegClient, PieegCtor } from "../pieeg-sdk.d.ts";
import type { EegFrame } from "../types.ts";
import { derivedStates, normalizeBands } from "./context.ts";

const PIEEG_CDN =
  "https://cdn.jsdelivr.net/gh/pieeg-club/PiEEG-server@main/pieeg.js";

export const EEG_DEVICES = [
  { id: "ironbci-8", label: "IronBCI-8", transport: "ble" as const },
  { id: "ironbci-16", label: "IronBCI-16", transport: "ble" as const },
  { id: "octopus-16", label: "Octopus 16", transport: "ble" as const },
  { id: "ironbci-32", label: "IronBCI-32", transport: "serial" as const },
];

export class PieegHost {
  private client: PieegClient | null = null;
  private latestRaw: number[] = [];
  private closed = false;

  get connected(): boolean {
    return this.client != null;
  }

  async connect(
    deviceId: string,
    onFrame: (frame: EegFrame) => void,
    onDisconnect: () => void,
    onError: (message: string) => void,
  ): Promise<void> {
    this.disconnect();
    this.closed = false;

    const PiEEG = await loadPieeg();
    const client = new PiEEG({ filter: true });
    const device = EEG_DEVICES.find((item) => item.id === deviceId);
    const transport = device?.transport ?? (deviceId === "ironbci-32" ? "serial" : "ble");

    if (transport === "serial") {
      await client.connectSerial({ device: deviceId });
    } else {
      await client.connectBLE({ device: deviceId });
    }

    if (this.closed) {
      client.disconnect();
      return;
    }

    this.client = client;
    this.latestRaw = [];

    client.onData((channels) => {
      this.latestRaw = channels.slice();
    });

    client.onBandPowers((bands) => {
      if (this.client !== client) return;
      const stats = client.getStats();
      const normalized = normalizeBands(bands);
      const states = {
        relaxation: client.getRelaxationIndex(),
        focus: client.getFocusIndex(),
        meditation: client.getMeditationIndex(),
      };
      const fallback = derivedStates(normalized);
      onFrame({
        ts: Date.now(),
        source: "live",
        device: stats.device ?? deviceId,
        channels: stats.numChannels,
        sampleRate: stats.sampleRate,
        raw: this.latestRaw,
        bands: normalized,
        relaxation: states.relaxation || fallback.relaxation,
        focus: states.focus || fallback.focus,
        meditation: states.meditation || fallback.meditation,
      });
    });

    client.onError((error) => {
      onError(error instanceof Error ? error.message : String(error));
    });

    client.onDisconnect(() => {
      if (this.client !== client) return;
      this.client = null;
      onDisconnect();
    });
  }

  disconnect(): void {
    this.closed = true;
    const client = this.client;
    this.client = null;
    if (!client) return;
    client.onDisconnect(() => {});
    client.onBandPowers(() => {});
    client.onData(() => {});
    client.onError(() => {});
    client.disconnect();
  }
}

async function loadPieeg(): Promise<PieegCtor> {
  const existing = window.PiEEG;
  if (existing) return existing;

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PIEEG_CDN;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("failed to load pieeg.js from CDN"));
    document.head.appendChild(script);
  });

  const ctor = window.PiEEG;
  if (!ctor) throw new Error("pieeg.js loaded without exposing PiEEG");
  return ctor;
}
