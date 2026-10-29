import renderRideProfile from '@/components/RideProfile';
import type { FinishReason, RideScreenElements, RideScreenState } from '@/components/RideScreen/types';
import accumulateRideStats from '@/lib/client/helpers/accumulate-ride-stats';
import appendRideSummary from '@/lib/client/helpers/append-ride-summary';
import calculateFtp from '@/lib/client/helpers/calculate-ftp';
import connectSpotifyPlayer from '@/lib/client/helpers/connect-spotify-player';
import connectWattbike from '@/lib/client/helpers/connect-wattbike';
import emptyRideStats from '@/lib/client/helpers/empty-ride-stats';
import formatClock from '@/lib/client/helpers/format-clock';
import getPlaylistTracks from '@/lib/client/helpers/get-playlist-tracks';
import intervalAtElapsed from '@/lib/client/helpers/interval-at-elapsed';
import loadSettings from '@/lib/client/helpers/load-settings';
import loadSpotifyAuth from '@/lib/client/helpers/load-spotify-auth';
import loadTempoCache from '@/lib/client/helpers/load-tempo-cache';
import navigate from '@/lib/client/helpers/navigate';
import pickTrack from '@/lib/client/helpers/pick-track';
import playTrack from '@/lib/client/helpers/play-track';
import reconnectWattbike from '@/lib/client/helpers/reconnect-wattbike';
import requestWakeLock from '@/lib/client/helpers/request-wake-lock';
import saveSettings from '@/lib/client/helpers/save-settings';
import simulateBikeSample from '@/lib/client/helpers/simulate-bike-sample';
import speedFromWatts from '@/lib/client/helpers/speed-from-watts';
import summariseRide from '@/lib/client/helpers/summarise-ride';
import zoneForWatts from '@/lib/client/helpers/zone-for-watts';
import { ZONES } from '@/lib/client/models/zones';
import type { BikeSample, IntervalPosition, Ride, RideInterval, RideSummary, SpotifyPlayer, SpotifyPlayerState, Track, ZoneNumber } from '@/lib/client/models/types';

