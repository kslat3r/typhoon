import tempoDistance from '@/lib/client/helpers/tempo-distance';
import type { TempoCache, Track, ZoneNumber } from '@/lib/client/models/types';

// Any track within this many bpm of the nearest fit is as good as the nearest, so picks vary
const TEMPO_SLACK = 8;

// Picks at random among the unplayed tracks whose tempo sits at or near the zone's tempo band.
// Once every track has played, anything but the current one is fair game again.
export default function pickTrack(
  tracks: Track[],
  tempos: TempoCache,
  zone: ZoneNumber,
  played: ReadonlySet<string>,
  currentId: string | null,
  random: () => number,
): Track {
  if (tracks.length === 0) {
    throw new Error('No tracks to pick from');
  }

  const others = tracks.filter((track) => track.id !== currentId);
  const unplayed = others.filter((track) => !played.has(track.id));
  const pool = unplayed.length > 0 ? unplayed : others.length > 0 ? others : tracks;
  const distances = pool.map((track) => tempoDistance(tempos[track.id] ?? null, zone));
  const nearest = Math.min(...distances);
  const candidates = pool.filter((_, index) => distances[index] <= nearest + TEMPO_SLACK);

  return candidates[Math.floor(random() * candidates.length)];
}
