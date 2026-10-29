import tempoDistance from '@/lib/client/helpers/tempo-distance';
import type { TempoCache, Track, ZoneNumber } from '@/lib/client/models/types';

// Any track within this many bpm of the nearest fit is as good as the nearest, and the pool is
// never smaller than the nearest ten, so a playlist with few songs in band still varies
const TEMPO_SLACK = 8;
const MIN_CANDIDATES = 10;

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
  const ranked = pool
    .map((track) => ({ track, distance: tempoDistance(tempos[track.id] ?? null, zone) }))
    .sort((left, right) => left.distance - right.distance);
  const nearest = ranked[0].distance;
  const candidates = ranked.filter((entry, index) => index < MIN_CANDIDATES || entry.distance <= nearest + TEMPO_SLACK).map((entry) => entry.track);

  return candidates[Math.floor(random() * candidates.length)];
}
