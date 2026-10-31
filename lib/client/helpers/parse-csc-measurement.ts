// Cycling Speed and Cadence measurement. Crank event time is 1/1024 s, same as cycling power.
export interface CscCrankData {
  crankRevolutions: number | null;
  crankEventTime: number | null;
}

const WHEEL_DATA = 1 << 0;
const CRANK_DATA = 1 << 1;

export default function parseCscMeasurement(view: DataView): CscCrankData {
  const flags: number = view.getUint8(0);
  let offset = 1;

  if (flags & WHEEL_DATA) {
    offset += 6;
  }

  if (!(flags & CRANK_DATA)) {
    return { crankRevolutions: null, crankEventTime: null };
  }

  return {
    crankRevolutions: view.getUint16(offset, true),
    crankEventTime: view.getUint16(offset + 2, true),
  };
}
