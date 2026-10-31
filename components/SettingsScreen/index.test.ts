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
    expect(bluetooth.labels?.[0]?.nextElementSibling).toBe(music.labels?.[0]);
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
