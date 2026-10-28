import { beforeEach, describe, expect, it } from 'vitest';
import renderSettingsScreen from '@/components/SettingsScreen';
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

  it('renders the GetSongBPM attribution link', () => {
    // Arrange
    const root: HTMLElement = document.createElement('div');

    // Act
    renderSettingsScreen(root);

    // Assert
    expect(root.querySelector('a[href="https://getsongbpm.com"]')).not.toBeNull();
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
});
