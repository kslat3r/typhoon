import renderRideProfile from '@/components/RideProfile';
import type { FinishReason, RideScreenElements, RideScreenState } from '@/components/RideScreen/types';
import accumulateRideStats from '@/lib/client/helpers/accumulate-ride-stats';
import appendRideSummary from '@/lib/client/helpers/append-ride-summary';
import calculateFtp from '@/lib/client/helpers/calculate-ftp';
import connectWattbike from '@/lib/client/helpers/connect-wattbike';
import decideMusicAction from '@/lib/client/helpers/decide-music-action';
import emptyRideStats from '@/lib/client/helpers/empty-ride-stats';
import formatClock from '@/lib/client/helpers/format-clock';
import getPlayerState from '@/lib/client/helpers/get-player-state';
import getPlaylistTracks from '@/lib/client/helpers/get-playlist-tracks';
import intervalAtElapsed from '@/lib/client/helpers/interval-at-elapsed';
import loadSettings from '@/lib/client/helpers/load-settings';
import loadSpotifyAuth from '@/lib/client/helpers/load-spotify-auth';
import loadTempoCache from '@/lib/client/helpers/load-tempo-cache';
import navigate from '@/lib/client/helpers/navigate';
import pickTrack from '@/lib/client/helpers/pick-track';
import playTrack from '@/lib/client/helpers/play-track';
import queueTrack from '@/lib/client/helpers/queue-track';
import reconnectWattbike from '@/lib/client/helpers/reconnect-wattbike';
import requestWakeLock from '@/lib/client/helpers/request-wake-lock';
import saveSettings from '@/lib/client/helpers/save-settings';
import speedFromWatts from '@/lib/client/helpers/speed-from-watts';
import summariseRide from '@/lib/client/helpers/summarise-ride';
import zoneForWatts from '@/lib/client/helpers/zone-for-watts';
import { ZONES } from '@/lib/client/models/zones';
import type { BikeSample, IntervalPosition, PlayerState, Ride, RideInterval, RideSummary, Track, ZoneNumber } from '@/lib/client/models/types';

const TICK_MS = 250;
const POLL_MS = 2000;
const RECONNECT_MS = 3000;
const SAMPLE_MAX_AGE_MS = 3000;
const QUEUE_BEFORE_END_MS = 10000;

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

function buildTopBand(): { band: HTMLElement; elements: Pick<RideScreenElements, 'artwork' | 'trackTitle' | 'trackArtist' | 'countdown' | 'zoneLabel'>; right: HTMLElement } {
  const band: HTMLElement = buildElement('section', 'ride-top', '');

  const artwork: HTMLImageElement = document.createElement('img');
  artwork.className = 'ride-artwork';
  artwork.alt = '';
  artwork.hidden = true;
  const trackTitle: HTMLElement = buildElement('div', 'ride-track-title', 'No music');
  const trackArtist: HTMLElement = buildElement('div', 'ride-track-artist', '');
  const trackText: HTMLElement = buildElement('div', 'ride-track-text', '');
  trackText.append(trackTitle, trackArtist);
  const track: HTMLElement = buildElement('div', 'ride-track', '');
  track.append(artwork, trackText);

  const countdown: HTMLElement = buildElement('div', 'ride-countdown', '');
  const zoneLabel: HTMLElement = buildElement('div', 'ride-zone-label', '');
  const interval: HTMLElement = buildElement('div', 'ride-interval', '');
  interval.append(countdown, zoneLabel);

  const right: HTMLElement = buildElement('div', 'ride-top-right', '');
  right.append(interval);
  band.append(track, right);

  return { band, elements: { artwork, trackTitle, trackArtist, countdown, zoneLabel }, right };
}

function buildStatsStrip(): { strip: HTMLElement; elements: Pick<RideScreenElements, 'watts' | 'rpm' | 'mph' | 'averageMph' | 'miles' | 'remaining'> } {
  const strip: HTMLElement = buildElement('section', 'ride-stats', '');
  const watts = buildStatCell('Watts', 'ride-stat-watts');
  const rpm = buildStatCell('RPM', 'ride-stat-rpm');
  const mph = buildStatCell('MPH', 'ride-stat-mph');
  const averageMph = buildStatCell('Avg MPH', 'ride-stat-average-mph');
  const miles = buildStatCell('Miles', 'ride-stat-miles');
  const remaining = buildStatCell('Remaining', 'ride-stat-remaining');
  strip.append(watts.cell, rpm.cell, mph.cell, averageMph.cell, miles.cell, remaining.cell);

  return {
    strip,
    elements: {
      watts: watts.value,
      rpm: rpm.value,
      mph: mph.value,
      averageMph: averageMph.value,
      miles: miles.value,
      remaining: remaining.value,
    },
  };
}

