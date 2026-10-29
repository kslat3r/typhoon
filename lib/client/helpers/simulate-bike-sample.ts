import { CADENCE_BANDS } from '@/lib/client/models/cadence-bands';
import { ZONES } from '@/lib/client/models/zones';
import type { BikeSample, ZoneNumber } from '@/lib/client/models/types';

// Zone 2 starts at 0% so coasting still counts as zone 2, but a simulated rider sits in the real band
const ZONE_TWO_FLOOR_PERCENT = 56;
const TOP_ZONE_CEILING_PERCENT = 170;

export default function simulateBikeSample(zone: ZoneNumber, ftp: number, now: number): BikeSample {
  const band = ZONES[zone - 2];
  const bottom: number = Math.max(band.minPercent, ZONE_TWO_FLOOR_PERCENT);
  const top: number = Number.isFinite(band.maxPercent) ? band.maxPercent : TOP_ZONE_CEILING_PERCENT;
  const wobble: number = Math.sin(now / 1700) * 0.3 + Math.sin(now / 430) * 0.1;
  const percent: number = (bottom + top) / 2 + ((top - bottom) / 2) * wobble;
  const cadence = CADENCE_BANDS[zone];
  const rpm: number = (cadence.min + cadence.max) / 2 + ((cadence.max - cadence.min) / 2) * Math.sin(now / 900);

  return { watts: Math.round((ftp * percent) / 100), rpm: Math.round(rpm), receivedAt: now };
}
