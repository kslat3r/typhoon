import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import renderRideScreen from '@/components/RideScreen';
import appendRideSummary from '@/lib/client/helpers/append-ride-summary';
import connectSpotifyPlayer from '@/lib/client/helpers/connect-spotify-player';
import connectWattbike from '@/lib/client/helpers/connect-wattbike';
import getPlaylistTracks from '@/lib/client/helpers/get-playlist-tracks';
import playTrack from '@/lib/client/helpers/play-track';
import loadSettings from '@/lib/client/helpers/load-settings';
import { STORAGE_KEYS } from '@/lib/client/models/storage-keys';
import type { BikeListener, Ride, RideSummary, SpotifyPlayerState, Track } from '@/lib/client/models/types';

vi.mock('@/lib/client/helpers/play-track', () => ({ default: vi.fn(async () => Promise.reject(new Error('Play failed: 404'))) }));
const fakePlayer = vi.hoisted(() => ({
  connect: vi.fn(async (): Promise<boolean> => true),
  disconnect: vi.fn(),
  activateElement: vi.fn(async (): Promise<void> => undefined),
  pause: vi.fn(async (): Promise<void> => undefined),
  resume: vi.fn(async (): Promise<void> => undefined),
  getCurrentState: vi.fn(async (): Promise<SpotifyPlayerState | null> => null),
  addListener: vi.fn(),
}));
vi.mock('@/lib/client/helpers/connect-spotify-player', () => ({ default: vi.fn(async () => ({ player: fakePlayer, deviceId: 'tab' })) }));
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

