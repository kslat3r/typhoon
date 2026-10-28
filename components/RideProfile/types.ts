import type { IntervalPosition, Ride } from '@/lib/client/models/types';

export type RideProfileProps = {
  ride: Ride;
  position: IntervalPosition | null;
  percentOfFtp: number | null;
};
