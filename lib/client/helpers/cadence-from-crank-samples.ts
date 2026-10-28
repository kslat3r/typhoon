import type { PowerMeasurement } from '@/lib/client/models/types';

const COUNTER_RANGE = 65536;
const TICKS_PER_SECOND = 1024;

export default function cadenceFromCrankSamples(previous: PowerMeasurement, current: PowerMeasurement): number | null {
  if (
    previous.crankRevolutions === null ||
    previous.crankEventTime === null ||
    current.crankRevolutions === null ||
    current.crankEventTime === null
  ) {
    return null;
  }

  const deltaRevolutions = (current.crankRevolutions - previous.crankRevolutions + COUNTER_RANGE) % COUNTER_RANGE;
  const deltaTicks = (current.crankEventTime - previous.crankEventTime + COUNTER_RANGE) % COUNTER_RANGE;

  if (deltaTicks === 0) {
    return 0;
  }

  return Math.round((deltaRevolutions / (deltaTicks / TICKS_PER_SECOND)) * 60);
}
