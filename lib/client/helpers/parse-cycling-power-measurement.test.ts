import { describe, expect, it } from 'vitest';
import parseCyclingPowerMeasurement from '@/lib/client/helpers/parse-cycling-power-measurement';

describe('parseCyclingPowerMeasurement', () => {
  it('parses instantaneous power with no optional fields', () => {
    // Arrange
    const view = new DataView(new Uint8Array([0x00, 0x00, 0xe7, 0x00]).buffer);

    // Act
    const result = parseCyclingPowerMeasurement(view);

    // Assert
    expect(result).toEqual({ watts: 231, crankRevolutions: null, crankEventTime: null });
  });

  it('parses crank data after the pedal balance and wheel fields', () => {
    // Arrange - flags: balance present (bit 0), wheel data (bit 4), crank data (bit 5) = 0x31
    const bytes = [0x31, 0x00, 0xe7, 0x00, 0x64, /* wheel */ 1, 0, 0, 0, 0, 0, /* crank revs 1000 */ 0xe8, 0x03, /* time 2048 */ 0x00, 0x08];

    // Act
    const result = parseCyclingPowerMeasurement(new DataView(new Uint8Array(bytes).buffer));

    // Assert
    expect(result).toEqual({ watts: 231, crankRevolutions: 1000, crankEventTime: 2048 });
  });
});
