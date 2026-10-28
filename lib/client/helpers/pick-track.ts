import trackFitsZone from '@/lib/client/helpers/track-fits-zone';
import type { TempoCache, Track, ZoneNumber } from '@/lib/client/models/types';

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
  const fitting = others.filter((track) => trackFitsZone(tempos[track.id] ?? null, zone));
  const unknown = others.filter((track) => tempos[track.id] === undefined || tempos[track.id] === null);
  const candidateLists = [fitting, unknown, others, tracks];
  const candidates = candidateLists.find((list) => list.length > 0) as Track[];

  return candidates[Math.floor(random() * candidates.length)];
}
