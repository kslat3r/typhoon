import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fillTempoCache from '@/lib/client/helpers/fill-tempo-cache';
import saveSettings from '@/lib/client/helpers/save-settings';
import saveSpotifyAuth from '@/lib/client/helpers/save-spotify-auth';
import renderSettingsScreen from '@/components/SettingsScreen';
vi.mock('@/lib/client/helpers/get-playlist-tracks', () => ({ default: vi.fn(async () => []) }));
vi.mock('@/lib/client/helpers/fill-tempo-cache', () => ({ default: vi.fn() }));

import loadSettings from '@/lib/client/helpers/load-settings';

function findButton(root: HTMLElement, label: string): HTMLButtonElement {
  const buttons: HTMLButtonElement[] = Array.from(root.querySelectorAll('button'));
  const found: HTMLButtonElement | undefined = buttons.find((button: HTMLButtonElement): boolean => button.textContent === label);
  if (!found) {
    throw new Error(`No button labelled ${label}`);
  }
  return found;
}

describe('renderSettingsScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saves a valid FTP', () => {
    // Arrange
    const root: HTMLElement = document.createElement('div');
    renderSettingsScreen(root);
    const ftpInput: HTMLInputElement = root.querySelector('input[name="ftp"]') as HTMLInputElement;

    // Act
    ftpInput.value = '210';
    findButton(root, 'Save').click();

    // Assert
    expect(loadSettings().ftp).toBe(210);
  });

  it('refuses to save a zero FTP and shows a status message', () => {
    // Arrange
    const root: HTMLElement = document.createElement('div');
    renderSettingsScreen(root);
    const ftpInput: HTMLInputElement = root.querySelector('input[name="ftp"]') as HTMLInputElement;

    // Act
    ftpInput.value = '0';
    findButton(root, 'Save').click();

    // Assert
    expect(loadSettings().ftp).toBe(150);
    expect(root.querySelector('.status')?.textContent).not.toBe('');
  });

  it('saves the music toggle and keeps it across a reload', () => {
    // Arrange
    const root: HTMLElement = document.createElement('div');
    renderSettingsScreen(root);
    const music: HTMLInputElement = root.querySelector('input[name="musicEnabled"]') as HTMLInputElement;

    // Assert
    expect(music).not.toBeNull();
    expect(music.type).toBe('checkbox');
    expect(music.checked).toBe(true);
    expect(music.labels?.[0]?.textContent?.trim()).toBe('Music');
    expect(root.textContent).not.toMatch(/\b(On|Off)\b/);
    expect(loadSettings().musicEnabled).toBe(true);

    // Act
    music.checked = false;
    music.dispatchEvent(new Event('change'));

    // Assert
    expect(loadSettings().musicEnabled).toBe(false);
    expect(music.labels?.[0]?.textContent?.trim()).toBe('Music');
    expect(root.textContent).not.toMatch(/\b(On|Off)\b/);

    // Act
    root.replaceChildren();
    renderSettingsScreen(root);
    const reloaded: HTMLInputElement = root.querySelector('input[name="musicEnabled"]') as HTMLInputElement;

    // Assert
    expect(reloaded.checked).toBe(false);
    expect(reloaded.labels?.[0]?.textContent?.trim()).toBe('Music');

    // Act
    reloaded.checked = true;
    reloaded.dispatchEvent(new Event('change'));

    // Assert
    expect(loadSettings().musicEnabled).toBe(true);
    expect(reloaded.checked).toBe(true);
  });

  it('saves the Bluetooth toggle next to Music and keeps it across a reload', () => {
    // Arrange
    const root: HTMLElement = document.createElement('div');
    renderSettingsScreen(root);
    const bluetooth: HTMLInputElement = root.querySelector('input[name="bluetoothEnabled"]') as HTMLInputElement;
    const music: HTMLInputElement = root.querySelector('input[name="musicEnabled"]') as HTMLInputElement;

    // Assert
    expect(bluetooth.type).toBe('checkbox');
    expect(bluetooth.checked).toBe(true);
    expect(bluetooth.labels?.[0]?.className).toBe(music.labels?.[0]?.className);
    expect(bluetooth.labels?.[0]?.textContent?.trim()).toBe('Bluetooth');
    const bluetoothGroup: HTMLElement | null = bluetooth.closest('[data-settings-group]');
    const musicGroup: HTMLElement | null = music.closest('[data-settings-group]');
    expect(bluetoothGroup).not.toBeNull();
    expect(musicGroup).not.toBeNull();
    expect(bluetoothGroup?.getAttribute('data-settings-group')).toBe('bluetooth');
    expect(musicGroup?.getAttribute('data-settings-group')).toBe('music');
    if (bluetoothGroup !== null && musicGroup !== null) {
      expect(bluetoothGroup.compareDocumentPosition(musicGroup) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(loadSettings().bluetoothEnabled).toBe(true);

    // Act
    bluetooth.checked = false;
    bluetooth.dispatchEvent(new Event('change'));

    // Assert
    expect(loadSettings().bluetoothEnabled).toBe(false);
    expect(loadSettings().musicEnabled).toBe(true);

    // Act
    root.replaceChildren();
    renderSettingsScreen(root);

    // Assert
    expect((root.querySelector('input[name="bluetoothEnabled"]') as HTMLInputElement).checked).toBe(false);
  });

  it('pauses Spotify when music is switched off', async () => {
    // Arrange
    saveSpotifyAuth({ accessToken: 'token-a', refreshToken: 'refresh-a', expiresAt: Date.now() + 3600000 });
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      if (url.endsWith('/me/player')) {
        return new Response(JSON.stringify({ device: { name: 'Typhoon' }, is_playing: true }), { status: 200 });
      }
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const root: HTMLElement = document.createElement('div');
    renderSettingsScreen(root);
    const music: HTMLInputElement = root.querySelector('input[name="musicEnabled"]') as HTMLInputElement;

    // Act
    music.checked = false;
    music.dispatchEvent(new Event('change'));
    await vi.waitFor(() => {
      expect(fetchMock.mock.calls.some((call) => call[0] === 'https://api.spotify.com/v1/me/player/pause')).toBe(true);
    });

    // Assert
    const pauseCall = fetchMock.mock.calls.find((call) => call[0] === 'https://api.spotify.com/v1/me/player/pause');
    expect(pauseCall?.[1]?.method).toBe('PUT');
    expect(loadSettings().musicEnabled).toBe(false);

    // Act
    fetchMock.mockClear();
    music.checked = true;
    music.dispatchEvent(new Event('change'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Assert
    expect(fetchMock).not.toHaveBeenCalled();
    expect(loadSettings().musicEnabled).toBe(true);
  });

  it('hides bike and FTP while Bluetooth is off and restores them with their values', () => {
    // Arrange
    saveSettings({ ...loadSettings(), bluetoothEnabled: false, ftp: 220, bikeName: 'Wattbike Atom' });
    const root: HTMLElement = document.createElement('div');
    renderSettingsScreen(root);
    const bluetooth: HTMLInputElement = root.querySelector('input[name="bluetoothEnabled"]') as HTMLInputElement;
    const body: HTMLElement = root.querySelector('[data-settings-group="bluetooth"] .settings-group-body') as HTMLElement;
    const ftp: HTMLInputElement = root.querySelector('input[name="ftp"]') as HTMLInputElement;
    const bike: HTMLInputElement = root.querySelector('input[name="bikeName"]') as HTMLInputElement;

    // Assert
    expect(bluetooth.checked).toBe(false);
    expect(bluetooth.closest('.settings-group-body')).toBeNull();
    expect(body.hidden).toBe(true);
    expect(ftp.closest('.settings-group-body')).toBe(body);
    expect(bike.closest('.settings-group-body')).toBe(body);
    expect(findButton(root, 'Save').hidden).toBe(false);

    // Act
    bluetooth.checked = true;
    bluetooth.dispatchEvent(new Event('change'));

    // Assert
    expect(body.hidden).toBe(false);
    expect(ftp.value).toBe('220');
    expect(bike.value).toBe('Wattbike Atom');
    expect(loadSettings().ftp).toBe(220);
    expect(loadSettings().bikeName).toBe('Wattbike Atom');

    // Act
    ftp.value = '240';
    bluetooth.checked = false;
    bluetooth.dispatchEvent(new Event('change'));
    bluetooth.checked = true;
    bluetooth.dispatchEvent(new Event('change'));

    // Assert
    expect(ftp.value).toBe('240');
    expect(loadSettings().ftp).toBe(220);
  });

  it('hides Spotify fields while Music is off and restores the client id', () => {
    // Arrange
    saveSettings({ ...loadSettings(), musicEnabled: false, spotifyClientId: 'client-1', spotifyPlaylistId: 'p1' });
    saveSpotifyAuth({ accessToken: 'a', refreshToken: 'r', expiresAt: Date.now() + 3600000 });
    const root: HTMLElement = document.createElement('div');
    renderSettingsScreen(root);
    const music: HTMLInputElement = root.querySelector('input[name="musicEnabled"]') as HTMLInputElement;
    const body: HTMLElement = root.querySelector('[data-settings-group="music"] .settings-group-body') as HTMLElement;
    const clientId: HTMLInputElement = root.querySelector('input[name="spotifyClientId"]') as HTMLInputElement;

    // Assert
    expect(music.checked).toBe(false);
    expect(music.closest('.settings-group-body')).toBeNull();
    expect(body.hidden).toBe(true);
    expect(clientId.closest('.settings-group-body')).toBe(body);
    expect(findButton(root, 'Disconnect Spotify').closest('.settings-group-body')).toBe(body);
    expect(findButton(root, 'Choose playlist').closest('.settings-group-body')).toBe(body);
    expect(root.querySelector('select')?.closest('.settings-group-body')).toBe(body);
    expect(root.querySelector('progress')?.closest('.settings-group-body')).toBe(body);
    expect(fillTempoCache).not.toHaveBeenCalled();
    expect(findButton(root, 'Save').hidden).toBe(false);

    // Act
    music.checked = true;
    music.dispatchEvent(new Event('change'));

    // Assert
    expect(body.hidden).toBe(false);
    expect(clientId.value).toBe('client-1');
    expect(loadSettings().spotifyClientId).toBe('client-1');
    expect(loadSettings().spotifyPlaylistId).toBe('p1');

    // Act
    clientId.value = 'typed-id';
    music.checked = false;
    music.dispatchEvent(new Event('change'));
    music.checked = true;
    music.dispatchEvent(new Event('change'));

    // Assert
    expect(clientId.value).toBe('typed-id');
    expect(loadSettings().spotifyClientId).toBe('client-1');
  });

  it('hides Connect Spotify with the other music fields when Music is off', () => {
    // Arrange
    saveSettings({ ...loadSettings(), musicEnabled: false, spotifyClientId: 'client-1' });
    const root: HTMLElement = document.createElement('div');
    renderSettingsScreen(root);
    const body: HTMLElement = root.querySelector('[data-settings-group="music"] .settings-group-body') as HTMLElement;

    // Assert
    expect(body.hidden).toBe(true);
    expect(findButton(root, 'Connect Spotify').closest('.settings-group-body')).toBe(body);
    expect(root.querySelector('input[name="spotifyClientId"]')?.closest('.settings-group-body')).toBe(body);
  });

  it('hides Save only when both Music and Bluetooth are off', () => {
    // Arrange
    saveSettings({ ...loadSettings(), musicEnabled: false, bluetoothEnabled: false, ftp: 220, spotifyClientId: 'client-1' });
    const root: HTMLElement = document.createElement('div');
    renderSettingsScreen(root);
    const save: HTMLButtonElement = findButton(root, 'Save');
    const music: HTMLInputElement = root.querySelector('input[name="musicEnabled"]') as HTMLInputElement;
    const bluetooth: HTMLInputElement = root.querySelector('input[name="bluetoothEnabled"]') as HTMLInputElement;

    // Assert
    expect(save.hidden).toBe(true);
    expect(root.querySelector('input[name="ftp"]')).not.toBeNull();
    expect(root.querySelector('input[name="spotifyClientId"]')).not.toBeNull();

    // Act
    music.checked = true;
    music.dispatchEvent(new Event('change'));

    // Assert
    expect(save.hidden).toBe(false);
    expect((root.querySelector('input[name="spotifyClientId"]') as HTMLInputElement).value).toBe('client-1');
    expect((root.querySelector('input[name="ftp"]') as HTMLInputElement).value).toBe('220');

    // Act
    music.checked = false;
    music.dispatchEvent(new Event('change'));
    bluetooth.checked = true;
    bluetooth.dispatchEvent(new Event('change'));

    // Assert
    expect(save.hidden).toBe(false);
  });

  it('runs one tempo fill across two renders', async () => {
    // Arrange
    let finishFill: () => void = (): void => {};
    vi.mocked(fillTempoCache).mockReturnValue(new Promise((resolve): void => {
      finishFill = (): void => resolve({});
    }));
    saveSettings({ ...loadSettings(), spotifyPlaylistId: 'p1' });
    saveSpotifyAuth({ accessToken: 'a', refreshToken: 'r', expiresAt: Date.now() + 3600000 });
    const root: HTMLElement = document.createElement('div');

    // Act
    renderSettingsScreen(root);
    await new Promise((resolve) => setTimeout(resolve, 0));
    renderSettingsScreen(root);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Assert
    expect(fillTempoCache).toHaveBeenCalledTimes(1);
    expect(root.querySelector('.status')?.textContent).toBe('Tempo lookup already running');
    finishFill();
  });
});
