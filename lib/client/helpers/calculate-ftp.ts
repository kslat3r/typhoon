import { FTP_TEST_FACTORS } from '@/lib/client/models/ftp-test-factors';

export default function calculateFtp(averageWatts: number, testSeconds: 60 | 180 | 300 | 1200): number {
  return Math.round(averageWatts * FTP_TEST_FACTORS[testSeconds]);
}
