import { STORAGE_KEYS } from '@/lib/client/models/storage-keys';
import type { Settings } from '@/lib/client/models/types';

export default function loadSettings(): Settings {
  const defaults: Settings = {
    ftp: 150,
    spotifyClientId: '',
    spotifyPlaylistId: '',
    bikeName: '',
  };
  const raw = localStorage.getItem(STORAGE_KEYS.settings);
  if (raw === null) {
    return defaults;
  }
  try {
    const stored: unknown = JSON.parse(raw);
    if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) {
      return defaults;
    }
    return { ...defaults, ...stored };
  } catch {
    return defaults;
  }
}
