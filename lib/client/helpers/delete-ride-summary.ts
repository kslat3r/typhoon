import loadHistory from '@/lib/client/helpers/load-history';
import { STORAGE_KEYS } from '@/lib/client/models/storage-keys';
import type { RideSummary } from '@/lib/client/models/types';

export default function deleteRideSummary(id: string): void {
  const history: RideSummary[] = loadHistory().filter((summary: RideSummary): boolean => summary.id !== id);
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
}
