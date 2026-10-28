import { STORAGE_KEYS } from '@/lib/client/models/storage-keys';
import type { TempoCache } from '@/lib/client/models/types';

export default function saveTempoCache(cache: TempoCache): void {
  localStorage.setItem(STORAGE_KEYS.tempoCache, JSON.stringify(cache));
}
