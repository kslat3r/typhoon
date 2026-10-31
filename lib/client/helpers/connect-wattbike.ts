import subscribePowerMeasurements from '@/lib/client/helpers/subscribe-power-measurements';
import type { BikeListener } from '@/lib/client/models/types';

// Any standard indoor bike. Each filter is an alternative: a device matches if it
// advertises Cycling Power (0x1818), FTMS (0x1826), or Cycling Speed and Cadence
// (0x1816). Stages crank meters on the SC3, and on an SC2 with the power-meter
// upgrade, often advertise only a name beginning with "Stages" and leave the
// service UUID out of the packet, so the name prefix is its own filter. The SB20
// advertises as "Stages Bike" plus the last four digits of the serial and speaks
// FTMS. Web Bluetooth name matching is case-sensitive. optionalServices is what
// lets a name-prefix match still open those GATT services.
export const WATTBIKE_REQUEST = {
  filters: [
    { services: ['cycling_power'] },
    { services: ['fitness_machine'] },
    { services: ['cycling_speed_and_cadence'] },
    { namePrefix: 'Stages' },
  ],
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
