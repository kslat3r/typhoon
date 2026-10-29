import { describe, expect, it } from 'vitest';
import zoneForWatts from '@/lib/client/helpers/zone-for-watts';

describe('zoneForWatts', () => {
  it('maps watts to zones by percent of FTP', () => {
    // Arrange
    const ftp: number = 150;

    // Act / Assert
    expect(zoneForWatts(0, ftp)).toBe(2);
    expect(zoneForWatts(82, ftp)).toBe(2); // 54.7%
    expect(zoneForWatts(84, ftp)).toBe(3); // 56%
    expect(zoneForWatts(135, ftp)).toBe(4); // 90%
    expect(zoneForWatts(150, ftp)).toBe(5); // 100%
    expect(zoneForWatts(180, ftp)).toBe(6); // 120%
    expect(zoneForWatts(182, ftp)).toBe(7); // 121.3%
    expect(zoneForWatts(300, ftp)).toBe(7); // 200%
  });
});
