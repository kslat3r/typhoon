import { STORAGE_KEYS } from '@/lib/client/models/storage-keys';
import type { RideSummary } from '@/lib/client/models/types';

function isSummary(entry: unknown): entry is RideSummary {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    typeof (entry as { id?: unknown }).id === 'string' &&
    Array.isArray((entry as { secondsInZone?: unknown }).secondsInZone) &&
    [6, 7].includes((entry as { secondsInZone: unknown[] }).secondsInZone.length)
  );
}

// Rides saved on the short-lived six zone scale get an empty zone 1
function foldLegacyZones(summary: RideSummary): RideSummary {
  const zones: number[] = summary.secondsInZone;
  if (zones.length === 7) {
    return summary;
  }
  return { ...summary, secondsInZone: [0, zones[0], zones[1], zones[2], zones[3], zones[4], zones[5]] };
}

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
    return stored.filter(isSummary).map(foldLegacyZones);
  } catch {
    return [];
  }
}
