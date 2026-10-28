import type { PowerMeasurement } from '@/lib/client/models/types';

const PEDAL_BALANCE_FLAG = 1 << 0;
const ACCUMULATED_TORQUE_FLAG = 1 << 2;
const WHEEL_DATA_FLAG = 1 << 4;
const CRANK_DATA_FLAG = 1 << 5;

export default function parseCyclingPowerMeasurement(view: DataView): PowerMeasurement {
  const flags = view.getUint16(0, true);
  const watts = view.getInt16(2, true);
  let offset = 4;

  if (flags & PEDAL_BALANCE_FLAG) {
    offset += 1;
  }

  if (flags & ACCUMULATED_TORQUE_FLAG) {
    offset += 2;
  }

  if (flags & WHEEL_DATA_FLAG) {
    offset += 6;
  }

  if (!(flags & CRANK_DATA_FLAG)) {
    return { watts, crankRevolutions: null, crankEventTime: null };
  }

  return {
    watts,
    crankRevolutions: view.getUint16(offset, true),
    crankEventTime: view.getUint16(offset + 2, true),
  };
}
