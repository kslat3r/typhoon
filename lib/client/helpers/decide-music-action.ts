import pickTrack from '@/lib/client/helpers/pick-track';
import shouldChangeTrack from '@/lib/client/helpers/should-change-track';
import type { MusicAction, MusicState, TempoCache, Track, ZoneNumber } from '@/lib/client/models/types';

export default function decideMusicAction(
  state: MusicState,
  zone: ZoneNumber,
  now: number,
  tracks: Track[],
  tempos: TempoCache,
  random: () => number,
): MusicAction {
  if (tracks.length === 0) {
    return { kind: 'hold' };
  }

  if (state.track === null) {
    return { kind: 'play', track: pickTrack(tracks, tempos, zone, null, random) };
  }

  const playedSeconds: number = (now - state.startedAt) / 1000;
  if (!shouldChangeTrack(state.zone, zone, playedSeconds, random)) {
    return { kind: 'hold' };
  }

  return { kind: 'play', track: pickTrack(tracks, tempos, zone, state.track.id, random) };
}
