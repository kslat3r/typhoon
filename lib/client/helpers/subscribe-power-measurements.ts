import cadenceFromCrankSamples from '@/lib/client/helpers/cadence-from-crank-samples';
import parseCyclingPowerMeasurement from '@/lib/client/helpers/parse-cycling-power-measurement';
import type { BikeListener, PowerMeasurement } from '@/lib/client/models/types';

const MAX_CADENCE_RPM = 250;

export default async function subscribePowerMeasurements(
  server: BluetoothRemoteGATTServer,
  onSample: BikeListener,
): Promise<void> {
  let service: BluetoothRemoteGATTService;
  try {
    service = await server.getPrimaryService('cycling_power');
  } catch {
    throw new Error('Notifications failed: cycling power service not found');
  }

  let characteristic: BluetoothRemoteGATTCharacteristic;
  try {
    characteristic = await service.getCharacteristic('cycling_power_measurement');
  } catch {
    throw new Error('Notifications failed: power measurement characteristic not found');
  }

  let previous: PowerMeasurement | null = null;

  const handleValueChanged = (event: Event): void => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (!target.value) {
      return;
    }

    let current: PowerMeasurement;
    try {
      current = parseCyclingPowerMeasurement(target.value);
    } catch {
      // A truncated notification is dropped.
      return;
    }

    let rpm: number | null = null;
    if (previous !== null) {
      rpm = cadenceFromCrankSamples(previous, current);
    }
    if (rpm !== null && rpm > MAX_CADENCE_RPM) {
      rpm = null;
    }
    previous = current;

    onSample({ watts: current.watts, rpm, receivedAt: performance.now() });
  };

  const handleDisconnected = (): void => {
    characteristic.removeEventListener('characteristicvaluechanged', handleValueChanged);
    server.device.removeEventListener('gattserverdisconnected', handleDisconnected);
  };

  characteristic.addEventListener('characteristicvaluechanged', handleValueChanged);
  server.device.addEventListener('gattserverdisconnected', handleDisconnected);

  try {
    await characteristic.startNotifications();
  } catch {
    handleDisconnected();
    throw new Error('Notifications failed');
  }
}