function playerReports(id: string, position: number, duration: number, paused = false): void {
  fakePlayer.getCurrentState.mockResolvedValue({
    paused,
    position,
    duration,
    track_window: { current_track: { uri: `spotify:track:${id}`, name: `Track ${id.toUpperCase()}`, artists: [{ name: 'Artist' }], album: { images: [] } } },
  });
}

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
    // Finish any ride a previous test left running so it cannot save during this one
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    vi.clearAllMocks();
    fakePlayer.getCurrentState.mockResolvedValue(null);
    // Picks are random within the nearest few tracks; pin them to the nearest so the tests can name songs
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.useFakeTimers();
    localStorage.clear();
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ ftp: 200, spotifyPlaylistId: 'playlist' }));
    localStorage.setItem(STORAGE_KEYS.tempoCache, JSON.stringify({ a: 80, b: 176 }));
    Object.defineProperty(navigator, 'wakeLock', { value: undefined, configurable: true });
    window.history.replaceState(null, '', '/#/ride/test-ride');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('plays nothing when music is switched off', async () => {
    // Arrange
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({ ftp: 200, spotifyPlaylistId: 'playlist', musicEnabled: false }),
    );
    const root: HTMLElement = document.createElement('div');
    document.body.replaceChildren(root);

    // Act
    renderRideScreen(root, testRide);
    await vi.advanceTimersByTimeAsync(0);
    findButton(root, 'Connect bike').click();
    await vi.advanceTimersByTimeAsync(0);
    findButton(root, 'Start').click();
    await vi.advanceTimersByTimeAsync(1500);

    // Assert
    expect(getPlaylistTracks).not.toHaveBeenCalled();
    expect(connectSpotifyPlayer).not.toHaveBeenCalled();
    expect(playTrack).not.toHaveBeenCalled();
    expect(fakePlayer.pause).not.toHaveBeenCalled();
    expect(fakePlayer.resume).not.toHaveBeenCalled();
    expect((root.querySelector('.ride-track') as HTMLElement).hidden).toBe(true);
    expect((root.querySelector('.ride-track-nav') as HTMLElement).hidden).toBe(true);
    expect((root.querySelector('.ride-track-title') as HTMLElement).textContent).toBe('');
    expect((root.querySelector('.ride-track-artist') as HTMLElement).textContent).toBe('');
    expect(root.textContent).not.toMatch(/music off/i);
    expect((root.querySelector('.ride-stat-interval') as HTMLElement).textContent).toBe('0:08');
  });

  it('shows a target cadence and no bike stats when Bluetooth is off', async () => {
    // Arrange
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({ ftp: 200, musicEnabled: false, bluetoothEnabled: false }),
    );
    const root: HTMLElement = document.createElement('div');
    document.body.replaceChildren(root);
    renderRideScreen(root, testRide);
    await vi.advanceTimersByTimeAsync(0);
    const hidden = (className: string): boolean => (root.querySelector(className) as HTMLElement).parentElement?.hidden === true;

    // Assert
    expect(findButton(root, 'Connect bike').hidden).toBe(true);
    expect(findButton(root, 'Start').disabled).toBe(false);
    expect(connectWattbike).not.toHaveBeenCalled();
    expect(hidden('.ride-stat-percent')).toBe(true);
    expect(hidden('.ride-stat-watts')).toBe(true);
    expect(hidden('.ride-stat-rpm')).toBe(true);
    expect(hidden('.ride-stat-mph')).toBe(true);
    expect(hidden('.ride-stat-average-mph')).toBe(true);
    expect(hidden('.ride-stat-miles')).toBe(true);
    expect(hidden('.ride-stat-interval')).toBe(false);
    expect(hidden('.ride-stat-remaining')).toBe(false);
    expect((root.querySelector('.ride-stat-target') as HTMLElement).textContent).toBe('95');
    expect((root.querySelector('.ride-stat-interval') as HTMLElement).textContent).toBe('0:10');

    // Act
    findButton(root, 'Start').click();
    await vi.advanceTimersByTimeAsync(11000);

    // Assert
    expect((root.querySelector('.ride-stat-target') as HTMLElement).textContent).toBe('80');
    expect((root.querySelector('.ride-stat-interval') as HTMLElement).textContent).toBe('0:09');
    expect((root.querySelector('.ride-stat-remaining') as HTMLElement).textContent).toBe('0:19');
    expect(connectWattbike).not.toHaveBeenCalled();
  });

  it('says what is missing when no playlist has been chosen', async () => {
    // Arrange
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ ftp: 200 }));
    const root: HTMLElement = document.createElement('div');
    document.body.replaceChildren(root);

    // Act
    renderRideScreen(root, testRide);
    await vi.advanceTimersByTimeAsync(0);

    // Assert
    expect((root.querySelector('.ride-track-title') as HTMLElement).textContent).toBe('Music unavailable');
    expect((root.querySelector('.ride-track-artist') as HTMLElement).textContent).toBe('Choose a playlist in Settings');
    expect((root.querySelector('.ride-artwork-placeholder') as HTMLElement).hidden).toBe(false);
    expect((root.querySelector('.ride-status') as HTMLElement).textContent).toBe('');
    expect(getPlaylistTracks).not.toHaveBeenCalled();
  });

  it('spins while the playlist loads and then shows the first pick', async () => {
    // Arrange
    let finishLoad: () => void = (): void => {};
    vi.mocked(getPlaylistTracks).mockReturnValueOnce(
      new Promise((resolve): void => {
        finishLoad = (): void => resolve([{ id: 'a', uri: 'spotify:track:a', name: 'Track A', artist: 'Artist A', artworkUrl: null, durationMs: 180000 }]);
      }),
    );
    const root: HTMLElement = document.createElement('div');
    document.body.replaceChildren(root);

    // Act
    renderRideScreen(root, testRide);
    await vi.advanceTimersByTimeAsync(0);

    // Assert
    expect((root.querySelector('.ride-spinner') as HTMLElement).hidden).toBe(false);
    expect((root.querySelector('.ride-track-title') as HTMLElement).textContent).toBe('');

    // Act
    finishLoad();
    await vi.advanceTimersByTimeAsync(0);

    // Assert
    expect((root.querySelector('.ride-spinner') as HTMLElement).hidden).toBe(true);
    expect((root.querySelector('.ride-track-title') as HTMLElement).textContent).toBe('Track A');
  });

  it('starts with a track fitting the first block and holds it across a zone jump', async () => {
    // Arrange
    vi.mocked(playTrack).mockResolvedValue(undefined);
    const jumpRide: Ride = { ...testRide, lengthSeconds: 180, intervals: [{ zone: 2, seconds: 100 }, { zone: 6, seconds: 70 }, { zone: 2, seconds: 10 }] };
    const root: HTMLElement = document.createElement('div');
    document.body.replaceChildren(root);
    renderRideScreen(root, jumpRide);
    await vi.advanceTimersByTimeAsync(0);

    // Act: 100 ride seconds pass in 25 wall seconds at 4x
    findButton(root, 'Test').click();
    await vi.advanceTimersByTimeAsync(26000);

    // Assert: 80 bpm fits the green block, and the jump to zone 6 changes nothing
    expect(playTrack).toHaveBeenCalledTimes(1);
    expect(vi.mocked(playTrack).mock.calls[0][0]).toBe('spotify:track:a');
  });

  it('starts a track for the current block as a song ends and shows whatever the player reports', async () => {
    // Arrange
    vi.mocked(playTrack).mockResolvedValue(undefined);
    const root: HTMLElement = await renderAndStart({ ...testRide, lengthSeconds: 600, intervals: [{ zone: 2, seconds: 10 }, { zone: 5, seconds: 590 }] });
    const title = (): string => (root.querySelector('.ride-track-title') as HTMLElement).textContent ?? '';
    expect(playTrack).toHaveBeenCalledTimes(1);
    expect(vi.mocked(playTrack).mock.calls[0][1]).toBe('tab');
    expect(fakePlayer.activateElement).toHaveBeenCalled();
    expect(title()).toBe('Track A');

    // Act: in the zone 5 block the player reports track a with 9 s left
    playerReports('a', 171000, 180000);
    await vi.advanceTimersByTimeAsync(12500);

    // Assert: nothing happens yet
    expect(playTrack).toHaveBeenCalledTimes(1);
    expect(title()).toBe('Track A');

    // Act: a is in its last second
    playerReports('a', 179000, 180000);
    await vi.advanceTimersByTimeAsync(1000);

    // Assert: 176 bpm fits the hard block, and the app starts it itself
    expect(playTrack).toHaveBeenCalledTimes(2);
    expect(vi.mocked(playTrack).mock.calls[1]).toEqual(['spotify:track:b', 'tab']);
    expect(title()).toBe('Track B');
    playerReports('b', 2000, 180000);
    await vi.advanceTimersByTimeAsync(4500);

    // Act: Spotify drifts to something outside the playlist
    playerReports('stray', 5000, 200000);
    await vi.advanceTimersByTimeAsync(2500);

    // Assert: shown as reported, never replaced
    expect(title()).toBe('Track STRAY');
    expect(playTrack).toHaveBeenCalledTimes(2);
  });

  it('next plays a track fitting the current block and prev goes back to the one before', async () => {
    // Arrange
    vi.mocked(playTrack).mockResolvedValue(undefined);
    const root: HTMLElement = await renderAndStart({ ...testRide, lengthSeconds: 600, intervals: [{ zone: 2, seconds: 10 }, { zone: 5, seconds: 590 }] });
    const title = (): string => (root.querySelector('.ride-track-title') as HTMLElement).textContent ?? '';
    await vi.advanceTimersByTimeAsync(12000);

    // Act
    findButton(root, 'Next').click();
    await vi.advanceTimersByTimeAsync(0);

    // Assert
    expect(vi.mocked(playTrack).mock.calls[1][0]).toBe('spotify:track:b');
    expect(title()).toBe('Track B');

    // Act
    findButton(root, 'Prev').click();
    await vi.advanceTimersByTimeAsync(0);

    // Assert
    expect(vi.mocked(playTrack).mock.calls[2][0]).toBe('spotify:track:a');
    expect(title()).toBe('Track A');
  });

  it('skips to another fitting track when a play fails, and stops after repeated failures', async () => {
    // Arrange
    vi.mocked(playTrack).mockRejectedValueOnce(new Error('Play failed: 403')).mockResolvedValue(undefined);
    const root: HTMLElement = await renderAndStart({ ...testRide, lengthSeconds: 600, intervals: [{ zone: 2, seconds: 600 }] });
    const status = (): string => (root.querySelector('.ride-status') as HTMLElement).textContent ?? '';
    const artist = (): string => (root.querySelector('.ride-track-artist') as HTMLElement).textContent ?? '';

    // Act
    await vi.advanceTimersByTimeAsync(300);

    // Assert: the failed pick is replaced and the message cleared
    expect(playTrack).toHaveBeenCalledTimes(2);
    expect(vi.mocked(playTrack).mock.calls[1][0]).toBe('spotify:track:b');
    expect((root.querySelector('.ride-track-title') as HTMLElement).textContent).toBe('Track B');
    expect(status()).toBe('');

    // Act: every play now fails
    vi.mocked(playTrack).mockRejectedValue(new Error('Play failed: 502'));
    findButton(root, 'Next').click();
    await vi.advanceTimersByTimeAsync(2000);

    // Assert: Next restarts the skip budget, it runs out, then the placeholder shows the reason, Prev off, Next on
    expect(playTrack).toHaveBeenCalledTimes(6);
    expect(status()).toBe('');
    expect((root.querySelector('.ride-track-title') as HTMLElement).textContent).toBe('Music unavailable');
    expect(artist()).toBe('Play failed: 502');
    expect((root.querySelector('.ride-artwork-placeholder') as HTMLElement).hidden).toBe(false);
    expect(findButton(root, 'Prev').hidden).toBe(false);
    expect(findButton(root, 'Prev').disabled).toBe(true);
    expect(findButton(root, 'Next').disabled).toBe(false);

    // Act: Next tries again and this time it plays
    vi.mocked(playTrack).mockResolvedValue(undefined);
    findButton(root, 'Next').click();
    await vi.advanceTimersByTimeAsync(0);

    // Assert
    expect(playTrack).toHaveBeenCalledTimes(7);
    expect((root.querySelector('.ride-track-title') as HTMLElement).textContent).toMatch(/^Track [AB]$/);
    expect((root.querySelector('.ride-artwork-placeholder') as HTMLElement).hidden).toBe(true);
  });

  it('plays the next pick itself when a song ends without the queue starting, never repeating', async () => {
    // Arrange
    vi.mocked(playTrack).mockResolvedValue(undefined);
    vi.mocked(getPlaylistTracks).mockResolvedValueOnce([
      { id: 'a', uri: 'spotify:track:a', name: 'Track A', artist: 'Artist A', artworkUrl: null, durationMs: 180000 },
      { id: 'b', uri: 'spotify:track:b', name: 'Track B', artist: 'Artist B', artworkUrl: null, durationMs: 180000 },
      { id: 'c', uri: 'spotify:track:c', name: 'Track C', artist: 'Artist C', artworkUrl: null, durationMs: 180000 },
    ]);
    localStorage.setItem(STORAGE_KEYS.tempoCache, JSON.stringify({ a: 80, b: 176, c: 176 }));
    const root: HTMLElement = await renderAndStart({ ...testRide, lengthSeconds: 600, intervals: [{ zone: 5, seconds: 600 }] });
    expect(vi.mocked(playTrack).mock.calls[0][0]).toBe('spotify:track:b');

    // Act: b has ended and sits paused at its start
    await vi.advanceTimersByTimeAsync(4000);
    playerReports('b', 0, 180000, true);
    await vi.advanceTimersByTimeAsync(2500);

    // Assert: the only unplayed hard track plays next
    expect(playTrack).toHaveBeenCalledTimes(2);
    expect(vi.mocked(playTrack).mock.calls[1][0]).toBe('spotify:track:c');

    // Act: c plays, then ends too
    playerReports('c', 5000, 180000);
    await vi.advanceTimersByTimeAsync(4500);
    playerReports('c', 0, 180000, true);
    await vi.advanceTimersByTimeAsync(2500);

    // Assert: the unplayed easy track beats a repeat of a fitting one
    expect(playTrack).toHaveBeenCalledTimes(3);
    expect(vi.mocked(playTrack).mock.calls[2][0]).toBe('spotify:track:a');

    // Act: a plays and ends, so every track has now played
    playerReports('a', 5000, 180000);
    await vi.advanceTimersByTimeAsync(4500);
    playerReports('a', 0, 180000, true);
    await vi.advanceTimersByTimeAsync(2500);

    // Assert: repeats are allowed again, nearest tempo first, never the song that just ended
    expect(playTrack).toHaveBeenCalledTimes(4);
    expect(vi.mocked(playTrack).mock.calls[3][0]).toBe('spotify:track:b');
  });

  it('retries the same track when Spotify answers 404 instead of skipping', async () => {
    // Arrange
    vi.mocked(playTrack).mockRejectedValueOnce(new Error('Play failed: 404')).mockRejectedValueOnce(new Error('Play failed: 404')).mockResolvedValue(undefined);
    const root: HTMLElement = await renderAndStart({ ...testRide, lengthSeconds: 600, intervals: [{ zone: 2, seconds: 600 }] });

    // Act
    await vi.advanceTimersByTimeAsync(2500);

    // Assert
    expect(playTrack).toHaveBeenCalledTimes(3);
    expect(vi.mocked(playTrack).mock.calls.map((call) => call[0])).toEqual(['spotify:track:a', 'spotify:track:a', 'spotify:track:a']);
    expect((root.querySelector('.ride-track-title') as HTMLElement).textContent).toBe('Track A');
    expect((root.querySelector('.ride-status') as HTMLElement).textContent).toBe('');
  });

  it('freezes the clock and the music on Pause and carries on from the same point on Resume', async () => {
    // Arrange
    const root: HTMLElement = await renderAndStart({ ...testRide, lengthSeconds: 600, intervals: [{ zone: 2, seconds: 600 }] });
    const remaining = root.querySelector('.ride-stat-remaining') as HTMLElement;
    expect(findButton(root, 'Pause').hidden).toBe(false);
    await vi.advanceTimersByTimeAsync(3000);
    const beforePause: string = remaining.textContent ?? '';

    // Act
    findButton(root, 'Pause').click();
    await vi.advanceTimersByTimeAsync(10000);

    // Assert
    expect(fakePlayer.pause).toHaveBeenCalledTimes(1);
    expect(remaining.textContent).toBe(beforePause);
    expect(findButton(root, 'Resume').hidden).toBe(false);

    // Act
    findButton(root, 'Resume').click();
    await vi.advanceTimersByTimeAsync(1000);

    // Assert
    expect(fakePlayer.resume).toHaveBeenCalledTimes(1);
    expect(remaining.textContent).toBe('9:56');
    expect(findButton(root, 'Pause').hidden).toBe(false);
  });

  it('stays on the ride screen after End ride, with Done leading to the summary', async () => {
    // Arrange
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const root: HTMLElement = await renderAndStart({ ...testRide, lengthSeconds: 600, intervals: [{ zone: 2, seconds: 600 }] });
    await vi.advanceTimersByTimeAsync(3000);

    // Act
    findButton(root, 'End ride').click();
    await vi.advanceTimersByTimeAsync(0);

    // Assert
    expect(appendRideSummary).toHaveBeenCalledTimes(1);
    expect(location.hash).toBe('#/ride/test-ride');
    expect(findButton(root, 'End ride').hidden).toBe(true);
    expect(findButton(root, 'Done').hidden).toBe(false);
    expect(root.querySelector('.ride-profile-line')).not.toBeNull();

    // Act
    findButton(root, 'Done').click();

    // Assert
    expect(location.hash.startsWith('#/summary/')).toBe(true);
  });

  it('ignores a lagging player report right after a play call', async () => {
    // Arrange
    vi.mocked(playTrack).mockResolvedValue(undefined);
    const root: HTMLElement = await renderAndStart({ ...testRide, lengthSeconds: 600, intervals: [{ zone: 2, seconds: 300 }, { zone: 4, seconds: 300 }] });
    const first: string = (root.querySelector('.ride-track-title') as HTMLElement).textContent ?? '';

    // Act: within 4 s of the play, the player still reports an old track near its end
    playerReports('old', 175000, 180000);
    await vi.advanceTimersByTimeAsync(2500);

    // Assert
    expect(playTrack).toHaveBeenCalledTimes(1);
    expect((root.querySelector('.ride-track-title') as HTMLElement).textContent).toBe(first);
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
    expect(watts).toBeGreaterThanOrEqual(110);
    expect(watts).toBeLessThanOrEqual(152);
    expect((root.querySelector('.ride-stat-interval') as HTMLElement).textContent).toBe('0:06');
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
    const countdown: HTMLElement = root.querySelector('.ride-stat-interval') as HTMLElement;
    expect(countdown.textContent).toBe('0:10');

    // Act
    findButton(root, 'Connect bike').click();
    await vi.advanceTimersByTimeAsync(0);
    findButton(root, 'Start').click();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1500);

    // Assert
    expect((root.querySelector('.ride-top') as HTMLElement).textContent).not.toContain('No music');
    expect(countdown.textContent).toBe('0:08');
    expect((root.querySelector('.ride-stat-watts') as HTMLElement).textContent).toBe('150');
    expect((root.querySelector('.ride-stat-percent') as HTMLElement).textContent).toBe('75%');

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
    const ride: Ride = {
      ...testRide,
      lengthSeconds: 80,
      intervals: [{ zone: 2, seconds: 10 }, { zone: 6, seconds: 60 }, { zone: 2, seconds: 10 }],
      ftpTest: { intervalIndex: 1, seconds: 60 },
    };
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
    const countdown: HTMLElement = root.querySelector('.ride-stat-interval') as HTMLElement;

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
