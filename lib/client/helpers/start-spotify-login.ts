import base64UrlEncode from '@/lib/client/helpers/base64-url-encode';

const SCOPES =
  'user-read-playback-state user-modify-playback-state playlist-read-private playlist-read-collaborative';

export default async function startSpotifyLogin(clientId: string, redirectUri: string): Promise<void> {
  const verifier = base64UrlEncode(crypto.getRandomValues(new Uint8Array(64)));
  sessionStorage.setItem('typhoon.pkceVerifier', verifier);

  let digest: ArrayBuffer;
  try {
    digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  } catch (error) {
    throw new Error('Spotify login failed at hashing the code verifier', { cause: error });
  }
  const challenge = base64UrlEncode(new Uint8Array(digest));

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SCOPES,
  });
  window.location.assign(`https://accounts.spotify.com/authorize?${params.toString()}`);
}
