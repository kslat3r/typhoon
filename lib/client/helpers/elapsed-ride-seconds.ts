import type { RideSummary } from '@/lib/client/models/types';

// durationSeconds is how long the ride clock ran. Pausing stops that clock, so the value is
// sampled time plus time with no bike sample. plannedSeconds is the workout length and is not shown here.
// Older saves have no plannedSeconds. Their durationSeconds is still the time ridden.
export default function elapsedRideSeconds(summary: Pick<RideSummary, 'durationSeconds' | 'plannedSeconds'>): number {
  return summary.durationSeconds;
}
