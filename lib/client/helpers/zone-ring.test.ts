import { describe, expect, it } from 'vitest';
import { ZONES } from '@/lib/client/models/zones';
import {
  ZONE_BAR_GAP,
  ZONE_RING_MAX_PERCENT,
  ZONE_RING_MIN_PERCENT,
  ZONE_RING_TOP_PERCENT,
  zoneBarBands,
  zoneBarFraction,
  zoneChipText,
  zoneRingFill,
  zoneRingSegments,
  zoneTargetLabel,
} from '@/lib/client/helpers/zone-ring';

describe('zoneRingSegments', () => {
  it('sizes each segment by its percent-of-FTP span and caps zone 7 at 170', () => {
    const segments = zoneRingSegments();
    const sprint = segments[6];

    expect(segments.map((segment) => segment.endPercent - segment.startPercent)).toEqual([36, 20, 15, 15, 15, 30, 19]);
    expect(segments.reduce((sum, segment) => sum + (segment.endPercent - segment.startPercent), 0)).toBe(
      ZONE_RING_MAX_PERCENT - ZONE_RING_MIN_PERCENT,
    );
    expect(segments.map((segment) => segment.colour)).toEqual(ZONES.map((zone) => zone.colour));
    expect(ZONES[0].minPercent).toBe(0);
    expect(ZONES[0].maxPercent).toBe(55);
    expect(ZONE_RING_MIN_PERCENT).toBe(20);
    expect(segments[0].startPercent).toBe(20);
    expect(segments[0].endPercent).toBe(56);
    expect(segments[0].colour).toBe('#3b8bff');
    expect(ZONE_RING_MAX_PERCENT).toBe(170);
    expect(sprint.startPercent).toBe(151);
    expect(sprint.endPercent).toBe(170);
    expect(sprint.colour).toBe('#b45cff');
    expect((sprint.endPercent - 150) / ZONE_RING_MAX_PERCENT).toBeCloseTo(20 / 170);
  });
});

describe('zoneRingFill', () => {
  it('maps the percent onto the Coggan colour', () => {
    expect(zoneRingFill(0)).toBe('#3b8bff');
    expect(zoneRingFill(40)).toBe('#3b8bff');
    expect(zoneRingFill(55)).toBe('#3b8bff');
    expect(zoneRingFill(56)).toBe('#2fd18b');
    expect(zoneRingFill(65)).toBe('#2fd18b');
    expect(zoneRingFill(75)).toBe('#2fd18b');
    expect(zoneRingFill(83)).toBe('#ffd23f');
    expect(zoneRingFill(98)).toBe('#ff8a1f');
    expect(zoneRingFill(100)).toBe('#ff8a1f');
    expect(zoneRingFill(113)).toBe('#ff3b4e');
    expect(zoneRingFill(135)).toBe('#b0122c');
    expect(zoneRingFill(150)).toBe('#b0122c');
    expect(zoneRingFill(160)).toBe('#b45cff');
    expect(zoneRingFill(200)).toBe('#b45cff');
  });
});

describe('zoneChipText', () => {
  it('picks the text colour with more contrast on each solid zone colour', () => {
    expect(zoneChipText(40)).toBe('#0f1219');
    expect(zoneChipText(65)).toBe('#0f1219');
    expect(zoneChipText(83)).toBe('#0f1219');
    expect(zoneChipText(100)).toBe('#0f1219');
    expect(zoneChipText(113)).toBe('#0f1219');
    expect(zoneChipText(135)).toBe('#ffffff');
    expect(zoneChipText(160)).toBe('#0f1219');
  });
});

describe('zoneTargetLabel', () => {
  it('prints the top of the target zone, and an open end for zone 7', () => {
    expect(zoneTargetLabel(1)).toBe('55%');
    expect(zoneTargetLabel(2)).toBe('75%');
    expect(zoneTargetLabel(4)).toBe('105%');
    expect(zoneTargetLabel(6)).toBe('150%');
    expect(zoneTargetLabel(7)).toBe('150%+');
  });
});

describe('zoneBarFraction', () => {
  it('puts 20% at the bottom, the orange midpoint in the middle, and clamps at 170', () => {
    expect(ZONE_RING_TOP_PERCENT).toBe(98);
    expect(zoneBarFraction(0)).toBe(0);
    expect(zoneBarFraction(10)).toBe(0);
    expect(zoneBarFraction(20)).toBe(0);
    expect(zoneBarFraction(40)).toBeGreaterThan(0);
    expect(zoneBarFraction(40)).toBeLessThan(zoneBarFraction(ZONE_RING_TOP_PERCENT));
    expect(zoneBarFraction(90)).toBeLessThan(0.5);
    expect(zoneBarFraction(98)).toBe(0.5);
    expect(zoneBarFraction(100)).toBeGreaterThan(0.5);
    expect(zoneBarFraction(170)).toBe(1);
    expect(zoneBarFraction(180)).toBe(1);
    expect(zoneBarFraction(200)).toBe(1);
    expect(zoneBarFraction(260)).toBe(zoneBarFraction(170));
  });
});

describe('zoneBarBands', () => {
  it('stacks blue at the bottom through purple at the top, with equal gaps', () => {
    const bands = zoneBarBands();
    const gaps = bands.slice(0, -1).map((band, index) => bands[index + 1].bottom - (band.bottom + band.height));

    expect(bands.map((band) => band.colour)).toEqual(ZONES.map((zone) => zone.colour));
    expect(bands[0].bottom).toBe(0);
    expect(bands[0].colour).toBe('#3b8bff');
    expect(bands[6].colour).toBe('#b45cff');
    expect(bands[6].bottom + bands[6].height).toBeCloseTo(1, 5);
    expect(bands[0].height).toBeGreaterThan(bands[2].height);
    for (const gap of gaps) {
      expect(gap).toBeCloseTo(ZONE_BAR_GAP, 5);
    }
    expect(ZONE_BAR_GAP).toBeGreaterThan(0);
    expect(ZONE_BAR_GAP).toBeLessThan(0.02);
  });

  it('keeps the orange midpoint at the middle and each half proportional', () => {
    const bands = zoneBarBands();
    const orange = bands[3];
    const segments = zoneRingSegments();

    expect(orange.colour).toBe('#ff8a1f');
    expect(segments[3].startPercent).toBe(91);
    expect(segments[3].endPercent).toBe(106);
    expect(orange.bottom).toBeLessThan(0.5);
    expect(orange.bottom + orange.height).toBeGreaterThan(0.5);
    expect(zoneBarFraction(98)).toBe(0.5);

    const lower = zoneBarFraction(56) - zoneBarFraction(20);
    const lowerNext = zoneBarFraction(76) - zoneBarFraction(56);
    expect(lower / lowerNext).toBeCloseTo(36 / 20, 5);

    const upper = zoneBarFraction(121) - zoneBarFraction(106);
    const upperNext = zoneBarFraction(151) - zoneBarFraction(121);
    const sprint = zoneBarFraction(170) - zoneBarFraction(151);
    expect(upper / upperNext).toBeCloseTo(15 / 30, 5);
    expect(sprint / upperNext).toBeCloseTo(19 / 30, 5);
  });
});
