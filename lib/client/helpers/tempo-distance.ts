import { TEMPO_BANDS } from '@/lib/client/models/tempo-bands';
import type { ZoneNumber } from '@/lib/client/models/types';

// How far a track's tempo (as bpm, half or double) sits outside the zone's tempo band; 0 means it fits
export default function tempoDistance(bpm: number | null, zone: ZoneNumber): number {
  if (bpm === null) {
    return Infinity;
  }

  const band = TEMPO_BANDS[zone];
  const candidates = [bpm, bpm / 2, bpm * 2];

  return Math.min(...candidates.map((candidate) => Math.max(band.min - candidate, candidate - band.max, 0)));
}
