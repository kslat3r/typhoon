import { beforeEach, describe, expect, it } from 'vitest';
import renderSettingsScreen from '@/components/SettingsScreen';
import loadSettings from '@/lib/client/helpers/load-settings';
import saveSettings from '@/lib/client/helpers/save-settings';
import { STORAGE_KEYS } from '@/lib/client/models/storage-keys';

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

  it('saves the Bluetooth toggle and keeps it across a reload', () => {
    // Arrange
    const root: HTMLElement = document.createElement('div');
    renderSettingsScreen(root);
    const bluetooth: HTMLInputElement = root.querySelector('input[name="bluetoothEnabled"]') as HTMLInputElement;

    // Assert
    expect(bluetooth.type).toBe('checkbox');
    expect(bluetooth.checked).toBe(true);
    expect(bluetooth.labels?.[0]?.textContent?.trim()).toBe('Bluetooth');
    expect(bluetooth.closest('[data-settings-group]')?.getAttribute('data-settings-group')).toBe('bluetooth');
    expect(root.querySelector('[data-settings-group="music"]')).toBeNull();
    expect(loadSettings().bluetoothEnabled).toBe(true);

    // Act
    bluetooth.checked = false;
    bluetooth.dispatchEvent(new Event('change'));

    // Assert
    expect(loadSettings().bluetoothEnabled).toBe(false);

    // Act
    root.replaceChildren();
    renderSettingsScreen(root);

    // Assert
    expect((root.querySelector('input[name="bluetoothEnabled"]') as HTMLInputElement).checked).toBe(false);
  });

  it('nests FTP and the bike under Bluetooth', () => {
    // Arrange
    saveSettings({ ...loadSettings(), ftp: 220, bikeName: 'Wattbike Atom' });
    const root: HTMLElement = document.createElement('div');
    renderSettingsScreen(root);
    const bluetooth: HTMLElement = root.querySelector('input[name="bluetoothEnabled"]') as HTMLElement;
    const ftp: HTMLElement = root.querySelector('input[name="ftp"]') as HTMLElement;
    const bike: HTMLElement = root.querySelector('input[name="bikeName"]') as HTMLElement;
    const follows = (earlier: Node, later: Node): boolean =>
      (earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

    // Assert
    expect(follows(bluetooth, ftp)).toBe(true);
    expect(follows(ftp, bike)).toBe(true);
    expect(ftp.closest('[data-settings-group="bluetooth"] .settings-group-body')).not.toBeNull();
    expect(bike.closest('[data-settings-group="bluetooth"] .settings-group-body')).not.toBeNull();
    expect(bluetooth.closest('.settings-group-body')).toBeNull();
    expect(root.querySelector('input[name="musicEnabled"]')).toBeNull();
    expect(root.querySelector('input[name="spotifyClientId"]')).toBeNull();
    expect(root.textContent).not.toMatch(/Spotify|Music|playlist/i);
  });

  it('hides bike, FTP, and Save while Bluetooth is off and restores them with their values', () => {
    // Arrange
    saveSettings({ ...loadSettings(), bluetoothEnabled: false, ftp: 220, bikeName: 'Wattbike Atom' });
    const root: HTMLElement = document.createElement('div');
    renderSettingsScreen(root);
    const bluetooth: HTMLInputElement = root.querySelector('input[name="bluetoothEnabled"]') as HTMLInputElement;
    const body: HTMLElement = root.querySelector('[data-settings-group="bluetooth"] .settings-group-body') as HTMLElement;
    const ftp: HTMLInputElement = root.querySelector('input[name="ftp"]') as HTMLInputElement;
    const bike: HTMLInputElement = root.querySelector('input[name="bikeName"]') as HTMLInputElement;
    const save: HTMLButtonElement = findButton(root, 'Save');

    // Assert
    expect(bluetooth.checked).toBe(false);
    expect(bluetooth.closest('.settings-group-body')).toBeNull();
    expect(body.hidden).toBe(true);
    expect(ftp.closest('.settings-group-body')).toBe(body);
    expect(bike.closest('.settings-group-body')).toBe(body);
    expect(save.hidden).toBe(true);

    // Act
    bluetooth.checked = true;
    bluetooth.dispatchEvent(new Event('change'));

    // Assert
    expect(body.hidden).toBe(false);
    expect(save.hidden).toBe(false);
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
    expect(save.hidden).toBe(false);
  });

  it('renders FTP and Bluetooth when an older settings blob still carries music fields', () => {
    // Arrange
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({
        ftp: 205,
        bikeName: 'WattbikePM1',
        bluetoothEnabled: true,
        musicEnabled: true,
        spotifyClientId: 'client-1',
        spotifyPlaylistId: 'playlist',
      }),
    );
    const root: HTMLElement = document.createElement('div');

    // Act
    renderSettingsScreen(root);

    // Assert
    expect((root.querySelector('input[name="ftp"]') as HTMLInputElement).value).toBe('205');
    expect((root.querySelector('input[name="bikeName"]') as HTMLInputElement).value).toBe('WattbikePM1');
    expect((root.querySelector('input[name="bluetoothEnabled"]') as HTMLInputElement).checked).toBe(true);
    expect(root.querySelector('input[name="musicEnabled"]')).toBeNull();
    expect(root.querySelector('input[name="spotifyClientId"]')).toBeNull();
    expect(root.querySelector('select')).toBeNull();
    expect(root.textContent).not.toMatch(/Spotify|Music|playlist|client ID/i);
  });
});
