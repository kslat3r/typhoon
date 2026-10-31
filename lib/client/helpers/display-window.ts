import speedFromWatts from '@/lib/client/helpers/speed-from-watts';
import type { BikeSample } from '@/lib/client/models/types';

export const DISPLAY_WINDOW_SECONDS = 5;

export type LiveAverage = {
  watts: number;
  rpm: number | null;
  mph: number;
};

export type DisplayWindowState = {
  elapsedSeconds: number;
  watts: number[];
  rpms: number[];
  seenAt: number[];
};

export type DisplayWindowAdvance = {
  state: DisplayWindowState;
  published: LiveAverage | 'hold' | null;
};

function mean(values: number[]): number {
  return values.reduce((sum: number, value: number): number => sum + value, 0) / values.length;
}

export function emptyDisplayWindow(): DisplayWindowState {
  return { elapsedSeconds: 0, watts: [], rpms: [], seenAt: [] };
}

export function recordDisplaySample(state: DisplayWindowState, sample: BikeSample | null): DisplayWindowState {
  if (sample === null || state.seenAt.includes(sample.receivedAt)) {
    return state;
  }

  return {
    elapsedSeconds: state.elapsedSeconds,
    watts: [...state.watts, sample.watts],
    rpms: sample.rpm === null ? state.rpms : [...state.rpms, sample.rpm],
    seenAt: [...state.seenAt, sample.receivedAt],
  };
}

export function ignoreDisplaySample(state: DisplayWindowState, receivedAt: number): DisplayWindowState {
  if (state.seenAt.includes(receivedAt)) {
    return state;
  }

  return { ...state, seenAt: [...state.seenAt, receivedAt] };
}

export function advanceDisplayWindow(state: DisplayWindowState, deltaSeconds: number): DisplayWindowAdvance {
  const delta: number = Math.max(0, deltaSeconds);
  const elapsed: number = state.elapsedSeconds + delta;
  if (elapsed < DISPLAY_WINDOW_SECONDS) {
    return { state: { ...state, elapsedSeconds: elapsed }, published: null };
  }

  const published: LiveAverage | 'hold' =
    state.watts.length === 0
      ? 'hold'
      : {
          watts: mean(state.watts),
          rpm: state.rpms.length === 0 ? null : mean(state.rpms),
          mph: mean(state.watts.map((watts: number): number => speedFromWatts(watts))),
        };

  let remainder: number = elapsed - DISPLAY_WINDOW_SECONDS;
  while (remainder >= DISPLAY_WINDOW_SECONDS) {
    remainder -= DISPLAY_WINDOW_SECONDS;
  }

  return { state: { ...emptyDisplayWindow(), elapsedSeconds: remainder }, published };
}
