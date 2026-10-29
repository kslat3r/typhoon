import getSpotifyAccessToken from '@/lib/client/helpers/get-spotify-access-token';

export default async function spotifyFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const accessToken: string = await getSpotifyAccessToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(`https://api.spotify.com/v1${path}`, { ...init, headers });
  } catch (error) {
    throw new Error(`Spotify request failed at calling ${path}`, { cause: error });
  }
  return response;
}
