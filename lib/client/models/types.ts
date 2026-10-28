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
  archetype: 'climb' | 'time-trial' | 'hiit' | 'over-under' | 'endurance' | 'mash-up' | 'ftp-test';
  intervals: RideInterval[];
  ftpTestSeconds?: 60 | 180 | 300;
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
}

export interface Settings {
  ftp: number;
  spotifyClientId: string;
  spotifyPlaylistId: string;
  getSongBpmKey: string;
  bikeName: string;
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

export interface PlayerState {
  trackId: string | null;
  progressMs: number;
  durationMs: number;
  isPlaying: boolean;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
}

export type MusicState = {
  track: Track | null;
  startedAt: number;
  zone: ZoneNumber;
};

export type MusicAction = { kind: 'hold' } | { kind: 'play'; track: Track };
