import spotifyFetch from '@/lib/client/helpers/spotify-fetch';
import type { SpotifyDevice } from '@/lib/client/models/types';

interface DevicesBody {
  devices: { id: string | null; name: string; type: string; is_active: boolean }[];
}

export default async function getSpotifyDevices(): Promise<SpotifyDevice[]> {
  let response: Response;
  try {
    response = await spotifyFetch('/me/player/devices');
  } catch (error) {
    throw new Error('Get Spotify devices failed at the request', { cause: error });
  }
  if (!response.ok) {
    throw new Error(`Get Spotify devices failed: ${response.status}`);
  }

  let body: DevicesBody;
  try {
    body = (await response.json()) as DevicesBody;
  } catch (error) {
    throw new Error('Get Spotify devices failed at reading the response', { cause: error });
  }

  return body.devices
    .filter((device): boolean => device.id !== null)
    .map((device): SpotifyDevice => ({
      id: device.id as string,
      name: device.name,
      type: device.type,
      isActive: device.is_active,
    }));
}
