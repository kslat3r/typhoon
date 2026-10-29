import getSpotifyAccessToken from '@/lib/client/helpers/get-spotify-access-token';
import type { SpotifyPlayer } from '@/lib/client/models/types';

const SDK_URL = 'https://sdk.scdn.co/spotify-player.js';

type SpotifyPlayerOptions = {
  name: string;
  getOAuthToken: (callback: (token: string) => void) => void;
  volume: number;
};

declare global {
  interface Window {
    Spotify?: { Player: new (options: SpotifyPlayerOptions) => SpotifyPlayer };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

function loadSdk(): Promise<void> {
  if (window.Spotify !== undefined) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject): void => {
    window.onSpotifyWebPlaybackSDKReady = resolve;
    const script: HTMLScriptElement = document.createElement('script');
    script.src = SDK_URL;
    script.addEventListener('error', (): void => reject(new Error('Spotify player script failed to load')));
    document.head.append(script);
  });
}

// Makes this browser tab a Spotify Connect device and resolves once it can stream.
export default async function connectSpotifyPlayer(
  onError: (message: string) => void,
): Promise<{ player: SpotifyPlayer; deviceId: string }> {
  await loadSdk();
  const player: SpotifyPlayer = new (window.Spotify as NonNullable<Window['Spotify']>).Player({
    name: 'Typhoon',
    getOAuthToken: (callback: (token: string) => void): void => {
      getSpotifyAccessToken().then(callback, (tokenError: unknown): void => {
        onError(tokenError instanceof Error ? tokenError.message : String(tokenError));
      });
    },
    volume: 1,
  });

  return new Promise((resolve, reject): void => {
    player.addListener('ready', ({ device_id }: { device_id: string }): void => resolve({ player, deviceId: device_id }));
    player.addListener('not_ready', (): void => onError('Spotify player went offline'));
    player.addListener('initialization_error', ({ message }: { message: string }): void => reject(new Error(message)));
    player.addListener('authentication_error', ({ message }: { message: string }): void => reject(new Error(`${message} - reconnect Spotify in Settings`)));
    player.addListener('account_error', ({ message }: { message: string }): void => reject(new Error(message)));
    player.addListener('playback_error', ({ message }: { message: string }): void => onError(message));
    player.addListener('autoplay_failed', (): void => onError('Tap the screen once to allow audio'));
    player.connect().then((connected: boolean): void => {
      if (!connected) {
        reject(new Error('Spotify player could not connect'));
      }
    });
  });
}
