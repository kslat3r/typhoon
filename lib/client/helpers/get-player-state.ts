import spotifyFetch from '@/lib/client/helpers/spotify-fetch';
import type { PlayerState } from '@/lib/client/models/types';

interface PlayerBody {
  item: { id: string; duration_ms: number } | null;
  progress_ms: number;
  is_playing: boolean;
}

export default async function getPlayerState(): Promise<PlayerState | null> {
  let response: Response;
  try {
    response = await spotifyFetch('/me/player');
  } catch (error) {
    throw new Error('Get player state failed at the request', { cause: error });
  }
  if (response.status === 204) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Get player state failed: ${response.status}`);
  }

  let body: PlayerBody;
  try {
    body = (await response.json()) as PlayerBody;
  } catch (error) {
    throw new Error('Get player state failed at reading the response', { cause: error });
  }

  return {
    trackId: body.item?.id ?? null,
    progressMs: body.progress_ms,
    durationMs: body.item?.duration_ms ?? 0,
    isPlaying: body.is_playing,
  };
}
