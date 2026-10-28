import { STORAGE_KEYS } from '@/lib/client/models/storage-keys';
import type { Settings } from '@/lib/client/models/types';

export default function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
}
