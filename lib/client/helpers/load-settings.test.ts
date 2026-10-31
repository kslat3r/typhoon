import { beforeEach, describe, expect, it } from 'vitest';
import loadSettings from '@/lib/client/helpers/load-settings';
import saveSettings from '@/lib/client/helpers/save-settings';
import { STORAGE_KEYS } from '@/lib/client/models/storage-keys';

describe('loadSettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns the 150 default on empty storage', () => {
    // Arrange / Act
    const settings = loadSettings();

    // Assert
    expect(settings.ftp).toBe(150);
    expect(settings.bikeName).toBe('');
    expect(settings.bluetoothEnabled).toBe(true);
  });

  it('leaves Bluetooth on unless it was saved off', () => {
    // Arrange
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ ftp: 200 }));

    // Act / Assert
    expect(loadSettings().bluetoothEnabled).toBe(true);

    // Arrange
    saveSettings({ ...loadSettings(), bluetoothEnabled: false });

    // Act / Assert
    expect(loadSettings().bluetoothEnabled).toBe(false);
    expect(loadSettings().ftp).toBe(200);
  });

  it('returns saved values after saveSettings', () => {
    // Arrange
    const saved = {
      ftp: 220,
      bikeName: 'Wattbike',
      bluetoothEnabled: true,
    };
    saveSettings(saved);

    // Act
    const settings = loadSettings();

    // Assert
    expect(settings).toEqual(saved);
  });

  it('fills missing fields from the defaults', () => {
    // Arrange
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ ftp: 200 }));

    // Act
    const settings = loadSettings();

    // Assert
    expect(settings).toEqual({ ftp: 200, bikeName: '', bluetoothEnabled: true });
  });

  it('ignores leftover music fields from an older settings blob', () => {
    // Arrange
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({
        ftp: 210,
        bikeName: 'Wattbike Atom',
        bluetoothEnabled: false,
        spotifyClientId: 'client-1',
        spotifyPlaylistId: 'playlist',
        musicEnabled: true,
        unknown: 'keep-me-out',
      }),
    );
    localStorage.setItem('typhoon.spotifyAuth.v2', JSON.stringify({ accessToken: 'token' }));
    localStorage.setItem('typhoon.tempoCache', JSON.stringify({ trackA: 120 }));

    // Act
    const settings = loadSettings();

    // Assert
    expect(settings).toEqual({ ftp: 210, bikeName: 'Wattbike Atom', bluetoothEnabled: false });
    expect(JSON.stringify(settings)).not.toContain('spotify');
    expect(localStorage.getItem('typhoon.spotifyAuth.v2')).toContain('token');
    expect(localStorage.getItem('typhoon.tempoCache')).toContain('trackA');
  });

  it('returns defaults on corrupt JSON', () => {
    // Arrange
    localStorage.setItem(STORAGE_KEYS.settings, '{not json');

    // Act
    const settings = loadSettings();

    // Assert
    expect(settings.ftp).toBe(150);
  });

  it('returns defaults when the stored value is not an object', () => {
    // Arrange
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(['ftp']));

    // Act
    const settings = loadSettings();

    // Assert
    expect(settings).toEqual({ ftp: 150, bikeName: '', bluetoothEnabled: true });
  });
});
