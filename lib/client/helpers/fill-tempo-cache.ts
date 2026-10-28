import lookupTempo from '@/lib/client/helpers/lookup-tempo';
import saveTempoCache from '@/lib/client/helpers/save-tempo-cache';
import type { TempoCache, Track } from '@/lib/client/models/types';

export default async function fillTempoCache(
  apiKey: string,
  tracks: Track[],
  cache: TempoCache,
  onProgress: (done: number, total: number) => void,
): Promise<TempoCache> {
  const filled: TempoCache = { ...cache };
  const missing = tracks.filter((track) => !(track.id in filled));
  let done = 0;

  for (const [index, track] of missing.entries()) {
    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }

    let tempo: number | null;

    try {
      tempo = await lookupTempo(apiKey, track);
    } catch {
      // Left out of the cache so it is retried next time
      continue;
    }

    filled[track.id] = tempo;
    done += 1;
    saveTempoCache(filled);
    onProgress(done, missing.length);
  }

  return filled;
}
