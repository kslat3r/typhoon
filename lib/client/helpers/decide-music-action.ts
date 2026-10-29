import pickTrack from '@/lib/client/helpers/pick-track';
import trackFitsZone from '@/lib/client/helpers/track-fits-zone';
import { CADENCE_BANDS } from '@/lib/client/models/cadence-bands';
import type { MusicAction, MusicState, TempoCache, Track, ZoneNumber } from '@/lib/client/models/types';

// ponytail: tune after riding
const MIN_PLAY_SECONDS = 90;
const MIN_STRETCH_SECONDS = 60;

export default function decideMusicAction(
  state: MusicState,
  zone: ZoneNumber,
  now: number,
  tracks: Track[],
  tempos: TempoCache,
  random: () => number,
  stretchSeconds: number,
): MusicAction {
  if (tracks.length === 0) {
    return { kind: 'hold' };
  }

  if (state.track === null) {
    return { kind: 'play', track: pickTrack(tracks, tempos, zone, null, random) };
  }

  const sameBand: boolean = CADENCE_BANDS[state.zone] === CADENCE_BANDS[zone];
  const stillFits: boolean = trackFitsZone(tempos[state.track.id] ?? null, zone);
  const playedSeconds: number = (now - state.startedAt) / 1000;

  if (sameBand || stillFits || playedSeconds < MIN_PLAY_SECONDS || stretchSeconds < MIN_STRETCH_SECONDS) {
    return { kind: 'hold' };
  }

  return { kind: 'play', track: pickTrack(tracks, tempos, zone, state.track.id, random) };
}
