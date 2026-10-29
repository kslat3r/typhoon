import { describe, expect, it } from 'vitest';
import buildFtpTestRide from '@/lib/client/helpers/build-ftp-test-ride';
import type { Ride } from '@/lib/client/models/types';

describe('buildFtpTestRide', () => {
  it('builds a warm-up, build, zone 4 test and cool-down', () => {
    // Arrange
    const testSeconds = 180 as const;

    // Act
    const ride: Ride = buildFtpTestRide(testSeconds);

    // Assert
    expect(ride.intervals).toEqual([
      { zone: 2, seconds: 90 },
      { zone: 3, seconds: 150 },
      { zone: 4, seconds: 180 },
      { zone: 2, seconds: 180 },
    ]);
    expect(ride.ftpTestSeconds).toBe(180);
    expect(ride.lengthSeconds).toBe(600);
  });

  it.each([60, 180, 300] as const)('names and labels the %i s test', (testSeconds) => {
    // Arrange / Act
    const ride: Ride = buildFtpTestRide(testSeconds);

    // Assert
    expect(ride.name).toBe(`FTP test (${testSeconds / 60} min)`);
    expect(ride.difficulty).toBe(3);
    expect(ride.archetype).toBe('ftp-test');
    expect(ride.ftpTestSeconds).toBe(testSeconds);
    expect(ride.intervals[2]).toEqual({ zone: 4, seconds: testSeconds });
    expect(ride.lengthSeconds).toBe(420 + testSeconds);
  });
});
