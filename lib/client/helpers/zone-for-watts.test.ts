import { describe, expect, it } from 'vitest';
import zoneForWatts from '@/lib/client/helpers/zone-for-watts';
import { ZONES } from '@/lib/client/models/zones';

describe('ZONES', () => {
  it('uses the Coggan ranges the Cyclone colours follow', () => {
    expect(ZONES.map((zone) => [zone.zone, zone.minPercent, zone.maxPercent, zone.name])).toEqual([
      [1, 0, 55, 'Recover'],
      [2, 56, 75, 'Endurance'],
      [3, 76, 90, 'Tempo'],
      [4, 91, 105, 'Threshold'],
      [5, 106, 120, 'VO2'],
      [6, 121, 150, 'Anaerobic'],
      [7, 151, Infinity, 'Sprint'],
    ]);
  });
});

describe('zoneForWatts', () => {
  it('maps watts to the Coggan zone that contains that percent of FTP', () => {
    const ftp = 150;

    expect(zoneForWatts(0, ftp)).toBe(1);
    expect(zoneForWatts(82, ftp)).toBe(1); // 54.7%
    expect(zoneForWatts(82.5, ftp)).toBe(1); // 55%
    expect(zoneForWatts(84, ftp)).toBe(2); // 56%
    expect(zoneForWatts(112.5, ftp)).toBe(2); // 75%
    expect(zoneForWatts(114, ftp)).toBe(3); // 76%
    expect(zoneForWatts(135, ftp)).toBe(3); // 90%
    expect(zoneForWatts(136.5, ftp)).toBe(4); // 91%
    expect(zoneForWatts(150, ftp)).toBe(4); // 100%
    expect(zoneForWatts(157.5, ftp)).toBe(4); // 105%
    expect(zoneForWatts(159, ftp)).toBe(5); // 106%
    expect(zoneForWatts(165, ftp)).toBe(5); // 110%
    expect(zoneForWatts(180, ftp)).toBe(5); // 120%
    expect(zoneForWatts(181.5, ftp)).toBe(6); // 121%
    expect(zoneForWatts(195, ftp)).toBe(6); // 130%
    expect(zoneForWatts(225, ftp)).toBe(6); // 150%
    expect(zoneForWatts(226.5, ftp)).toBe(7); // 151%
    expect(zoneForWatts(227, ftp)).toBe(7); // 151.3%
  });
});