const TICK_MS = 250;
const POLL_MS = 500;
const RECONNECT_MS = 3000;
const SAMPLE_MAX_AGE_MS = 3000;
const NEXT_BEFORE_END_MS = 1500;
// The player endpoint lags a play call by a second or two; polls inside this window are ignored
const PLAY_GRACE_MS = 4000;
const MAX_MUSIC_SKIPS = 3;
const PLAY_ATTEMPTS = 4;
const PLAY_RETRY_MS = 1000;
// ponytail: test rides run at 4x so a 30 minute ride takes 7.5 minutes at the desk
const TEST_SPEED = 4;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function buildElement(tag: string, className: string, text: string): HTMLElement {
  const element: HTMLElement = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function buildButton(label: string, onClick: () => void): HTMLButtonElement {
  const button: HTMLButtonElement = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function buildStatCell(label: string, className: string): { cell: HTMLElement; value: HTMLElement } {
  const cell: HTMLElement = buildElement('div', 'ride-stat', '');
  const value: HTMLElement = buildElement('span', `ride-stat-value ${className}`, '--');
  cell.append(buildElement('span', 'ride-stat-label', label), value);
  return { cell, value };
}

function clock(state: RideScreenState): number {
  const real: number = performance.now();
  return state.testMode ? state.startedAt + (real - state.startedAt) * TEST_SPEED : real;
}

function totalSeconds(ride: Ride): number {
  return ride.intervals.reduce((sum: number, interval: RideInterval): number => sum + interval.seconds, 0);
}

function currentZone(state: RideScreenState, ride: Ride): ZoneNumber {
  return state.position === null ? ride.intervals[0].zone : state.position.interval.zone;
}

function freshSample(state: RideScreenState, now: number): BikeSample | null {
  if (state.bikeState !== 'connected' || state.latestSample === null || now - state.latestSample.receivedAt >= SAMPLE_MAX_AGE_MS) {
    return null;
  }
  return state.latestSample;
}

function buildTopBand(onSkip: (direction: 'prev' | 'next') => void): { band: HTMLElement; elements: Pick<RideScreenElements, 'artwork' | 'placeholder' | 'spinner' | 'trackTitle' | 'trackArtist' | 'prevButton' | 'nextButton'>; actions: HTMLElement } {
  const band: HTMLElement = buildElement('section', 'ride-top', '');

  const artwork: HTMLImageElement = document.createElement('img');
  artwork.className = 'ride-artwork';
  artwork.alt = '';
  artwork.hidden = true;
  const placeholder: HTMLElement = buildElement('div', 'ride-artwork-placeholder', '');
  placeholder.hidden = true;
  const spinner: HTMLElement = buildElement('div', 'ride-spinner', '');
  spinner.hidden = true;
  const trackTitle: HTMLElement = buildElement('div', 'ride-track-title', '');
  const trackArtist: HTMLElement = buildElement('div', 'ride-track-artist', '');
  const trackText: HTMLElement = buildElement('div', 'ride-track-text', '');
  trackText.append(trackTitle, trackArtist);
  const prevButton: HTMLButtonElement = buildButton('Prev', (): void => onSkip('prev'));
  const nextButton: HTMLButtonElement = buildButton('Next', (): void => onSkip('next'));
  const nav: HTMLElement = buildElement('div', 'ride-track-nav', '');
  nav.append(prevButton, nextButton);
  const track: HTMLElement = buildElement('div', 'ride-track', '');
  track.append(spinner, artwork, placeholder, trackText);

  const actions: HTMLElement = buildElement('div', 'ride-actions', '');
  band.append(track, nav, actions);

  return { band, elements: { artwork, placeholder, spinner, trackTitle, trackArtist, prevButton, nextButton }, actions };
}

function buildStatsStrip(): { strip: HTMLElement; elements: Pick<RideScreenElements, 'percent' | 'watts' | 'rpm' | 'mph' | 'averageMph' | 'miles' | 'interval' | 'remaining'> } {
  const strip: HTMLElement = buildElement('section', 'ride-stats', '');
  const percent = buildStatCell('% FTP', 'ride-stat-percent');
  const watts = buildStatCell('Watts', 'ride-stat-watts');
  const rpm = buildStatCell('RPM', 'ride-stat-rpm');
  const mph = buildStatCell('MPH', 'ride-stat-mph');
  const averageMph = buildStatCell('Avg MPH', 'ride-stat-average-mph');
  const miles = buildStatCell('Miles', 'ride-stat-miles');
  const interval = buildStatCell('Interval', 'ride-stat-interval');
  const remaining = buildStatCell('Remaining', 'ride-stat-remaining');
  strip.append(percent.cell, watts.cell, rpm.cell, mph.cell, averageMph.cell, miles.cell, interval.cell, remaining.cell);

  return {
    strip,
    elements: {
      percent: percent.value,
      watts: watts.value,
      rpm: rpm.value,
      mph: mph.value,
      averageMph: averageMph.value,
      miles: miles.value,
      interval: interval.value,
      remaining: remaining.value,
    },
  };
}

function updateTrack(state: RideScreenState): void {
  const { artwork, placeholder, spinner, trackTitle, trackArtist, prevButton, nextButton } = state.elements;
  const failed: boolean = state.musicMessage !== null;
  const shown: Track | null = failed ? null : (state.pendingPlay ?? state.track);
  spinner.hidden = failed || shown !== null || !state.musicLoading;
  placeholder.hidden = !failed;
  prevButton.hidden = state.phase !== 'riding' || (shown === null && !failed);
  nextButton.hidden = prevButton.hidden;
  prevButton.disabled = failed || state.history.length === 0;
  nextButton.disabled = state.tracks.length === 0;

  if (shown === null) {
    trackTitle.textContent = failed ? 'Music unavailable' : '';
    trackArtist.textContent = state.musicMessage ?? '';
    artwork.hidden = true;
    artwork.removeAttribute('src');
    return;
  }

  trackTitle.textContent = shown.name;
  trackArtist.textContent = shown.artist;
  if (shown.artworkUrl) {
    artwork.src = shown.artworkUrl;
    artwork.hidden = false;
  } else {
    artwork.hidden = true;
    artwork.removeAttribute('src');
  }
}

function updateInterval(state: RideScreenState, position: IntervalPosition): void {
  state.elements.interval.textContent = formatClock(position.secondsLeftInInterval);
}

function updateStats(state: RideScreenState, sample: BikeSample | null, secondsLeftInRide: number): void {
  const { percent, watts, rpm, mph, averageMph, miles, remaining } = state.elements;
  const ftp: number = state.settings.ftp;

  if (state.bikeState === 'reconnecting') {
    watts.textContent = 'Reconnecting';
    percent.textContent = '--';
    percent.style.color = '';
  } else if (sample === null) {
    watts.textContent = '--';
    percent.textContent = '--';
    percent.style.color = '';
  } else {
    watts.textContent = String(Math.round(sample.watts));
    percent.textContent = `${Math.round((sample.watts / ftp) * 100)}%`;
    percent.style.color = ZONES[zoneForWatts(sample.watts, ftp) - 1].colour;
  }

  rpm.textContent = sample === null || sample.rpm === null ? '--' : String(Math.round(sample.rpm));
  mph.textContent = sample === null ? '--' : speedFromWatts(sample.watts).toFixed(1);
  averageMph.textContent =
    state.stats.sampledSeconds > 0 ? (state.stats.miles / (state.stats.sampledSeconds / 3600)).toFixed(1) : '0.0';
  miles.textContent = state.stats.miles.toFixed(2);
  remaining.textContent = formatClock(secondsLeftInRide);
}

function updateScreen(state: RideScreenState, ride: Ride, position: IntervalPosition, sample: BikeSample | null): void {
  updateTrack(state);
  updateInterval(state, position);
  updateStats(state, sample, position.secondsLeftInRide);
  renderRideProfile(state.elements.profileRoot, {
    ride,
    position: state.phase === 'riding' ? position : null,
  });
}

function updateReadyScreen(state: RideScreenState, ride: Ride): void {
  const position: IntervalPosition = intervalAtElapsed(ride, 0) as IntervalPosition;
  updateScreen(state, ride, position, freshSample(state, clock(state)));
}

async function runSpotifyCall(state: RideScreenState, call: () => Promise<void>): Promise<void> {
  if (state.spotifyCallInFlight) {
    return;
  }

  state.spotifyCallInFlight = true;
  try {
    await call();
  } catch (spotifyError) {
    markMusicFailed(state, errorMessage(spotifyError));
  } finally {
    state.spotifyCallInFlight = false;
  }
}

// A failed play or a player error skips to another track fitting the current block; after a
// few failures in a row the song display becomes a placeholder with the reason, and Next retries.
function markMusicFailed(state: RideScreenState, message: string): void {
  if (state.phase === 'riding' && state.position !== null && state.tracks.length > 0 && state.musicSkips < MAX_MUSIC_SKIPS) {
    state.musicSkips += 1;
    state.pendingPlay = pickTrack(state.tracks, state.tempos, state.position.interval.zone, state.played, state.track?.id ?? null, Math.random);
    return;
  }
  state.musicMessage = message;
  updateTrack(state);
}

// Spotify answers 404 while the tab's player is still registering or has just come back; wait and try again
async function playWithRetry(uri: string, deviceId: string): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await playTrack(uri, deviceId);
      return;
    } catch (playError) {
      if (attempt === PLAY_ATTEMPTS || errorMessage(playError) !== 'Play failed: 404') {
        throw new Error(errorMessage(playError), { cause: playError });
      }
    }
    await new Promise((resolve): void => {
      setTimeout(resolve, PLAY_RETRY_MS);
    });
  }
}

