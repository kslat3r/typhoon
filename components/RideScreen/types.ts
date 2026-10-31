import type { BikeSample, IntervalPosition, RideStats, Settings, SpotifyPlayer, TempoCache, Track } from '@/lib/client/models/types';

export type FinishReason = 'completed' | 'ended' | 'navigated';

export type RidePhase = 'ready' | 'riding' | 'finished';

export type BikeState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export type RideScreenElements = {
  artwork: HTMLImageElement;
  placeholder: HTMLElement;
  spinner: HTMLElement;
  trackTitle: HTMLElement;
  trackArtist: HTMLElement;
  prevButton: HTMLButtonElement;
  nextButton: HTMLButtonElement;
  interval: HTMLElement;
  percent: HTMLElement;
  watts: HTMLElement;
  rpm: HTMLElement;
  mph: HTMLElement;
  averageMph: HTMLElement;
  miles: HTMLElement;
  remaining: HTMLElement;
  target: HTMLElement;
  zoneCurrent: HTMLElement;
  zoneTarget: HTMLElement;
  zoneMarker: SVGCircleElement;
  zoneNeedle: SVGLineElement;
  zoneRing: HTMLElement;
  profileRoot: HTMLElement;
  connectButton: HTMLButtonElement;
  startButton: HTMLButtonElement;
  testButton: HTMLButtonElement;
  pauseButton: HTMLButtonElement;
  endButton: HTMLButtonElement;
  doneButton: HTMLButtonElement;
  statsStrip: HTMLElement;
};

export type RideScreenState = {
  phase: RidePhase;
  settings: Settings;
  startedAt: number;
  startedAtDate: Date;
  paused: boolean;
  pausedAt: number;
  pausedMs: number;
  lastTickAt: number;
  lastPollAt: number;
  stats: RideStats;
  latestSample: BikeSample | null;
  position: IntervalPosition | null;
  device: BluetoothDevice | null;
  bikeState: BikeState;
  testMode: boolean;
  tracks: Track[];
  tempos: TempoCache;
  track: Track | null;
  history: Track[];
  played: Set<string>;
  summaryId: string | null;
  musicMessage: string | null;
  musicSkips: number;
  musicLoading: boolean;
  lastPlayAt: number;
  player: SpotifyPlayer | null;
  playerDeviceId: string | null;
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
