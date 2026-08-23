export interface PieegConnectResult {
  device: string;
  deviceName: string;
  channels: number;
  sampleRate: number;
}

export interface PieegStats {
  connected: boolean;
  device: string | null;
  deviceLabel: string | null;
  deviceType: string | null;
  numChannels: number;
  sampleRate: number;
  samplesReceived: number;
  bufferFill: number;
}

export interface PieegCtor {
  new (options?: {
    filter?: boolean | Record<string, unknown>;
    updateHz?: number;
    fftSize?: number;
    bufferSeconds?: number;
  }): PieegClient;
  devices(transport?: "ble" | "serial"): Array<{
    id: string;
    label: string;
    transport: string;
    channels: number;
    sampleRate: number;
  }>;
  VERSION: string;
}

export interface PieegClient {
  connectBLE(options?: { device?: string }): Promise<PieegConnectResult>;
  connectSerial(options?: { device?: string }): Promise<PieegConnectResult>;
  disconnect(): void;
  onData(callback: (channels: number[], timestamp: number) => void): void;
  onBandPowers(callback: (bands: Record<string, number>) => void): void;
  onError(callback: (error: unknown) => void): void;
  onDisconnect(callback: () => void): void;
  getRelaxationIndex(): number;
  getFocusIndex(): number;
  getMeditationIndex(): number;
  getBandPowers(): Record<string, number> | null;
  getStats(): PieegStats;
}

declare global {
  interface Window {
    PiEEG?: PieegCtor;
  }
}
