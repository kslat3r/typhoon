import parseCscMeasurement from '@/lib/client/helpers/parse-csc-measurement';
import parseCyclingPowerMeasurement from '@/lib/client/helpers/parse-cycling-power-measurement';
import parseIndoorBikeData from '@/lib/client/helpers/parse-indoor-bike-data';
import { emptyCrankCadenceState, preferCadence, updateCrankCadence, type CrankCadenceState } from '@/lib/client/helpers/resolve-cadence';
import type { BikeListener, PowerMeasurement } from '@/lib/client/models/types';

// Wattbike power notifications usually carry watts only. The bike's own cadence
// readout comes from FTMS indoor-bike data, or from CSC / cycling-power crank
// revolutions when that flag is actually set.
export default async function subscribePowerMeasurements(
  server: BluetoothRemoteGATTServer,
  onSample: BikeListener,
): Promise<void> {
  const crank: CrankCadenceState = emptyCrankCadenceState();
  let watts: number | null = null;
  let ftmsRpm: number | null = null;
  let ftmsAt = 0;
  let cyclingPowerHasCrank = false;

  const emit = (now: number): void => {
    if (watts === null) {
      return;
    }
    onSample({ watts, rpm: preferCadence(ftmsRpm, ftmsAt, crank.rpm, now), receivedAt: now });
  };

  const listen = async (
    serviceName: BluetoothServiceUUID,
    characteristicName: BluetoothCharacteristicUUID,
    onValue: (view: DataView) => void,
  ): Promise<boolean> => {
    try {
      const service: BluetoothRemoteGATTService = await server.getPrimaryService(serviceName);
      const characteristic: BluetoothRemoteGATTCharacteristic = await service.getCharacteristic(characteristicName);
      const handleValueChanged = (event: Event): void => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        if (!target.value) {
          return;
        }
        try {
          onValue(target.value);
        } catch {
          // A truncated notification is dropped.
        }
      };
      const handleDisconnected = (): void => {
        characteristic.removeEventListener('characteristicvaluechanged', handleValueChanged);
      };
      characteristic.addEventListener('characteristicvaluechanged', handleValueChanged);
      server.device.addEventListener('gattserverdisconnected', handleDisconnected, { once: true });
      await characteristic.startNotifications();
      return true;
    } catch {
      return false;
    }
  };

  const cyclingPower: boolean = await listen('cycling_power', 'cycling_power_measurement', (view: DataView): void => {
    const current: PowerMeasurement = parseCyclingPowerMeasurement(view);
    const now: number = performance.now();
    watts = current.watts;
    if (current.crankRevolutions !== null) {
      cyclingPowerHasCrank = true;
      updateCrankCadence(crank, current, now);
    }
    emit(now);
  });

  const indoorBike: boolean = await listen('fitness_machine', 'indoor_bike_data', (view: DataView): void => {
    const reading = parseIndoorBikeData(view);
    const now: number = performance.now();
    if (reading.watts !== null) {
      watts = reading.watts;
    }
    if (reading.cadenceRpm !== null) {
      ftmsRpm = reading.cadenceRpm;
      ftmsAt = now;
    }
    emit(now);
  });

  await listen('cycling_speed_and_cadence', 'csc_measurement', (view: DataView): void => {
    if (cyclingPowerHasCrank) {
      return;
    }
    const reading = parseCscMeasurement(view);
    if (reading.crankRevolutions === null || reading.crankEventTime === null) {
      return;
    }
    const now: number = performance.now();
    updateCrankCadence(crank, { watts: watts ?? 0, crankRevolutions: reading.crankRevolutions, crankEventTime: reading.crankEventTime }, now);
    emit(now);
  });

  if (!cyclingPower && !indoorBike) {
    throw new Error('Notifications failed');
  }
}
