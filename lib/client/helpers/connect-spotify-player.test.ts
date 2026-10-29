import { afterEach, describe, expect, it, vi } from 'vitest';
import connectSpotifyPlayer from '@/lib/client/helpers/connect-spotify-player';

type Listener = (payload: unknown) => void;

function fakeSdk(connected: boolean): { listeners: Map<string, Listener> } {
  const listeners: Map<string, Listener> = new Map();
  class Player {
    connect = vi.fn(async (): Promise<boolean> => connected);
    addListener = (event: string, callback: Listener): void => {
      listeners.set(event, callback);
    };
  }
  window.Spotify = { Player: Player as unknown as NonNullable<Window['Spotify']>['Player'] };
  return { listeners };
}

describe('connectSpotifyPlayer', () => {
  afterEach(() => {
    delete window.Spotify;
  });

  it('resolves with the device id once the player is ready', async () => {
    // Arrange
    const { listeners } = fakeSdk(true);

    // Act
    const pending = connectSpotifyPlayer(vi.fn(), vi.fn());
    await Promise.resolve();
    (listeners.get('ready') as Listener)({ device_id: 'tab-1' });

    // Assert
    await expect(pending).resolves.toMatchObject({ deviceId: 'tab-1' });
  });

  it('reports later device changes through onDevice', async () => {
    // Arrange
    const { listeners } = fakeSdk(true);
    const onDevice = vi.fn();

    // Act
    const pending = connectSpotifyPlayer(vi.fn(), onDevice);
    await Promise.resolve();
    (listeners.get('ready') as Listener)({ device_id: 'tab-1' });
    await pending;
    (listeners.get('not_ready') as Listener)({ device_id: 'tab-1' });
    (listeners.get('ready') as Listener)({ device_id: 'tab-2' });

    // Assert
    expect(onDevice.mock.calls).toEqual([['tab-1'], [null], ['tab-2']]);
  });

  it('rejects with a reconnect hint on an authentication error', async () => {
    // Arrange
    const { listeners } = fakeSdk(true);

    // Act
    const pending = connectSpotifyPlayer(vi.fn(), vi.fn());
    await Promise.resolve();
    (listeners.get('authentication_error') as Listener)({ message: 'Authentication failed' });

    // Assert
    await expect(pending).rejects.toThrow('Authentication failed - reconnect Spotify in Settings');
  });

  it('rejects when the player cannot connect', async () => {
    // Arrange
    fakeSdk(false);

    // Act / Assert
    await expect(connectSpotifyPlayer(vi.fn(), vi.fn())).rejects.toThrow('Spotify player could not connect');
  });
});
