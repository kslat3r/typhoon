import { describe, expect, it } from 'vitest';
import parseIndoorBikeData from '@/lib/client/helpers/parse-indoor-bike-data';

function view(bytes: number[]): DataView {
  return new DataView(new Uint8Array(bytes).buffer);
}

describe('parseIndoorBikeData', () => {
  it('reads instantaneous cadence in half-rpm units and power', () => {
    // Arrange - speed present, cadence present (bit 2), power present (bit 6)
    // speed 3000 = 30.00 km/h, cadence 181 = 90.5 rpm, power 240 W
    const flags = (1 << 2) | (1 << 6);

    // Act
    const result = parseIndoorBikeData(view([flags, 0x00, 0xb8, 0x0b, 0xb5, 0x00, 0xf0, 0x00]));

    // Assert
    expect(result.cadenceRpm).toBe(90.5);
    expect(result.watts).toBe(240);
  });

  it('skips speed when the more-data flag is set and ignores a packet with no cadence', () => {
    // Arrange - bit 0 set means instantaneous speed is absent, bit 6 power
    const flags = (1 << 0) | (1 << 6);

    // Act
    const result = parseIndoorBikeData(view([flags, 0x00, 0x2c, 0x01]));

    // Assert
    expect(result).toEqual({ watts: 300, cadenceRpm: null });
  });
});
