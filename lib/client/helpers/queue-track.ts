import spotifyFetch from '@/lib/client/helpers/spotify-fetch';

export default async function queueTrack(uri: string, deviceId: string): Promise<void> {
  const query: string = new URLSearchParams({ uri, device_id: deviceId }).toString();
  let response: Response;
  try {
    response = await spotifyFetch(`/me/player/queue?${query}`, { method: 'POST' });
  } catch (error) {
    throw new Error('Queue failed at the request', { cause: error });
  }
  if (!response.ok) {
    throw new Error(`Queue failed: ${response.status}`);
  }
}
