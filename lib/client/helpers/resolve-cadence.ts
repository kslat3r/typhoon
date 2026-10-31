import cadenceFromCrankSamples from '@/lib/client/helpers/cadence-from-crank-samples';
import type { PowerMeasurement } from '@/lib/client/models/types';

export const CADENCE_HOLD_MS = 2000;
export const MAX_CADENCE_RPM = 250;

export interface CrankCadenceState {
  previous: PowerMeasurement | null;
  rpm: number | null;
  movedAt: number;
}

export function emptyCrankCadenceState(): CrankCadenceState {
  return { previous: null, rpm: null, movedAt: 0 };
}

// A Wattbike power notification often repeats the last crank event until the next
// revolution. Treating that repeat as 0 rpm blanks the readout between events.
export function updateCrankCadence(state: CrankCadenceState, current: PowerMeasurement, now: number): number | null {
  if (current.crankRevolutions === null || current.crankEventTime === null) {
    return state.rpm !== null && now - state.movedAt < CADENCE_HOLD_MS ? state.rpm : state.rpm;
  }

  if (state.previous === null) {
    state.previous = current;
    return state.rpm;
  }

  const repeated: boolean = state.previous.crankEventTime === current.crankEventTime;
  const computed: number | null = cadenceFromCrankSamples(state.previous, current);
  state.previous = current;

  if (repeated || computed === null) {
    if (state.rpm !== null && now - state.movedAt < CADENCE_HOLD_MS) {
      return state.rpm;
    }
    if (repeated) {
      state.rpm = 0;
      return 0;
    }
    return state.rpm;
  }

  if (computed > MAX_CADENCE_RPM) {
    return state.rpm;
  }

  state.rpm = computed;
  state.movedAt = now;
  return computed;
}

export function preferCadence(ftmsRpm: number | null, ftmsAt: number, crankRpm: number | null, now: number): number | null {
  if (ftmsRpm !== null && now - ftmsAt < CADENCE_HOLD_MS) {
    return Math.round(ftmsRpm);
  }
  return crankRpm;
}
