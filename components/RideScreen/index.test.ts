import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import renderRideScreen from '@/components/RideScreen';
import appendRideSummary from '@/lib/client/helpers/append-ride-summary';
import buildFtpTestRide from '@/lib/client/helpers/build-ftp-test-ride';
import connectWattbike from '@/lib/client/helpers/connect-wattbike';
import loadSettings from '@/lib/client/helpers/load-settings';
import { STORAGE_KEYS } from '@/lib/client/models/storage-keys';
import type { BikeListener, Ride, RideSummary, Track } from '@/lib/client/models/types';

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
vi.mock('@/lib/client/helpers/reconnect-wattbike', () => ({ default: vi.fn(async () => undefined) }));
vi.mock('@/lib/client/helpers/get-spotify-devices', () => ({ default: vi.fn(async () => []) }));
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
    { zone: 2, seconds: 10 },
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

function capturedBikeCallbacks(): { onSample: BikeListener; onDisconnect: () => void } {
  const [onSample, onDisconnect] = vi.mocked(connectWattbike).mock.calls[0];
  return { onSample, onDisconnect };
}

async function renderAndStart(ride: Ride): Promise<HTMLElement> {
  const root: HTMLElement = document.createElement('div');
  document.body.replaceChildren(root);
  renderRideScreen(root, ride);
  await vi.advanceTimersByTimeAsync(0);
  findButton(root, 'Connect bike').click();
  await vi.advanceTimersByTimeAsync(0);
  findButton(root, 'Start').click();
  await vi.advanceTimersByTimeAsync(0);
  return root;
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

  it('runs a test ride at 4x with simulated samples and saves nothing', async () => {
    // Arrange
    const root: HTMLElement = document.createElement('div');
    document.body.replaceChildren(root);
    renderRideScreen(root, testRide);
    await vi.advanceTimersByTimeAsync(0);

    // Act
    findButton(root, 'Test').click();
    await vi.advanceTimersByTimeAsync(1000);

    // Assert
    const watts: number = Number((root.querySelector('.ride-stat-watts') as HTMLElement).textContent);
    expect(watts).toBeGreaterThanOrEqual(112);
    expect(watts).toBeLessThanOrEqual(152);
    expect((root.querySelector('.ride-countdown') as HTMLElement).textContent).toBe('0:06');
    expect(findButton(root, 'Test').hidden).toBe(true);

    // Act
    await vi.advanceTimersByTimeAsync(8000);

    // Assert
    expect(appendRideSummary).not.toHaveBeenCalled();
    expect(location.hash).toBe('#/');
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
    await vi.advanceTimersByTimeAsync(1500);

    // Assert
    expect((root.querySelector('.ride-top') as HTMLElement).textContent).toContain('No music');
    expect(countdown.textContent).toBe('0:08');
    expect((root.querySelector('.ride-stat-watts') as HTMLElement).textContent).toBe('150');

    // Act
    await vi.advanceTimersByTimeAsync(30000);

    // Assert
    expect(appendRideSummary).toHaveBeenCalledTimes(1);
    expect(location.hash.startsWith('#/summary/')).toBe(true);
  });

  it('shows Reconnecting after a disconnect and records missing seconds', async () => {
    // Arrange
    const root: HTMLElement = await renderAndStart(testRide);
    await vi.advanceTimersByTimeAsync(1000);

    // Act
    capturedBikeCallbacks().onDisconnect();
    await vi.advanceTimersByTimeAsync(1000);

    // Assert
    expect((root.querySelector('.ride-stat-watts') as HTMLElement).textContent).toBe('Reconnecting');

    // Act
    await vi.advanceTimersByTimeAsync(30000);

    // Assert
    expect(appendRideSummary).toHaveBeenCalledTimes(1);
    const summary: RideSummary = vi.mocked(appendRideSummary).mock.calls[0][0];
    expect(summary.missingSeconds).toBeGreaterThan(0);
  });

  it('saves the FTP test summary before proposing an FTP and saves the proposed FTP', async () => {
    // Arrange
    const ride: Ride = buildFtpTestRide(60);
    const root: HTMLElement = await renderAndStart(ride);
    const { onSample } = capturedBikeCallbacks();

    // Act
    for (let second = 0; second <= ride.lengthSeconds; second += 1) {
      onSample({ watts: 200, rpm: 90, receivedAt: performance.now() });
      await vi.advanceTimersByTimeAsync(1000);
    }

    // Assert
    expect((root.querySelector('.ride-ftp-proposed') as HTMLElement).textContent).toBe('Proposed FTP: 140 W');
    expect(appendRideSummary).toHaveBeenCalledTimes(1);

    // Act
    findButton(root, 'Save').click();

    // Assert
    expect(loadSettings().ftp).toBe(140);
    expect(appendRideSummary).toHaveBeenCalledTimes(1);
  });

  it('saves the summary and stops ticking when navigated away', async () => {
    // Arrange
    const root: HTMLElement = await renderAndStart(testRide);
    await vi.advanceTimersByTimeAsync(1000);
    const countdown: HTMLElement = root.querySelector('.ride-countdown') as HTMLElement;

    // Act
    location.hash = '#/';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await vi.advanceTimersByTimeAsync(0);
    const countdownAtExit: string | null = countdown.textContent;
    await vi.advanceTimersByTimeAsync(1000);

    // Assert
    expect(appendRideSummary).toHaveBeenCalledTimes(1);
    expect(countdown.textContent).toBe(countdownAtExit);
  });
});
