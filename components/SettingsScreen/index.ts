import completeSpotifyLogin from '@/lib/client/helpers/complete-spotify-login';
import fillTempoCache from '@/lib/client/helpers/fill-tempo-cache';
import getPlaylistTracks from '@/lib/client/helpers/get-playlist-tracks';
import getSpotifyPlaylists from '@/lib/client/helpers/get-spotify-playlists';
import loadSettings from '@/lib/client/helpers/load-settings';
import loadSpotifyAuth from '@/lib/client/helpers/load-spotify-auth';
import loadTempoCache from '@/lib/client/helpers/load-tempo-cache';
import pausePlayback from '@/lib/client/helpers/pause-playback';
import saveSettings from '@/lib/client/helpers/save-settings';
import saveSpotifyAuth from '@/lib/client/helpers/save-spotify-auth';
import startSpotifyLogin from '@/lib/client/helpers/start-spotify-login';
import type { Settings, SpotifyAuth, SpotifyPlaylist, TempoCache, Track } from '@/lib/client/models/types';

function redirectUri(): string {
  return window.location.origin + import.meta.env.BASE_URL;
}

function buildField(label: string, name: string, type: string, value: string): HTMLLabelElement {
  const wrapper: HTMLLabelElement = document.createElement('label');
  wrapper.className = 'field';
  wrapper.append(label);

  const input: HTMLInputElement = document.createElement('input');
  input.name = name;
  input.type = type;
  input.value = value;
  wrapper.append(input);

  return wrapper;
}

function buildSwitch(label: string, name: string, enabled: boolean, onChange: (enabled: boolean) => void): HTMLLabelElement {
  const wrapper: HTMLLabelElement = document.createElement('label');
  wrapper.className = 'field field-switch';
  wrapper.append(label);

  const control: HTMLElement = document.createElement('span');
  control.className = 'switch';

  const input: HTMLInputElement = document.createElement('input');
  input.name = name;
  input.type = 'checkbox';
  input.role = 'switch';
  input.checked = enabled;

  const track: HTMLElement = document.createElement('span');
  track.className = 'switch-track';
  track.setAttribute('aria-hidden', 'true');

  input.addEventListener('change', (): void => {
    onChange(input.checked);
  });

  control.append(input, track);
  wrapper.append(control);
  return wrapper;
}

function buildButton(label: string, onClick: () => void | Promise<void>): HTMLButtonElement {
  const button: HTMLButtonElement = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', (): void => {
    void onClick();
  });
  return button;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function runFill(
  playlistId: string,
  settings: Settings,
  progress: HTMLProgressElement,
  status: HTMLElement,
): Promise<void> {
  status.textContent = 'Loading playlist tracks';
  let tracks: Track[];
  try {
    tracks = await getPlaylistTracks(playlistId);
  } catch (trackError) {
    status.textContent = `Could not load playlist tracks: ${errorMessage(trackError)}`;
    return;
  }

  progress.hidden = false;
  progress.max = tracks.length;
  progress.value = 0;
  status.textContent = 'Looking up tempos';
  const cache: TempoCache = loadTempoCache();
  try {
    await fillTempoCache(tracks, cache, (done: number, total: number): void => {
      progress.max = total;
      progress.value = done;
    });
  } catch (fillError) {
    status.textContent = errorMessage(fillError);
    return;
  }

  status.textContent = 'Tempo data is up to date';
}

let activeFill: Promise<void> | null = null;

async function fillFromPlaylist(
  playlistId: string,
  settings: Settings,
  progress: HTMLProgressElement,
  status: HTMLElement,
): Promise<void> {
  if (activeFill !== null) {
    status.textContent = 'Tempo lookup already running';
    return;
  }

  activeFill = runFill(playlistId, settings, progress, status);
  try {
    await activeFill;
  } finally {
    activeFill = null;
  }
}

async function loadPlaylistChoices(
  select: HTMLSelectElement,
  settings: Settings,
  status: HTMLElement,
): Promise<void> {
  status.textContent = 'Loading playlists';
  let playlists: SpotifyPlaylist[];
  try {
    playlists = await getSpotifyPlaylists();
  } catch (playlistError) {
    status.textContent = `Could not load playlists: ${errorMessage(playlistError)}`;
    return;
  }

  const placeholder: HTMLOptionElement = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select a playlist';
  select.replaceChildren(placeholder);
  for (const playlist of playlists) {
    const option: HTMLOptionElement = document.createElement('option');
    option.value = playlist.id;
    option.textContent = playlist.name;
    select.append(option);
  }
  select.value = settings.spotifyPlaylistId;
  select.hidden = false;
  status.textContent = '';
}

async function finishLogin(root: HTMLElement, code: string): Promise<void> {
  const settings: Settings = loadSettings();
  history.replaceState(null, '', location.pathname + '#/settings');
  let auth: SpotifyAuth;
  try {
    auth = await completeSpotifyLogin(settings.spotifyClientId, redirectUri(), code);
  } catch (loginError) {
    renderSettingsScreen(root);
    const status: HTMLElement | null = root.querySelector('.status');
    if (status) {
      status.textContent = `Spotify login failed: ${errorMessage(loginError)}`;
    }
    return;
  }

  saveSpotifyAuth(auth);
  renderSettingsScreen(root);
}

