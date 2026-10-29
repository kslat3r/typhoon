import tempoDistance from '@/lib/client/helpers/tempo-distance';
import type { TempoCache, Track, ZoneNumber } from '@/lib/client/models/types';

// Picks at random among the tracks whose tempo sits nearest the zone's cadence band
export default function pickTrack(
  tracks: Track[],
  tempos: TempoCache,
  zone: ZoneNumber,
  excludeId: string | null,
  random: () => number,
): Track {
  if (tracks.length === 0) {
    throw new Error('No tracks to pick from');
  }

  const others = tracks.filter((track) => track.id !== excludeId);
  const pool = others.length > 0 ? others : tracks;
  const distances = pool.map((track) => tempoDistance(tempos[track.id] ?? null, zone));
  const nearest = Math.min(...distances);
  const candidates = pool.filter((_, index) => distances[index] === nearest);

  return candidates[Math.floor(random() * candidates.length)];
}
