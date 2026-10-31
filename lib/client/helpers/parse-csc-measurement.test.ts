import { describe, expect, it } from 'vitest';
import parseCscMeasurement from '@/lib/client/helpers/parse-csc-measurement';

function view(bytes: number[]): DataView {
  return new DataView(new Uint8Array(bytes).buffer);
}

describe('parseCscMeasurement', () => {
  it('reads crank revolutions when wheel data is absent', () => {
    // Arrange - bit 1 crank present, revs 1000, time 2048
    const result = parseCscMeasurement(view([0x02, 0xe8, 0x03, 0x00, 0x08]));

    // Assert
    expect(result).toEqual({ crankRevolutions: 1000, crankEventTime: 2048 });
  });

  it('reads crank data after the wheel fields', () => {
    // Arrange - bits 0 and 1, 6 wheel bytes then crank
    const bytes = [0x03, 1, 0, 0, 0, 0, 0, 0xe8, 0x03, 0x00, 0x08];

    // Act
    const result = parseCscMeasurement(view(bytes));

    // Assert
    expect(result).toEqual({ crankRevolutions: 1000, crankEventTime: 2048 });
  });

  it('returns no crank data when the flag is clear', () => {
    // Arrange / Act
    const result = parseCscMeasurement(view([0x01, 1, 0, 0, 0, 0, 0]));

    // Assert
    expect(result).toEqual({ crankRevolutions: null, crankEventTime: null });
  });
});
