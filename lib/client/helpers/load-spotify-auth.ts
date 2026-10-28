import { STORAGE_KEYS } from '@/lib/client/models/storage-keys';
import type { SpotifyAuth } from '@/lib/client/models/types';

export default function loadSpotifyAuth(): SpotifyAuth | null {
  const raw = localStorage.getItem(STORAGE_KEYS.spotifyAuth);
  if (raw === null) {
    return null;
  }
  try {
    const stored: unknown = JSON.parse(raw);
    if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) {
      return null;
    }
    return stored as SpotifyAuth;
  } catch {
    return null;
  }
}
