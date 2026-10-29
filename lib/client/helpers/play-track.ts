import spotifyFetch from '@/lib/client/helpers/spotify-fetch';

export default async function playTrack(uri: string, deviceId: string): Promise<void> {
  const path: string = `/me/player/play?device_id=${encodeURIComponent(deviceId)}`;
  let response: Response;
  try {
    response = await spotifyFetch(path, {
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
