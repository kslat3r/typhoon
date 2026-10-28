import { describe, expect, it } from 'vitest';
import calculateFtp from '@/lib/client/helpers/calculate-ftp';

describe('calculateFtp', () => {
  it('calculates FTP from the test factor', () => {
    // Arrange / Act / Assert
    expect(calculateFtp(215, 60)).toBe(151);
    expect(calculateFtp(187, 180)).toBe(150);
    expect(calculateFtp(177, 300)).toBe(150);
    expect(calculateFtp(158, 1200)).toBe(150);
  });
});