async function playPending(state: RideScreenState): Promise<void> {
  const track: Track | null = state.pendingPlay;
  const deviceId: string | null = state.playerDeviceId;
  if (track === null || deviceId === null || state.spotifyCallInFlight || state.phase !== 'riding') {
    return;
  }

  state.pendingPlay = null;
  state.track = track;
  state.played.add(track.id);
  await runSpotifyCall(state, async (): Promise<void> => {
    await playWithRetry(track.uri, deviceId);
    state.lastPlayAt = performance.now();
    state.musicMessage = null;
    updateTrack(state);
  });
}

// Builds a display entry for whatever the tab is playing, playlist track or not
function trackFromPlayer(state: RideScreenState, current: SpotifyPlayerState): Track {
  const playing = current.track_window.current_track;
  const id: string = playing.uri.replace('spotify:track:', '');
  const known: Track | undefined = state.tracks.find((track: Track): boolean => track.id === id);
  return known ?? { id, uri: playing.uri, name: playing.name, artist: playing.artists[0]?.name ?? '', artworkUrl: playing.album.images[0]?.url ?? null, durationMs: current.duration };
}

// The app never cuts a song: it shows what is playing and, as a song ends, lines up
// the next one to match the cadence of the block the ride is in right now.
async function pollPlayer(state: RideScreenState, ride: Ride): Promise<void> {
  if (state.musicMessage !== null || state.player === null || state.playerDeviceId === null) {
    return;
  }

  const current: SpotifyPlayerState | null = await state.player.getCurrentState();
  if (current === null || state.phase !== 'riding' || performance.now() - state.lastPlayAt < PLAY_GRACE_MS) {
    return;
  }

  if (!current.paused) {
    state.musicSkips = 0;
  }
  const playing: Track = trackFromPlayer(state, current);
  if (state.track === null || playing.id !== state.track.id) {
    state.track = playing;
    state.played.add(playing.id);
    updateTrack(state);
  }

  // The app starts the next song itself in the last moment of the current one (or once it has
  // ended and sits paused at its start). Spotify's own queue is never used: it persists across
  // rides, so leftovers would replay the same songs in the same order.
  const ending: boolean = current.duration - current.position <= NEXT_BEFORE_END_MS || (current.paused && current.position === 0);
  if (ending) {
    state.pendingPlay = pickTrack(state.tracks, state.tempos, currentZone(state, ride), state.played, playing.id, Math.random);
    void playPending(state);
  }
}

