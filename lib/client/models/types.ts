export type ZoneNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface RideInterval {
  zone: ZoneNumber;
  seconds: number;
}

export interface Ride {
  id: string;
  name: string;
  lengthSeconds: number;
  difficulty: Difficulty;
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
  plannedSecondsInZone: [number, number, number, number, number, number, number];
  rpmSeconds: number;
  rpmSampledSeconds: number;
  maxRpm: number;
  recentWatts: number[];
  powerPartialSeconds: number;
  powerPartialWattSeconds: number;
  npFourthSum: number;
  npWindows: number;
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
  plannedSeconds?: number;
  plannedSecondsInZone?: RideStats['plannedSecondsInZone'];
  averageRpm?: number;
  maxRpm?: number;
  normalizedPower?: number;
  kilojoules?: number;
  intensityPercent?: number;
  intensityFactor?: number;
}

export interface Settings {
  ftp: number;
  bikeName: string;
  bluetoothEnabled: boolean;
}
