import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import renderRideScreen from '@/components/RideScreen';
import appendRideSummary from '@/lib/client/helpers/append-ride-summary';
import { STORAGE_KEYS } from '@/lib/client/models/storage-keys';
import type { BikeListener, Ride, Track } from '@/lib/client/models/types';

vi.mock('@/lib/client/helpers/play-track', () => ({ default: vi.fn(async () => Promise.reject(new Error('Play failed: 404'))) }));
vi.mock('@/lib/client/helpers/queue-track', () => ({ default: vi.fn(async () => undefined) }));
vi.mock('@/lib/client/helpers/get-player-state', () => ({ default: vi.fn(async () => null) }));
vi.mock('@/lib/client/helpers/load-spotify-auth', () => ({
  default: vi.fn(() => ({ accessToken: 'token', refreshToken: 'refresh', expiresAt: Date.now() + 3600000 })),
}));
vi.mock('@/lib/client/helpers/get-playlist-tracks', () => ({
  default: vi.fn(async (): Promise<Track[]> => [
    { id: 'a', uri: 'spotify:track:a', name: 'Track A', artist: 'Artist A', artworkUrl: null, durationMs: 180000 },
    { id: 'b', uri: 'spotify:track:b', name: 'Track B', artist: 'Artist B', artworkUrl: null, durationMs: 180000 },
  ]),
}));
vi.mock('@/lib/client/helpers/connect-wattbike', () => ({
  default: vi.fn(async (onSample: BikeListener): Promise<BluetoothDevice> => {
    onSample({ watts: 150, rpm: 90, receivedAt: performance.now() });
    return { name: 'WattbikePM1', gatt: { disconnect: vi.fn() } } as unknown as BluetoothDevice;
  }),
}));
vi.mock('@/lib/client/helpers/append-ride-summary', () => ({ default: vi.fn() }));

const testRide: Ride = {
  id: 'test-ride',
  name: 'Test ride',
  lengthSeconds: 30,
  difficulty: 1,
  archetype: 'endurance',
  intervals: [
    { zone: 2, seconds: 10 },
    { zone: 4, seconds: 10 },
    { zone: 1, seconds: 10 },
  ],
};

function findButton(root: HTMLElement, label: string): HTMLButtonElement {
  const buttons: HTMLButtonElement[] = Array.from(root.querySelectorAll('button'));
  const found: HTMLButtonElement | undefined = buttons.find((button: HTMLButtonElement): boolean => button.textContent === label);
  if (!found) {
    throw new Error(`No button labelled ${label}`);
  }
  return found;
}

describe('renderRideScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ ftp: 200, spotifyPlaylistId: 'playlist' }));
    Object.defineProperty(navigator, 'wakeLock', { value: undefined, configurable: true });
    window.history.replaceState(null, '', '/#/ride/test-ride');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps riding with no music, updates the clock and saves the summary at the end', async () => {
    // Arrange
    const root: HTMLElement = document.createElement('div');
    document.body.replaceChildren(root);
    renderRideScreen(root, testRide);
    await vi.advanceTimersByTimeAsync(0);
    const countdown: HTMLElement = root.querySelector('.ride-countdown') as HTMLElement;
    expect(countdown.textContent).toBe('0:10');

    // Act
    findButton(root, 'Connect bike').click();
    await vi.advanceTimersByTimeAsync(0);
    findButton(root, 'Start').click();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);

    // Assert
    expect((root.querySelector('.ride-top') as HTMLElement).textContent).toContain('No music');
    expect(countdown.textContent).toBe('0:09');
    expect((root.querySelector('.ride-stat-watts') as HTMLElement).textContent).toBe('150');

    // Act
    await vi.advanceTimersByTimeAsync(30000);

    // Assert
    expect(appendRideSummary).toHaveBeenCalledTimes(1);
    expect(location.hash.startsWith('#/summary/')).toBe(true);
  });
});
