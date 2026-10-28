import type { IntervalPosition, Ride } from '@/lib/client/models/types';

export default function intervalAtElapsed(ride: Ride, elapsedSeconds: number): IntervalPosition | null {
  const elapsed = Math.max(0, elapsedSeconds);
  const totalSeconds = ride.intervals.reduce((sum, interval) => sum + interval.seconds, 0);

  if (elapsed >= totalSeconds) {
    return null;
  }

  let intervalStart = 0;

  for (let index = 0; index < ride.intervals.length; index += 1) {
    const interval = ride.intervals[index];
    const intervalEnd = intervalStart + interval.seconds;

    if (elapsed < intervalEnd) {
      return {
        index,
        interval,
        secondsIntoInterval: elapsed - intervalStart,
        secondsLeftInInterval: intervalEnd - elapsed,
        secondsLeftInRide: totalSeconds - elapsed,
      };
    }

    intervalStart = intervalEnd;
  }

  return null;
}
