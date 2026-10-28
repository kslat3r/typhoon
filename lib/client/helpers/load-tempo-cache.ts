import { STORAGE_KEYS } from '@/lib/client/models/storage-keys';
import type { TempoCache } from '@/lib/client/models/types';

export default function loadTempoCache(): TempoCache {
  const raw = localStorage.getItem(STORAGE_KEYS.tempoCache);
  if (raw === null) {
    return {};
  }
  try {
    const stored: unknown = JSON.parse(raw);
    if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) {
      return {};
    }
    return stored as TempoCache;
  } catch {
    return {};
  }
}
