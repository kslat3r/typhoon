import { STORAGE_KEYS } from '@/lib/client/models/storage-keys';
import type { RideSummary } from '@/lib/client/models/types';

export default function loadHistory(): RideSummary[] {
  const raw = localStorage.getItem(STORAGE_KEYS.history);
  if (raw === null) {
    return [];
  }
  try {
    const stored: unknown = JSON.parse(raw);
    if (!Array.isArray(stored)) {
      return [];
    }
    return stored.filter(
      (entry: unknown): boolean =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as { id?: unknown }).id === 'string' &&
        Array.isArray((entry as { secondsInZone?: unknown }).secondsInZone) &&
        (entry as { secondsInZone: unknown[] }).secondsInZone.length === 7,
    ) as RideSummary[];
  } catch {
    return [];
  }
}
