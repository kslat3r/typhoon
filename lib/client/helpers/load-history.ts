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

// Rides saved before zone 1 was dropped fold their zone 1 seconds into zone 2
function foldLegacyZones(summary: RideSummary): RideSummary {
  const zones: number[] = summary.secondsInZone;
  if (zones.length === 6) {
    return summary;
  }
  return { ...summary, secondsInZone: [zones[0] + zones[1], zones[2], zones[3], zones[4], zones[5], zones[6]] };
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
