import subscribePowerMeasurements from '@/lib/client/helpers/subscribe-power-measurements';
import type { BikeListener } from '@/lib/client/models/types';

export default async function reconnectWattbike(
  device: BluetoothDevice,
  onSample: BikeListener,
  onDisconnect: () => void,
): Promise<void> {
  if (!device.gatt) {
    throw new Error('GATT connect failed: device has no GATT server');
  }

  device.addEventListener('gattserverdisconnected', onDisconnect, { once: true });

  let server: BluetoothRemoteGATTServer;
  try {
    server = await device.gatt.connect();
  } catch {
    throw new Error('GATT connect failed');
  }

  await subscribePowerMeasurements(server, onSample);
}
