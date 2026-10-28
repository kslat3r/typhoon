import loadHistory from '@/lib/client/helpers/load-history';
import { STORAGE_KEYS } from '@/lib/client/models/storage-keys';
import type { RideSummary } from '@/lib/client/models/types';

export default function appendRideSummary(summary: RideSummary): void {
  const history = loadHistory();
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify([summary, ...history]));
}
