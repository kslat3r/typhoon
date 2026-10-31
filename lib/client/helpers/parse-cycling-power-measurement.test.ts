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

  it('parses a Stages crank-meter packet: power plus crank revolutions only', () => {
    // Arrange - flags bit 5 (0x0020). This is the Cycling Power Measurement a
    // Stages SC3, or an SC2 with the power meter, sends. Cadence is not a
    // separate field; it is derived from the crank counter and the 1/1024 s event time.
    const bytes = [0x20, 0x00, 0xfa, 0x00, 0x00, 0x02, 0x00, 0x08];

    // Act
    const result = parseCyclingPowerMeasurement(new DataView(new Uint8Array(bytes).buffer));

    // Assert
    expect(result).toEqual({ watts: 250, crankRevolutions: 512, crankEventTime: 2048 });
  });

  it('does not let the balance-reference flag insert a byte before the crank fields', () => {
    // Arrange - bit 0 balance present, bit 1 balance reference (no extra field), bit 5 crank
    const bytes = [0x23, 0x00, 0x64, 0x00, 0x32, 0xe8, 0x03, 0x00, 0x08];

    // Act
    const result = parseCyclingPowerMeasurement(new DataView(new Uint8Array(bytes).buffer));

    // Assert
    expect(result).toEqual({ watts: 100, crankRevolutions: 1000, crankEventTime: 2048 });
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