function updateTrack(state: RideScreenState): void {
  const { artwork, trackTitle, trackArtist } = state.elements;
  const shown: Track | null = state.musicFailed ? null : (state.pendingPlay ?? state.music.track);

  if (shown === null) {
    trackTitle.textContent = 'No music';
    trackArtist.textContent = '';
    artwork.hidden = true;
    artwork.removeAttribute('src');
    return;
  }

  const tempo: number | null | undefined = state.tempos[shown.id];
  trackTitle.textContent = shown.name;
  trackArtist.textContent = typeof tempo === 'number' ? `${shown.artist} · ${Math.round(tempo)} bpm` : shown.artist;
  if (shown.artworkUrl) {
    artwork.src = shown.artworkUrl;
    artwork.hidden = false;
  } else {
    artwork.hidden = true;
    artwork.removeAttribute('src');
  }
}

function updateInterval(state: RideScreenState, position: IntervalPosition): void {
  const zone: ZoneNumber = position.interval.zone;
  state.elements.countdown.textContent = formatClock(position.secondsLeftInInterval);
  state.elements.countdown.style.color = ZONES[zone - 1].colour;
  state.elements.zoneLabel.textContent = `Zone ${zone}`;
}

function updateStats(state: RideScreenState, sample: BikeSample | null, secondsLeftInRide: number): void {
  const { watts, rpm, mph, averageMph, miles, remaining } = state.elements;
  const ftp: number = state.settings.ftp;

  if (state.bikeState === 'reconnecting') {
    watts.textContent = 'Reconnecting';
    watts.style.color = '';
  } else if (sample === null) {
    watts.textContent = '--';
    watts.style.color = '';
  } else {
    watts.textContent = String(Math.round(sample.watts));
    watts.style.color = ZONES[zoneForWatts(sample.watts, ftp) - 1].colour;
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
    percentOfFtp: sample === null ? null : (sample.watts / state.settings.ftp) * 100,
  });
}

function updateReadyScreen(state: RideScreenState, ride: Ride): void {
  const position: IntervalPosition = intervalAtElapsed(ride, 0) as IntervalPosition;
  updateScreen(state, ride, position, freshSample(state, performance.now()));
}

async function runSpotifyCall(state: RideScreenState, call: () => Promise<void>): Promise<void> {
  if (state.spotifyCallInFlight) {
    return;
  }

  state.spotifyCallInFlight = true;
  try {
    await call();
  } catch (spotifyError) {
    state.musicFailed = true;
    state.elements.status.textContent = `Music stopped: ${errorMessage(spotifyError)}`;
    updateTrack(state);
  } finally {
    state.spotifyCallInFlight = false;
  }
}

async function playPending(state: RideScreenState, ride: Ride): Promise<void> {
  const track: Track | null = state.pendingPlay;
  if (track === null || state.spotifyCallInFlight || state.phase !== 'riding') {
    return;
  }

  state.pendingPlay = null;
  await runSpotifyCall(state, async (): Promise<void> => {
    await playTrack(track.uri);
    state.music = { track, startedAt: performance.now(), zone: currentZone(state, ride) };
    state.queuedForThisPlay = false;
    state.musicFailed = false;
    updateTrack(state);
  });
}

async function pollPlayer(state: RideScreenState, ride: Ride): Promise<void> {
  const playing: Track | null = state.music.track;
  if (state.musicFailed || playing === null) {
    return;
  }

  const result: { player: PlayerState | null } = { player: null };
  await runSpotifyCall(state, async (): Promise<void> => {
    result.player = await getPlayerState();
  });

  const player: PlayerState | null = result.player;
  if (player === null || state.phase !== 'riding' || state.music.track !== playing) {
    return;
  }

  const msLeft: number = player.durationMs - player.progressMs;
  if (player.trackId === playing.id && msLeft >= QUEUE_BEFORE_END_MS) {
    state.queuedForThisPlay = false;
  }
  if (msLeft >= QUEUE_BEFORE_END_MS || state.queuedForThisPlay) {
    return;
  }

  const zone: ZoneNumber = currentZone(state, ride);
  const next: Track = pickTrack(state.tracks, state.tempos, zone, playing.id, Math.random);
  await runSpotifyCall(state, async (): Promise<void> => {
    await queueTrack(next.uri);
    state.queuedForThisPlay = true;
    state.music = { track: next, startedAt: performance.now() + msLeft, zone };
  });
}