function skipTrack(state: RideScreenState, ride: Ride, direction: 'prev' | 'next'): void {
  const current: Track | null = state.track;
  if (state.phase !== 'riding' || state.tracks.length === 0) {
    return;
  }

  if (direction === 'next') {
    if (current !== null && state.musicMessage === null) {
      state.history.push(current);
    }
    state.pendingPlay = pickTrack(state.tracks, state.tempos, currentZone(state, ride), state.played, current?.id ?? null, Math.random);
  } else {
    state.pendingPlay = state.history.pop() ?? current;
  }
  state.musicSkips = 0;
  state.musicMessage = null;
  void playPending(state);
}

async function releaseWakeLock(state: RideScreenState): Promise<void> {
  const sentinel: WakeLockSentinel | null = state.wakeLock;
  state.wakeLock = null;
  if (sentinel === null) {
    return;
  }

  try {
    await sentinel.release();
  } catch {
    // Wake lock release failures do not matter: the ride is over either way.
  }
}

async function acquireWakeLock(state: RideScreenState): Promise<void> {
  const sentinel: WakeLockSentinel | null = await requestWakeLock();
  await releaseWakeLock(state);
  state.wakeLock = sentinel;
  if (state.phase !== 'riding') {
    await releaseWakeLock(state);
  }
}

function showFtpResult(state: RideScreenState, summary: RideSummary, proposedFtp: number): void {
  const panel: HTMLElement = buildElement('section', 'ride-ftp-result', '');
  const save: HTMLButtonElement = buildButton('Save', (): void => {
    saveSettings({ ...loadSettings(), ftp: proposedFtp });
    navigate('#/summary/' + summary.id);
  });
  save.disabled = proposedFtp <= 0;
  const keep: HTMLButtonElement = buildButton('Keep current', (): void => {
    navigate('#/summary/' + summary.id);
  });
  panel.append(buildElement('p', 'ride-ftp-proposed', `Proposed FTP: ${proposedFtp} W`), save, keep);
  state.elements.statsStrip.replaceWith(panel);
}

