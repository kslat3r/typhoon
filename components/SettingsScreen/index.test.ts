import { beforeEach, describe, expect, it, vi } from 'vitest';
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
