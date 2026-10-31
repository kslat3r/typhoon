import subscribePowerMeasurements from '@/lib/client/helpers/subscribe-power-measurements';
import type { BikeListener } from '@/lib/client/models/types';

export const WATTBIKE_REQUEST = {
  filters: [{ services: ['cycling_power'] }, { services: ['fitness_machine'] }],
  optionalServices: ['cycling_power', 'fitness_machine', 'cycling_speed_and_cadence'],
} as const satisfies RequestDeviceOptions;

export default async function connectWattbike(
  onSample: BikeListener,
  onDisconnect: () => void,
): Promise<BluetoothDevice> {
  if (navigator.bluetooth === undefined) {
    throw new Error('Web Bluetooth is not available in this browser');
  }

  let device: BluetoothDevice;
  try {
    device = await navigator.bluetooth.requestDevice(WATTBIKE_REQUEST);
  } catch (pickerError) {
    const message: string = pickerError instanceof Error ? pickerError.message : String(pickerError);
    throw new Error('Bluetooth picker failed: ' + message, { cause: pickerError });
  }

  if (!device.gatt) {
    throw new Error('GATT connect failed: device has no GATT server');
  }

  device.addEventListener('gattserverdisconnected', onDisconnect);

  let server: BluetoothRemoteGATTServer;
  try {
    server = await device.gatt.connect();
  } catch {
    throw new Error('GATT connect failed');
  }

  try {
    await subscribePowerMeasurements(server, onSample);
  } catch {
    device.removeEventListener('gattserverdisconnected', onDisconnect);
    server.disconnect();
    throw new Error('Notifications failed');
  }

  return device;
}
