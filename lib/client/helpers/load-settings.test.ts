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
  });

  it('leaves music on unless it was saved off', () => {
    // Arrange / Act
    const fresh = loadSettings();

    // Assert
    expect(fresh.musicEnabled).toBe(true);

    // Arrange
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ ftp: 200 }));

    // Act / Assert
    expect(loadSettings().musicEnabled).toBe(true);

    // Arrange
    saveSettings({ ...loadSettings(), musicEnabled: false });

    // Act / Assert
    expect(loadSettings().musicEnabled).toBe(false);
  });

  it('returns saved values after saveSettings', () => {
    // Arrange
    const saved = { ftp: 220, spotifyClientId: 'a', spotifyPlaylistId: 'b', bikeName: 'Wattbike', musicEnabled: true };
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
    expect(settings.ftp).toBe(200);
    expect(settings.spotifyClientId).toBe('');
  });

  it('returns defaults on corrupt JSON', () => {
    // Arrange
    localStorage.setItem(STORAGE_KEYS.settings, '{not json');

    // Act
    const settings = loadSettings();

    // Assert
    expect(settings.ftp).toBe(150);
  });
});
