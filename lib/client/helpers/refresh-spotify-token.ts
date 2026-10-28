import type { SpotifyAuth } from '@/lib/client/models/types';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export default async function refreshSpotifyToken(clientId: string, auth: SpotifyAuth): Promise<SpotifyAuth> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: auth.refreshToken,
    client_id: clientId,
  });

  let response: Response;
  try {
    response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  } catch (error) {
    throw new Error('Spotify refresh failed at the token request', { cause: error });
  }
  if (!response.ok) {
    throw new Error(`Spotify refresh failed at the token request: ${response.status}`);
  }

  let token: TokenResponse;
  try {
    token = (await response.json()) as TokenResponse;
  } catch (error) {
    throw new Error('Spotify refresh failed at reading the token response', { cause: error });
  }

  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? auth.refreshToken,
    expiresAt: Date.now() + token.expires_in * 1000,
  };
}
