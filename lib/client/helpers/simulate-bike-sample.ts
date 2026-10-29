import { TEMPO_BANDS } from '@/lib/client/models/tempo-bands';
import { ZONES } from '@/lib/client/models/zones';
import type { BikeSample, ZoneNumber } from '@/lib/client/models/types';

// Zone 1 starts at 0% so coasting still counts as zone 1, but a simulated rider keeps turning the pedals
const ZONE_ONE_FLOOR_PERCENT = 40;
const TOP_ZONE_CEILING_PERCENT = 170;

export default function simulateBikeSample(zone: ZoneNumber, ftp: number, now: number): BikeSample {
  const band = ZONES[zone - 1];
  const bottom: number = Math.max(band.minPercent, ZONE_ONE_FLOOR_PERCENT);
  const top: number = Number.isFinite(band.maxPercent) ? band.maxPercent : TOP_ZONE_CEILING_PERCENT;
  const wobble: number = Math.sin(now / 1700) * 0.3 + Math.sin(now / 430) * 0.1;
  const percent: number = (bottom + top) / 2 + ((top - bottom) / 2) * wobble;
  const tempo = TEMPO_BANDS[zone];
  const rpm: number = ((tempo.min + tempo.max) / 2 + ((tempo.max - tempo.min) / 2) * Math.sin(now / 900)) / 2;

  return { watts: Math.round((ftp * percent) / 100), rpm: Math.round(rpm), receivedAt: now };
}
