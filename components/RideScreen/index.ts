import renderRideProfile from '@/components/RideProfile';
import type { FinishReason, RideScreenElements, RideScreenState } from '@/components/RideScreen/types';
import accumulateRideStats from '@/lib/client/helpers/accumulate-ride-stats';
import appendRideSummary from '@/lib/client/helpers/append-ride-summary';
import calculateFtp from '@/lib/client/helpers/calculate-ftp';
import connectWattbike from '@/lib/client/helpers/connect-wattbike';
import emptyRideStats from '@/lib/client/helpers/empty-ride-stats';
import formatClock from '@/lib/client/helpers/format-clock';
import intervalAtElapsed from '@/lib/client/helpers/interval-at-elapsed';
import loadSettings from '@/lib/client/helpers/load-settings';
import navigate from '@/lib/client/helpers/navigate';
import reconnectWattbike from '@/lib/client/helpers/reconnect-wattbike';
import requestWakeLock from '@/lib/client/helpers/request-wake-lock';
import saveSettings from '@/lib/client/helpers/save-settings';
import simulateBikeSample from '@/lib/client/helpers/simulate-bike-sample';
import { dismissToasts, mountToasts, showToast } from '@/lib/client/helpers/toasts';
import speedFromWatts from '@/lib/client/helpers/speed-from-watts';
import summariseRide from '@/lib/client/helpers/summarise-ride';
import zoneForWatts from '@/lib/client/helpers/zone-for-watts';
import { targetRpmForZone } from '@/lib/client/models/target-cadence';
import { ZONES } from '@/lib/client/models/zones';
import type { BikeSample, IntervalPosition, Ride, RideInterval, RideSummary, ZoneNumber } from '@/lib/client/models/types';

const TICK_MS = 250;
const RECONNECT_MS = 3000;
const SAMPLE_MAX_AGE_MS = 3000;
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
  const scaled: number = state.testMode ? state.startedAt + (real - state.startedAt) * TEST_SPEED : real;
  return scaled - state.pausedMs;
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

function buildTopBand(): { band: HTMLElement; actions: HTMLElement } {
  const band: HTMLElement = buildElement('section', 'ride-top', '');
  const actions: HTMLElement = buildElement('div', 'ride-actions', '');
  band.append(actions);
  return { band, actions };
}

function buildStatsStrip(): { strip: HTMLElement; elements: Pick<RideScreenElements, 'percent' | 'watts' | 'rpm' | 'mph' | 'averageMph' | 'miles' | 'interval' | 'remaining' | 'target'> } {
  const strip: HTMLElement = buildElement('section', 'ride-stats', '');
  const percent = buildStatCell('% FTP', 'ride-stat-percent');
  const watts = buildStatCell('Watts', 'ride-stat-watts');
  const rpm = buildStatCell('RPM', 'ride-stat-rpm');
  const mph = buildStatCell('MPH', 'ride-stat-mph');
  const averageMph = buildStatCell('Avg MPH', 'ride-stat-average-mph');
  const miles = buildStatCell('Miles', 'ride-stat-miles');
  const target = buildStatCell('Target', 'ride-stat-target');
  target.cell.hidden = true;
  const interval = buildStatCell('Interval', 'ride-stat-interval');
  const remaining = buildStatCell('Remaining', 'ride-stat-remaining');
  strip.append(percent.cell, watts.cell, rpm.cell, mph.cell, averageMph.cell, miles.cell, target.cell, interval.cell, remaining.cell);

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
      target: target.value,
    },
  };
}

function statCell(value: HTMLElement): HTMLElement {
  return value.parentElement as HTMLElement;
}

const BIKE_STATS: (keyof Pick<RideScreenElements, 'percent' | 'watts' | 'rpm' | 'mph' | 'averageMph' | 'miles'>)[] = [
  'percent',
  'watts',
  'rpm',
  'mph',
  'averageMph',
  'miles',
];

