import { STORAGE_KEYS } from '@/lib/client/models/storage-keys';
import type { SpotifyAuth } from '@/lib/client/models/types';

export default function saveSpotifyAuth(auth: SpotifyAuth | null): void {
  if (auth === null) {
    localStorage.removeItem(STORAGE_KEYS.spotifyAuth);
    return;
  }
  localStorage.setItem(STORAGE_KEYS.spotifyAuth, JSON.stringify(auth));
}
