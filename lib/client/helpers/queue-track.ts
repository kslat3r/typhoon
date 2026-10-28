import spotifyFetch from '@/lib/client/helpers/spotify-fetch';

export default async function queueTrack(uri: string): Promise<void> {
  let response: Response;
  try {
    response = await spotifyFetch(`/me/player/queue?uri=${encodeURIComponent(uri)}`, { method: 'POST' });
  } catch (error) {
    throw new Error('Queue failed at the request', { cause: error });
  }
  if (!response.ok) {
    throw new Error(`Queue failed: ${response.status}`);
  }
}