function applyBluetoothMode(state: RideScreenState): void {
  if (state.settings.bluetoothEnabled) {
    return;
  }

  state.elements.connectButton.hidden = true;
  state.elements.startButton.disabled = false;
  state.elements.statsStrip.classList.add('ride-stats-manual');
  for (const name of BIKE_STATS) {
    statCell(state.elements[name]).hidden = true;
  }
  statCell(state.elements.target).hidden = false;
}

function updateInterval(state: RideScreenState, position: IntervalPosition): void {
  state.elements.interval.textContent = formatClock(position.secondsLeftInInterval);
}

function updateStats(state: RideScreenState, sample: BikeSample | null, secondsLeftInRide: number, zone: ZoneNumber): void {
  const { percent, watts, rpm, mph, averageMph, miles, remaining, target } = state.elements;
  remaining.textContent = formatClock(secondsLeftInRide);
  if (!state.settings.bluetoothEnabled) {
    target.textContent = String(targetRpmForZone(zone));
    target.style.color = ZONES[zone - 1].colour;
    return;
  }

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
}

function updateScreen(state: RideScreenState, ride: Ride, position: IntervalPosition, sample: BikeSample | null): void {
  updateInterval(state, position);
  updateStats(state, sample, position.secondsLeftInRide, position.interval.zone);
  renderRideProfile(state.elements.profileRoot, {
    ride,
    position: state.phase === 'riding' ? position : null,
  });
}

function updateReadyScreen(state: RideScreenState, ride: Ride): void {
  const position: IntervalPosition = intervalAtElapsed(ride, 0) as IntervalPosition;
  updateScreen(state, ride, position, freshSample(state, clock(state)));
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

  if (!wasRiding) {
    return;
  }

  state.elements.pauseButton.hidden = true;
  state.elements.endButton.hidden = true;
  state.elements.doneButton.hidden = reason !== 'ended';
  if (state.testMode) {
    if (reason === 'completed') {
      navigate('#/');
    }
    return;
  }

  const ftpTestAverageWatts: number | undefined =
    ride.ftpTest === undefined ? undefined : state.ftpTestSeconds > 0 ? state.ftpTestWattSeconds / state.ftpTestSeconds : 0;
  const summary: RideSummary = summariseRide(ride, state.stats, state.settings.ftp, state.startedAtDate, ftpTestAverageWatts);
  if (reason === 'ended') {
    summary.endedEarly = true;
  }

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
  if (state.paused) {
    return;
  }

  const now: number = clock(state);
  const rideEnd: number = state.startedAt + totalSeconds(ride) * 1000;
  if (state.testMode) {
    state.latestSample = simulateBikeSample(currentZone(state, ride), state.settings.ftp, now);
  }
  const deltaSeconds: number = Math.max(0, Math.min(now, rideEnd) - state.lastTickAt) / 1000;
  const elapsed: number = (now - state.startedAt) / 1000;
  const sample: BikeSample | null = freshSample(state, now);
  state.stats = accumulateRideStats(state.stats, sample, deltaSeconds, state.settings.ftp, state.position?.interval.zone);
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
  updateScreen(state, ride, position, sample);
}

function startRide(state: RideScreenState, ride: Ride): void {
  if (state.phase !== 'ready' || (state.settings.bluetoothEnabled && state.bikeState !== 'connected')) {
    return;
  }

  const testIntervalIndex: number = ride.ftpTest === undefined ? -1 : ride.ftpTest.intervalIndex;
  state.phase = 'riding';
  state.startedAt = performance.now();
  state.startedAtDate = new Date();
  state.lastTickAt = state.startedAt;
  state.position = intervalAtElapsed(ride, 0);
  state.elements.startButton.hidden = true;
  state.elements.testButton.hidden = true;
  state.elements.pauseButton.hidden = false;
  state.elements.endButton.hidden = false;
  dismissToasts((message: string): boolean => message === 'Connecting bike' || message.startsWith('Connected to '));

  void acquireWakeLock(state);
  state.tickHandle = setInterval((): void => {
    tick(state, ride, testIntervalIndex);
  }, TICK_MS);
}

