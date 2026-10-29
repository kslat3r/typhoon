import type { Ride, RideInterval } from '@/lib/client/models/types';

export default function buildFtpTestRide(testSeconds: 60 | 180 | 300): Ride {
  const intervals: RideInterval[] = [
    { zone: 2, seconds: 90 },
    { zone: 3, seconds: 150 },
    { zone: 4, seconds: testSeconds },
    { zone: 2, seconds: 180 },
  ];
  const lengthSeconds: number = intervals.reduce((sum: number, interval: RideInterval) => sum + interval.seconds, 0);

  return {
    id: `ftp-test-${testSeconds}`,
    name: `FTP test (${testSeconds / 60} min)`,
    lengthSeconds,
    difficulty: 3,
    archetype: 'ftp-test',
    intervals,
    ftpTestSeconds: testSeconds,
  };
}
