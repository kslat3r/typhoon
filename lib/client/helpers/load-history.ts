import { STORAGE_KEYS } from '@/lib/client/models/storage-keys';
import type { RideSummary } from '@/lib/client/models/types';

export default function loadHistory(): RideSummary[] {
  const raw = localStorage.getItem(STORAGE_KEYS.history);
  if (raw === null) {
    return [];
  }
  try {
    const stored: unknown = JSON.parse(raw);
    return Array.isArray(stored) ? (stored as RideSummary[]) : [];
  } catch {
    return [];
  }
}