function finishRide(state: RideScreenState, ride: Ride, reason: FinishReason): void {
  if (state.phase === 'finished') {
    return;
  }

  const wasRiding: boolean = state.phase === 'riding';
  state.phase = 'finished';
  state.listeners.abort();
  if (state.tickHandle !== null) {
    clearInterval(state.tickHandle);
    state.tickHandle = null;
  }
  if (state.reconnectHandle !== null) {
    clearInterval(state.reconnectHandle);
    state.reconnectHandle = null;
  }
  void releaseWakeLock(state);
  state.device?.gatt?.disconnect();
  state.player?.disconnect();

  if (!wasRiding) {
    return;
  }

  state.elements.endButton.hidden = true;
  state.elements.doneButton.hidden = reason !== 'ended';
  if (state.testMode || state.stats.sampledSeconds === 0) {
    if (reason === 'completed') {
      navigate('#/');
    }
    return;
  }

  const ftpTestAverageWatts: number | undefined =
    ride.ftpTest === undefined ? undefined : state.ftpTestSeconds > 0 ? state.ftpTestWattSeconds / state.ftpTestSeconds : 0;
  const summary: RideSummary = summariseRide(ride, state.stats, state.settings.ftp, state.startedAtDate, ftpTestAverageWatts);

  appendRideSummary(summary);
  state.summaryId = summary.id;

  if (reason !== 'completed') {
    return;
  }

  if (ride.ftpTest === undefined || ftpTestAverageWatts === undefined) {
    navigate('#/summary/' + summary.id);
    return;
  }

  showFtpResult(state, summary, calculateFtp(ftpTestAverageWatts, ride.ftpTest.seconds));
}

function tick(state: RideScreenState, ride: Ride, testIntervalIndex: number): void {
  const now: number = clock(state);
  const rideEnd: number = state.startedAt + totalSeconds(ride) * 1000;
  if (state.testMode) {
    state.latestSample = simulateBikeSample(currentZone(state, ride), state.settings.ftp, now);
  }
  const deltaSeconds: number = Math.max(0, Math.min(now, rideEnd) - state.lastTickAt) / 1000;
  const elapsed: number = (now - state.startedAt) / 1000;
  const sample: BikeSample | null = freshSample(state, now);
  state.stats = accumulateRideStats(state.stats, sample, deltaSeconds, state.settings.ftp);
  state.lastTickAt = now;

  const position: IntervalPosition | null = intervalAtElapsed(ride, elapsed);
  if (position === null) {
    finishRide(state, ride, 'completed');
    return;
  }

  if (position.index === testIntervalIndex && sample !== null) {
    state.ftpTestWattSeconds += sample.watts * deltaSeconds;
    state.ftpTestSeconds += deltaSeconds;
  }

  state.position = position;
  if (state.pendingPlay !== null) {
    void playPending(state);
  }

  if (performance.now() - state.lastPollAt >= POLL_MS) {
    state.lastPollAt = performance.now();
    void pollPlayer(state, ride);
  }

  updateScreen(state, ride, position, sample);
}

function startRide(state: RideScreenState, ride: Ride): void {
  if (state.phase !== 'ready' || state.bikeState !== 'connected') {
    return;
  }

  const testIntervalIndex: number = ride.ftpTest === undefined ? -1 : ride.ftpTest.intervalIndex;
  state.phase = 'riding';
  state.startedAt = performance.now();
  state.startedAtDate = new Date();
  state.lastTickAt = state.startedAt;
  state.lastPollAt = state.startedAt;
  state.position = intervalAtElapsed(ride, 0);
  state.elements.startButton.hidden = true;
  state.elements.testButton.hidden = true;
  state.elements.endButton.hidden = false;
  state.elements.status.textContent = '';

  // The tap that started the ride is the user gesture browsers want before audio
  void state.player?.activateElement();
  void playPending(state);
  void acquireWakeLock(state);
  state.tickHandle = setInterval((): void => {
    tick(state, ride, testIntervalIndex);
  }, TICK_MS);
}

