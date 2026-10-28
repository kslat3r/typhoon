import type { SpotifyAuth } from '@/lib/client/models/types';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export default async function completeSpotifyLogin(
  clientId: string,
  redirectUri: string,
  code: string,
): Promise<SpotifyAuth> {
  const verifier = localStorage.getItem('typhoon.pkceVerifier');
  if (verifier === null) {
    throw new Error('Spotify login failed: missing PKCE verifier');
  }
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: verifier,
  });

  let response: Response;
  try {
    response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  } catch (error) {
    throw new Error('Spotify login failed at the token request', { cause: error });
  }
  if (!response.ok) {
    throw new Error(`Spotify login failed at the token request: ${response.status}`);
  }

  let token: TokenResponse;
  try {
    token = (await response.json()) as TokenResponse;
  } catch (error) {
    throw new Error('Spotify login failed at reading the token response', { cause: error });
  }
  localStorage.removeItem('typhoon.pkceVerifier');

  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + token.expires_in * 1000,
  };
}