function changeMusicForZone(state: RideScreenState, ride: Ride, zone: ZoneNumber, now: number): void {
  state.musicFailed = false;
  const action = decideMusicAction(state.music, zone, now, state.tracks, state.tempos, Math.random);
  if (action.kind === 'hold') {
    state.music = { ...state.music, zone };
    return;
  }

  state.pendingPlay = action.track;
  void playPending(state, ride);
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

function saveSummaryAndLeave(summary: RideSummary): void {
  appendRideSummary(summary);
  navigate('#/summary/' + summary.id);
}

function showFtpResult(state: RideScreenState, summary: RideSummary, proposedFtp: number): void {
  const panel: HTMLElement = buildElement('section', 'ride-ftp-result', '');
  const save: HTMLButtonElement = buildButton('Save', (): void => {
    saveSettings({ ...loadSettings(), ftp: proposedFtp });
    saveSummaryAndLeave(summary);
  });
  save.disabled = proposedFtp <= 0;
  const keep: HTMLButtonElement = buildButton('Keep current', (): void => {
    saveSummaryAndLeave(summary);
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

  if (!wasRiding) {
    return;
  }

  state.elements.endButton.hidden = true;
  const ftpTestAverageWatts: number | undefined =
    ride.ftpTestSeconds === undefined ? undefined : state.ftpTestSeconds > 0 ? state.ftpTestWattSeconds / state.ftpTestSeconds : 0;
  const summary: RideSummary = summariseRide(ride, state.stats, state.settings.ftp, state.startedAtDate, ftpTestAverageWatts);

  if (reason === 'navigated') {
    appendRideSummary(summary);
    return;
  }

  if (ride.ftpTestSeconds === undefined || ftpTestAverageWatts === undefined) {
    saveSummaryAndLeave(summary);
    return;
  }

  showFtpResult(state, summary, calculateFtp(ftpTestAverageWatts, ride.ftpTestSeconds));
}

function tick(state: RideScreenState, ride: Ride, testIntervalIndex: number): void {
  const now: number = performance.now();
  const rideEnd: number = state.startedAt + totalSeconds(ride) * 1000;
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

  const previousZone: ZoneNumber = currentZone(state, ride);
  state.position = position;
  if (position.interval.zone !== previousZone) {
    changeMusicForZone(state, ride, position.interval.zone, now);
  } else if (state.pendingPlay !== null) {
    void playPending(state, ride);
  }

  if (now - state.lastPollAt >= POLL_MS) {
    state.lastPollAt = now;
    void pollPlayer(state, ride);
  }

  updateScreen(state, ride, position, sample);
}

function startRide(state: RideScreenState, ride: Ride): void {
  if (state.phase !== 'ready' || state.bikeState !== 'connected') {
    return;
  }

  const testIntervalIndex: number =
    ride.ftpTestSeconds === undefined ? -1 : ride.intervals.findIndex((interval: RideInterval): boolean => interval.zone === 4);
  state.phase = 'riding';
  state.startedAt = performance.now();
  state.startedAtDate = new Date();
  state.lastTickAt = state.startedAt;
  state.lastPollAt = state.startedAt;
  state.position = intervalAtElapsed(ride, 0);
  state.elements.controls.hidden = true;
  state.elements.endButton.hidden = false;
  state.elements.status.textContent = '';

  void playPending(state, ride);
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
  if (loadSpotifyAuth() === null || state.settings.spotifyPlaylistId === '') {
    return;
  }

  let tracks: Track[];
  try {
    tracks = await getPlaylistTracks(state.settings.spotifyPlaylistId);
  } catch (trackError) {
    state.elements.status.textContent = `No music: ${errorMessage(trackError)}`;
    return;
  }

  if (tracks.length === 0 || state.phase === 'finished') {
    return;
  }

  state.tracks = tracks;
  state.tempos = loadTempoCache();
  if (state.music.track === null && state.pendingPlay === null) {
    state.pendingPlay = pickTrack(tracks, state.tempos, currentZone(state, ride), null, Math.random);
  }
  updateTrack(state);
}

export default function renderRideScreen(root: HTMLElement, ride: Ride): void {
  const top = buildTopBand();
  const stats = buildStatsStrip();
  const profileRoot: HTMLElement = buildElement('section', 'ride-profile-band', '');
  const status: HTMLElement = buildElement('p', 'status ride-status', '');
  const controls: HTMLElement = buildElement('section', 'ride-controls', '');
  const connectButton: HTMLButtonElement = buildButton('Connect bike', (): void => {
    void connectBike(state, ride, onSample, onDisconnect);
  });
  const startButton: HTMLButtonElement = buildButton('Start', (): void => {
    startRide(state, ride);
  });
  startButton.disabled = true;
  const endButton: HTMLButtonElement = buildButton('End ride', (): void => {
    finishRide(state, ride, 'ended');
  });
  endButton.className = 'ride-end';
  endButton.hidden = true;
  top.right.append(endButton);
  controls.append(buildElement('h1', 'ride-name', ride.name), connectButton, startButton);

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
    tracks: [],
    tempos: {},
    music: { track: null, startedAt: 0, zone: ride.intervals[0].zone },
    musicFailed: false,
    queuedForThisPlay: false,
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
      endButton,
      controls,
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
  screen.append(top.band, controls, status, profileRoot, stats.strip);
  root.replaceChildren(screen);
  updateReadyScreen(state, ride);
  void loadMusic(state, ride);
}
