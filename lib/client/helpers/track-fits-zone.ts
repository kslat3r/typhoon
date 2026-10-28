import { CADENCE_BANDS } from '@/lib/client/models/cadence-bands';
import type { ZoneNumber } from '@/lib/client/models/types';

export default function trackFitsZone(bpm: number | null, zone: ZoneNumber): boolean {
  if (bpm === null) {
    return false;
  }

  const band = CADENCE_BANDS[zone];
  const candidates = [bpm, bpm / 2, bpm * 2];

  return candidates.some((candidate) => candidate >= band.min && candidate <= band.max);
}