function togglePause(state: RideScreenState): void {
  if (state.phase !== 'riding') {
    return;
  }

  if (state.paused) {
    state.pausedMs += clock(state) - state.pausedAt;
    state.paused = false;
  } else {
    state.pausedAt = clock(state);
    state.paused = true;
  }
  state.elements.pauseButton.textContent = state.paused ? 'Resume' : 'Pause';
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
    if (state.settings.bluetoothEnabled) {
      showToast(`Reconnecting to bike: ${errorMessage(reconnectError)}`, 'error');
    }
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
  dismissToasts((message: string): boolean => message.startsWith('Reconnecting to bike'));
  if (state.settings.bluetoothEnabled) {
    showToast(`Connected to ${state.settings.bikeName}`, 'success');
  }
  if (state.phase === 'ready') {
    state.elements.startButton.disabled = false;
    updateReadyScreen(state, ride);
  }
}

async function connectBike(state: RideScreenState, ride: Ride, onSample: (sample: BikeSample) => void, onDisconnect: () => void): Promise<void> {
  if (!state.settings.bluetoothEnabled) {
    return;
  }
  state.bikeState = 'connecting';
  state.elements.connectButton.disabled = true;
  showToast('Connecting bike', 'info');

  let device: BluetoothDevice;
  try {
    device = await connectWattbike(onSample, onDisconnect);
  } catch (connectError) {
    state.bikeState = 'disconnected';
    state.elements.connectButton.disabled = false;
    dismissToasts((message: string): boolean => message === 'Connecting bike');
    showToast(`Could not connect bike: ${errorMessage(connectError)}`, 'error');
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
  dismissToasts((message: string): boolean => message === 'Connecting bike');
  showToast(`Connected to ${state.settings.bikeName}`, 'success');
  updateReadyScreen(state, ride);
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
  const top = buildTopBand();
  const stats = buildStatsStrip();
  const profileRoot: HTMLElement = buildElement('section', 'ride-profile-band', '');
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
  const pauseButton: HTMLButtonElement = buildButton('Pause', (): void => {
    togglePause(state);
  });
  pauseButton.hidden = true;
  const endButton: HTMLButtonElement = buildButton('End ride', (): void => {
    finishRide(state, ride, 'ended');
  });
  endButton.classList.add('ride-end');
  endButton.hidden = true;
  const doneButton: HTMLButtonElement = buildButton('Done', (): void => {
    navigate(state.summaryId === null ? '#/' : '#/summary/' + state.summaryId);
  });
  doneButton.hidden = true;
  top.actions.append(testButton, connectButton, startButton, pauseButton, endButton, doneButton);

  const state: RideScreenState = {
    phase: 'ready',
    settings: loadSettings(),
    startedAt: 0,
    startedAtDate: new Date(),
    paused: false,
    pausedAt: 0,
    pausedMs: 0,
    lastTickAt: 0,
    stats: emptyRideStats(),
    latestSample: null,
    position: null,
    device: null,
    bikeState: 'disconnected',
    testMode: false,
    summaryId: null,
    reconnectInFlight: false,
    wakeLock: null,
    tickHandle: null,
    reconnectHandle: null,
    ftpTestWattSeconds: 0,
    ftpTestSeconds: 0,
    listeners: new AbortController(),
    elements: {
      ...stats.elements,
      profileRoot,
      connectButton,
      startButton,
      testButton,
      pauseButton,
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
  const rotateHint: HTMLElement = buildElement('p', 'ride-rotate-hint', 'Rotate your phone');
  screen.append(rotateHint, top.band, profileRoot, stats.strip);
  mountToasts(screen);
  applyBluetoothMode(state);
  root.replaceChildren(screen);
  updateReadyScreen(state, ride);
}
