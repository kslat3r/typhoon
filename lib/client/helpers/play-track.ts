import spotifyFetch from '@/lib/client/helpers/spotify-fetch';

export default async function playTrack(uri: string): Promise<void> {
  let response: Response;
  try {
    response = await spotifyFetch('/me/player/play', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: [uri] }),
    });
  } catch (error) {
    throw new Error('Play failed at the request', { cause: error });
  }
  if (!response.ok) {
    throw new Error(`Play failed: ${response.status}`);
  }
}