export default function renderSettingsScreen(root: HTMLElement): void {
  const code: string | null = new URLSearchParams(location.search).get('code');
  if (code) {
    root.textContent = 'Connecting Spotify';
    void finishLogin(root, code);
    return;
  }

  const settings: Settings = loadSettings();
  const connected: boolean = loadSpotifyAuth() !== null;

  const heading: HTMLHeadingElement = document.createElement('h1');
  heading.textContent = 'Settings';

  const back: HTMLAnchorElement = document.createElement('a');
  back.href = '#/';
  back.textContent = 'Back';

  const status: HTMLParagraphElement = document.createElement('p');
  status.className = 'status';
  if (sessionStorage.getItem('typhoon.spotifyLoginCancelled') !== null) {
    sessionStorage.removeItem('typhoon.spotifyLoginCancelled');
    status.textContent = 'Spotify login cancelled';
  }

  const ftpField: HTMLLabelElement = buildField('FTP (watts)', 'ftp', 'number', String(settings.ftp));
  (ftpField.querySelector('input') as HTMLInputElement).min = '1';
  const clientIdField: HTMLLabelElement = buildField('Spotify client ID', 'spotifyClientId', 'text', settings.spotifyClientId);
  const bikeField: HTMLLabelElement = buildField('Bike', 'bikeName', 'text', settings.bikeName || 'Not paired');
  (bikeField.querySelector('input') as HTMLInputElement).readOnly = true;

  const readInput = (name: string): string => (root.querySelector(`input[name="${name}"]`) as HTMLInputElement).value;

  const save = (): void => {
    const ftp: number = Number(readInput('ftp'));
    if (!Number.isFinite(ftp) || ftp <= 0) {
      status.textContent = 'FTP must be a positive number';
      return;
    }
    saveSettings({
      ...loadSettings(),
      ftp,
      spotifyClientId: readInput('spotifyClientId'),
    });
    status.textContent = 'Saved';
  };

  const progress: HTMLProgressElement = document.createElement('progress');
  progress.hidden = true;

  const select: HTMLSelectElement = document.createElement('select');
  select.hidden = true;
  select.addEventListener('change', (): void => {
    if (select.value === '') {
      return;
    }
    const updated: Settings = { ...loadSettings(), spotifyPlaylistId: select.value };
    saveSettings(updated);
    void fillFromPlaylist(select.value, updated, progress, status);
  });

  const form: HTMLFormElement = document.createElement('form');
  form.className = 'settings';
  form.addEventListener('submit', (event: Event): void => {
    event.preventDefault();
  });

  const bluetoothBody: HTMLElement = document.createElement('div');
  bluetoothBody.className = 'settings-group-body';
  bluetoothBody.append(bikeField, ftpField);

  const musicActions: HTMLElement = document.createElement('div');
  musicActions.className = 'settings-actions';
  const musicBody: HTMLElement = document.createElement('div');
  musicBody.className = 'settings-group-body';
  musicBody.append(clientIdField, musicActions, select, progress);

  const saveButton: HTMLButtonElement = buildButton('Save', save);

  const syncPanels = (): void => {
    const current: Settings = loadSettings();
    bluetoothBody.hidden = !current.bluetoothEnabled;
    musicBody.hidden = !current.musicEnabled;
    saveButton.hidden = bluetoothBody.hidden && musicBody.hidden;
  };

  const resumeMusic = (): void => {
    const current: Settings = loadSettings();
    if (connected && current.spotifyPlaylistId !== '') {
      void fillFromPlaylist(current.spotifyPlaylistId, current, progress, status);
    }
  };

  const musicToggle: HTMLLabelElement = buildSwitch('Music', 'musicEnabled', settings.musicEnabled, (enabled: boolean): void => {
    saveSettings({ ...loadSettings(), musicEnabled: enabled });
    syncPanels();
    if (!enabled) {
      void pausePlayback();
      return;
    }
    resumeMusic();
  });
  const bluetoothToggle: HTMLLabelElement = buildSwitch('Bluetooth', 'bluetoothEnabled', settings.bluetoothEnabled, (enabled: boolean): void => {
    saveSettings({ ...loadSettings(), bluetoothEnabled: enabled });
    syncPanels();
  });

  const bluetoothGroup: HTMLElement = document.createElement('section');
  bluetoothGroup.className = 'settings-group';
  bluetoothGroup.dataset.settingsGroup = 'bluetooth';
  bluetoothGroup.append(bluetoothToggle, bluetoothBody);

  const musicGroup: HTMLElement = document.createElement('section');
  musicGroup.className = 'settings-group';
  musicGroup.dataset.settingsGroup = 'music';
  musicGroup.append(musicToggle, musicBody);

  if (connected) {
    musicActions.append(
      buildButton('Disconnect Spotify', (): void => {
        saveSpotifyAuth(null);
        renderSettingsScreen(root);
      }),
      buildButton('Choose playlist', (): Promise<void> => loadPlaylistChoices(select, loadSettings(), status)),
    );
  } else {
    musicActions.append(
      buildButton('Connect Spotify', (): Promise<void> => {
        const current: Settings = loadSettings();
        const clientId: string = readInput('spotifyClientId');
        if (clientId === '') {
          status.textContent = 'Enter a Spotify client ID first';
          return Promise.resolve();
        }
        saveSettings({ ...current, spotifyClientId: clientId });
        return startSpotifyLogin(clientId, redirectUri()).catch((loginError: unknown): void => {
          status.textContent = `Could not start Spotify login: ${errorMessage(loginError)}`;
        });
      }),
    );
  }

  form.append(bluetoothGroup, musicGroup, saveButton);
  syncPanels();

  const screen: HTMLElement = document.createElement('div');
  screen.className = 'settings-screen';
  back.className = 'settings-back';
  screen.append(heading, form, status, back);
  root.replaceChildren(screen);

  if (connected && settings.musicEnabled && settings.spotifyPlaylistId !== '') {
    void fillFromPlaylist(settings.spotifyPlaylistId, settings, progress, status);
  }
}