async function attemptReconnect(
  state: RideScreenState,
  ride: Ride,
  onSample: (sample: BikeSample) => void, onDisconnect: () => void): Promise<void> {
  const device: BluetoothDevice | null = state.device;
  if (device === null || state.bikeState !== 'reconnecting' || state.reconnectInFlight) {
    return;
  }

  state.reconnectInFlight = true;
  try {
    await reconnectWattbike(device, onSample, onDisconnect);
  } catch (reconnectError) {
    state.elements.status.textContent = `Reconnecting to bike: ${errorMessage(reconnectError)}`;
    return;
  } finally {
    state.reconnectInFlight = false;
  }

  if (state.phase === 'finished') {
    device.gatt?.disconnect();
    return;
  }

  if (state.reconnectHandle !== null) {
    clearInterval(state.reconnectHandle);
    state.reconnectHandle = null;
  }
  state.bikeState = 'connected';
  state.elements.status.textContent = '';
  if (state.phase === 'ready') {
    state.elements.startButton.disabled = false;
    updateReadyScreen(state, ride);
  }
}

async function connectBike(state: RideScreenState, ride: Ride, onSample: (sample: BikeSample) => void, onDisconnect: () => void): Promise<void> {
  state.bikeState = 'connecting';
  state.elements.connectButton.disabled = true;
  state.elements.status.textContent = 'Connecting bike';

  let device: BluetoothDevice;
  try {
    device = await connectWattbike(onSample, onDisconnect);
  } catch (connectError) {
    state.bikeState = 'disconnected';
    state.elements.connectButton.disabled = false;
    state.elements.status.textContent = `Could not connect bike: ${errorMessage(connectError)}`;
    return;
  }

  if (state.phase === 'finished') {
    device.gatt?.disconnect();
    return;
  }

  state.device = device;
  state.bikeState = 'connected';
  state.settings = { ...state.settings, bikeName: device.name ?? 'Wattbike' };
  saveSettings(state.settings);
  state.elements.connectButton.hidden = true;
  state.elements.startButton.disabled = false;
  state.elements.status.textContent = `Connected to ${state.settings.bikeName}`;
  updateReadyScreen(state, ride);
}

async function loadMusic(state: RideScreenState, ride: Ride): Promise<void> {
  if (loadSpotifyAuth() === null) {
    markMusicFailed(state, 'Connect Spotify in Settings');
    return;
  }
  if (state.settings.spotifyPlaylistId === '') {
    markMusicFailed(state, 'Choose a playlist in Settings');
    return;
  }

  state.musicLoading = true;
  updateTrack(state);
  let tracks: Track[];
  try {
    tracks = await getPlaylistTracks(state.settings.spotifyPlaylistId);
  } catch (trackError) {
    markMusicFailed(state, errorMessage(trackError));
    return;
  } finally {
    state.musicLoading = false;
  }

  if (state.phase === 'finished') {
    return;
  }

  if (tracks.length === 0) {
    markMusicFailed(state, 'Playlist has no tracks');
    return;
  }

  state.tracks = tracks;
  state.tempos = loadTempoCache();
  if (state.track === null && state.pendingPlay === null) {
    state.pendingPlay = pickTrack(tracks, state.tempos, currentZone(state, ride), state.played, null, Math.random);
  }
  updateTrack(state);
  void connectPlayer(state);
}

async function connectPlayer(state: RideScreenState): Promise<void> {
  let connected: { player: SpotifyPlayer; deviceId: string };
  try {
    connected = await connectSpotifyPlayer(
      (message: string): void => markMusicFailed(state, message),
      (deviceId: string | null): void => {
        state.playerDeviceId = deviceId;
        if (deviceId === null) {
          markMusicFailed(state, 'Spotify player offline');
        }
      },
    );
  } catch (playerError) {
    markMusicFailed(state, errorMessage(playerError));
    return;
  }

  if (state.phase === 'finished') {
    connected.player.disconnect();
    return;
  }
  state.player = connected.player;
  state.playerDeviceId = connected.deviceId;
}

