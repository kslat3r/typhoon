import loadSettings from '@/lib/client/helpers/load-settings';
import saveSettings from '@/lib/client/helpers/save-settings';
import type { Settings } from '@/lib/client/models/types';

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

function buildButton(label: string, onClick: () => void): HTMLButtonElement {
  const button: HTMLButtonElement = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

export default function renderSettingsScreen(root: HTMLElement): void {
  const settings: Settings = loadSettings();

  const heading: HTMLHeadingElement = document.createElement('h1');
  heading.textContent = 'Settings';

  const back: HTMLAnchorElement = document.createElement('a');
  back.href = '#/';
  back.textContent = 'Back';

  const status: HTMLParagraphElement = document.createElement('p');
  status.className = 'status';

  const ftpField: HTMLLabelElement = buildField('FTP (watts)', 'ftp', 'number', String(settings.ftp));
  (ftpField.querySelector('input') as HTMLInputElement).min = '1';
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
    });
    status.textContent = 'Saved';
  };

  const form: HTMLFormElement = document.createElement('form');
  form.className = 'settings';
  form.addEventListener('submit', (event: Event): void => {
    event.preventDefault();
  });

  const bluetoothBody: HTMLElement = document.createElement('div');
  bluetoothBody.className = 'settings-group-body';
  bluetoothBody.append(ftpField, bikeField);

  const saveButton: HTMLButtonElement = buildButton('Save', save);

  const syncPanels = (): void => {
    const current: Settings = loadSettings();
    bluetoothBody.hidden = !current.bluetoothEnabled;
    saveButton.hidden = !current.bluetoothEnabled;
  };

  const bluetoothToggle: HTMLLabelElement = buildSwitch('Bluetooth', 'bluetoothEnabled', settings.bluetoothEnabled, (enabled: boolean): void => {
    saveSettings({ ...loadSettings(), bluetoothEnabled: enabled });
    syncPanels();
  });

  const bluetoothGroup: HTMLElement = document.createElement('section');
  bluetoothGroup.className = 'settings-group';
  bluetoothGroup.dataset.settingsGroup = 'bluetooth';
  bluetoothGroup.append(bluetoothToggle, bluetoothBody);

  form.append(bluetoothGroup, saveButton);
  syncPanels();

  const screen: HTMLElement = document.createElement('div');
  screen.className = 'settings-screen';
  back.className = 'settings-back';
  screen.append(heading, form, status, back);
  root.replaceChildren(screen);
}
