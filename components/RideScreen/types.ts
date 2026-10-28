import type { BikeSample, IntervalPosition, MusicState, RideStats, Settings, TempoCache, Track } from '@/lib/client/models/types';

export type FinishReason = 'completed' | 'ended' | 'navigated';

export type RidePhase = 'ready' | 'riding' | 'finished';

export type BikeState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export type RideScreenElements = {
  artwork: HTMLImageElement;
  trackTitle: HTMLElement;
  trackArtist: HTMLElement;
  countdown: HTMLElement;
  zoneLabel: HTMLElement;
  watts: HTMLElement;
  rpm: HTMLElement;
  mph: HTMLElement;
  averageMph: HTMLElement;
  miles: HTMLElement;
  remaining: HTMLElement;
  profileRoot: HTMLElement;
  status: HTMLElement;
  connectButton: HTMLButtonElement;
  startButton: HTMLButtonElement;
  controls: HTMLElement;
  endButton: HTMLButtonElement;
  statsStrip: HTMLElement;
};

export type RideScreenState = {
  phase: RidePhase;
  settings: Settings;
  startedAt: number;
  startedAtDate: Date;
  lastTickAt: number;
  lastPollAt: number;
  stats: RideStats;
  latestSample: BikeSample | null;
  position: IntervalPosition | null;
  device: BluetoothDevice | null;
  bikeState: BikeState;
  tracks: Track[];
  tempos: TempoCache;
  music: MusicState;
  musicFailed: boolean;
  queuedForThisPlay: boolean;
  spotifyCallInFlight: boolean;
  reconnectInFlight: boolean;
  pendingPlay: Track | null;
  wakeLock: WakeLockSentinel | null;
  tickHandle: ReturnType<typeof setInterval> | null;
  reconnectHandle: ReturnType<typeof setInterval> | null;
  ftpTestWattSeconds: number;
  ftpTestSeconds: number;
  listeners: AbortController;
  elements: RideScreenElements;
};