function startTestRide(state: RideScreenState, ride: Ride): void {
  if (state.phase !== 'ready') {
    return;
  }

  state.testMode = true;
  state.bikeState = 'connected';
  state.elements.connectButton.hidden = true;
  startRide(state, ride);
}

export default function renderRideScreen(root: HTMLElement, ride: Ride): void {
  const top = buildTopBand((direction: 'prev' | 'next'): void => skipTrack(state, ride, direction));
  const stats = buildStatsStrip();
  const profileRoot: HTMLElement = buildElement('section', 'ride-profile-band', '');
  const status: HTMLElement = buildElement('p', 'status ride-status', '');
  const connectButton: HTMLButtonElement = buildButton('Connect bike', (): void => {
    void connectBike(state, ride, onSample, onDisconnect);
  });
  const startButton: HTMLButtonElement = buildButton('Start', (): void => {
    startRide(state, ride);
  });
  startButton.disabled = true;
  const testButton: HTMLButtonElement = buildButton('Test', (): void => {
    startTestRide(state, ride);
  });
  const endButton: HTMLButtonElement = buildButton('End ride', (): void => {
    if (!window.confirm('End ride?')) {
      return;
    }
    finishRide(state, ride, 'ended');
  });
  endButton.hidden = true;
  const doneButton: HTMLButtonElement = buildButton('Done', (): void => {
    navigate(state.summaryId === null ? '#/' : '#/summary/' + state.summaryId);
  });
  doneButton.hidden = true;
  top.actions.append(testButton, connectButton, startButton, endButton, doneButton);

  const state: RideScreenState = {
    phase: 'ready',
    settings: loadSettings(),
    startedAt: 0,
    startedAtDate: new Date(),
    lastTickAt: 0,
    lastPollAt: 0,
    stats: emptyRideStats(),
    latestSample: null,
    position: null,
    device: null,
    bikeState: 'disconnected',
    testMode: false,
    tracks: [],
    tempos: {},
    track: null,
    history: [],
    played: new Set(),
    summaryId: null,
    musicMessage: null,
    musicSkips: 0,
    musicLoading: false,
    lastPlayAt: 0,
    player: null,
    playerDeviceId: null,
    spotifyCallInFlight: false,
    reconnectInFlight: false,
    pendingPlay: null,
    wakeLock: null,
    tickHandle: null,
    reconnectHandle: null,
    ftpTestWattSeconds: 0,
    ftpTestSeconds: 0,
    listeners: new AbortController(),
    elements: {
      ...top.elements,
      ...stats.elements,
      profileRoot,
      status,
      connectButton,
      startButton,
      testButton,
      endButton,
      doneButton,
      statsStrip: stats.strip,
    },
  };

  function onSample(sample: BikeSample): void {
    state.latestSample = sample;
    if (state.phase === 'ready') {
      updateReadyScreen(state, ride);
    }
  }

  function onDisconnect(): void {
    if (state.phase === 'finished' || state.reconnectHandle !== null) {
      return;
    }
    state.bikeState = 'reconnecting';
    state.latestSample = null;
    state.reconnectHandle = setInterval((): void => {
      void attemptReconnect(state, ride, onSample, onDisconnect);
    }, RECONNECT_MS);
    if (state.phase === 'ready') {
      state.elements.startButton.disabled = true;
      updateReadyScreen(state, ride);
    }
  }

  window.addEventListener(
    'hashchange',
    (): void => {
      finishRide(state, ride, 'navigated');
    },
    { signal: state.listeners.signal },
  );
  document.addEventListener(
    'visibilitychange',
    (): void => {
      if (state.phase === 'riding' && document.visibilityState === 'visible') {
        void acquireWakeLock(state);
      }
    },
    { signal: state.listeners.signal },
  );

  const screen: HTMLElement = buildElement('div', 'ride-screen', '');
  screen.append(top.band, status, profileRoot, stats.strip);
  root.replaceChildren(screen);
  updateReadyScreen(state, ride);
  void loadMusic(state, ride);
}
