import type { ZoneNumber } from '@/lib/client/models/types';

// One target cadence per zone for rides without a power meter.
// Recovery and easy sit in 85-95, tempo in 90-100, threshold climbs in 70-85, VO2 and sprints in 100-115.
export const TARGET_RPM: Record<ZoneNumber, number> = {
  1: 90,
  2: 95,
  3: 100,
  4: 80,
  5: 105,
  6: 110,
  7: 115,
};

export function targetRpmForZone(zone: ZoneNumber): number {
  return TARGET_RPM[zone];
}
