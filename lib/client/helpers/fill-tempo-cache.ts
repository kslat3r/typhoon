import lookupTempos from '@/lib/client/helpers/lookup-tempos';
import saveTempoCache from '@/lib/client/helpers/save-tempo-cache';
import type { TempoCache, Track } from '@/lib/client/models/types';

const BATCH_SIZE = 40;

export default async function fillTempoCache(
  tracks: Track[],
  cache: TempoCache,
  onProgress: (done: number, total: number) => void,
): Promise<TempoCache> {
  const filled: TempoCache = { ...cache };
  const missing = tracks.filter((track) => !(track.id in filled)).map((track) => track.id);
  let done = 0;
  let failed = 0;

  for (let start = 0; start < missing.length; start += BATCH_SIZE) {
    const batch = missing.slice(start, start + BATCH_SIZE);
    let tempos: Record<string, number>;

    try {
      tempos = await lookupTempos(batch);
    } catch {
      // Left out of the cache so it is retried next time
      failed += batch.length;
      done += batch.length;
      onProgress(done, missing.length);
      continue;
    }

    for (const id of batch) {
      filled[id] = tempos[id] ?? null;
    }
    done += batch.length;
    saveTempoCache(filled);
    onProgress(done, missing.length);
  }

  if (missing.length > 0 && failed === missing.length) {
    throw new Error('Tempo lookup failed: every request failed');
  }

  return filled;
}
