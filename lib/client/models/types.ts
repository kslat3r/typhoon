export type ZoneNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface RideInterval {
  zone: ZoneNumber;
  seconds: number;
}

export interface Ride {
  id: string;
  name: string;
  lengthSeconds: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  archetype: 'climb' | 'time-trial' | 'hiit' | 'over-under' | 'endurance' | 'mash-up';
  intervals: RideInterval[];
  ftpTest?: { intervalIndex: number; seconds: 60 | 180 | 300 };
}

export interface PowerMeasurement {
  watts: number;
  crankRevolutions: number | null;
  crankEventTime: number | null;
}

export interface BikeSample {
  watts: number;
  rpm: number | null;
  receivedAt: number;
}

export type BikeListener = (sample: BikeSample) => void;

export interface IntervalPosition {
  index: number;
  interval: RideInterval;
  secondsIntoInterval: number;
  secondsLeftInInterval: number;
  secondsLeftInRide: number;
}

export interface RideStats {
  sampledSeconds: number;
  missingSeconds: number;
  wattSeconds: number;
  maxWatts: number;
  miles: number;
  secondsInZone: [number, number, number, number, number, number, number];
}

export interface RideSummary {
  id: string;
  rideId: string;
  rideName: string;
  difficulty: number;
  startedAt: string;
  durationSeconds: number;
  averageWatts: number;
  maxWatts: number;
  miles: number;
  averageMph: number;
  secondsInZone: RideStats['secondsInZone'];
  missingSeconds: number;
  ftpUsed: number;
  ftpTestSeconds?: 60 | 180 | 300;
  ftpTestAverageWatts?: number;
  endedEarly?: boolean;
}

export interface Settings {
  ftp: number;
  spotifyClientId: string;
  spotifyPlaylistId: string;
  bikeName: string;
  musicEnabled: boolean;
  bluetoothEnabled: boolean;
}

export type TempoCache = Record<string, number | null>;

export interface SpotifyAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface Track {
  id: string;
  uri: string;
  name: string;
  artist: string;
  artworkUrl: string | null;
  durationMs: number;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
}

export interface SpotifyPlayerState {
  paused: boolean;
  position: number;
  duration: number;
  track_window: { current_track: { uri: string; name: string; artists: { name: string }[]; album: { images: { url: string }[] } } };
}

export interface SpotifyPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  activateElement(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  getCurrentState(): Promise<SpotifyPlayerState | null>;
  addListener(event: string, callback: (payload: never) => void): void;
}
