// FTMS Indoor Bike Data (0x2AD2). Instantaneous cadence is uint16 with a resolution of 0.5 rpm.
// A Stages SB20 sends flags 0x00c5: instantaneous speed absent, cadence, instantaneous
// power, and average power. MPH stays derived from watts either way.
export interface IndoorBikeData {
  watts: number | null;
  cadenceRpm: number | null;
}

const MORE_DATA = 1 << 0;
const AVERAGE_SPEED = 1 << 1;
const INSTANTANEOUS_CADENCE = 1 << 2;
const AVERAGE_CADENCE = 1 << 3;
const TOTAL_DISTANCE = 1 << 4;
const RESISTANCE = 1 << 5;
const INSTANTANEOUS_POWER = 1 << 6;
const AVERAGE_POWER = 1 << 7;
const EXPENDED_ENERGY = 1 << 8;
const HEART_RATE = 1 << 9;
const METABOLIC = 1 << 10;

export default function parseIndoorBikeData(view: DataView): IndoorBikeData {
  const flags: number = view.getUint16(0, true);
  let offset = 2;

  if ((flags & MORE_DATA) === 0) {
    offset += 2;
  }
  if (flags & AVERAGE_SPEED) {
    offset += 2;
  }

  let cadenceRpm: number | null = null;
  if (flags & INSTANTANEOUS_CADENCE) {
    cadenceRpm = view.getUint16(offset, true) / 2;
    offset += 2;
  }
  if (flags & AVERAGE_CADENCE) {
    offset += 2;
  }
  if (flags & TOTAL_DISTANCE) {
    offset += 3;
  }
  if (flags & RESISTANCE) {
    offset += 2;
  }

  let watts: number | null = null;
  if (flags & INSTANTANEOUS_POWER) {
    watts = view.getInt16(offset, true);
    offset += 2;
  }
  if (flags & AVERAGE_POWER) {
    offset += 2;
  }
  if (flags & EXPENDED_ENERGY) {
    offset += 5;
  }
  if (flags & HEART_RATE) {
    offset += 1;
  }
  if (flags & METABOLIC) {
    offset += 1;
  }

  return { watts, cadenceRpm };
}
