import loadSettings from '@/lib/client/helpers/load-settings';
import loadSpotifyAuth from '@/lib/client/helpers/load-spotify-auth';
import refreshSpotifyToken from '@/lib/client/helpers/refresh-spotify-token';
import saveSpotifyAuth from '@/lib/client/helpers/save-spotify-auth';
import type { SpotifyAuth } from '@/lib/client/models/types';

export default async function spotifyFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let auth: SpotifyAuth | null = loadSpotifyAuth();
  if (auth === null) {
    throw new Error('Spotify not connected');
  }

  if (auth.expiresAt - Date.now() < 60000) {
    let refreshed: SpotifyAuth;
    try {
      refreshed = await refreshSpotifyToken(loadSettings().spotifyClientId, auth);
    } catch (error) {
      throw new Error('Spotify request failed at refreshing the token', { cause: error });
    }
    saveSpotifyAuth(refreshed);
    auth = refreshed;
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${auth.accessToken}`);

  let response: Response;
  try {
    response = await fetch(`https://api.spotify.com/v1${path}`, { ...init, headers });
  } catch (error) {
    throw new Error(`Spotify request failed at calling ${path}`, { cause: error });
  }
  return response;
}
