import { STORAGE_KEYS } from '@/lib/client/models/storage-keys';
import type { Settings } from '@/lib/client/models/types';

export default function loadSettings(): Settings {
  const defaults: Settings = {
    ftp: 150,
    bikeName: '',
    bluetoothEnabled: true,
  };
  const raw = localStorage.getItem(STORAGE_KEYS.settings);
  if (raw === null) {
    return defaults;
  }
  try {
    const stored: unknown = JSON.parse(raw);
    if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) {
      return defaults;
    }
    const record = stored as Record<string, unknown>;
    const ftp: number = typeof record.ftp === 'number' && Number.isFinite(record.ftp) && record.ftp > 0 ? record.ftp : defaults.ftp;
    const bikeName: string = typeof record.bikeName === 'string' ? record.bikeName : defaults.bikeName;
    const bluetoothEnabled: boolean = typeof record.bluetoothEnabled === 'boolean' ? record.bluetoothEnabled : defaults.bluetoothEnabled;
    return { ftp, bikeName, bluetoothEnabled };
  } catch {
    return defaults;
  }
}
