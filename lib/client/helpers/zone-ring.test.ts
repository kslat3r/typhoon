import { describe, expect, it } from 'vitest';
import { ZONES } from '@/lib/client/models/zones';
import {
  ZONE_RING_CENTER,
  ZONE_RING_MAX_PERCENT,
  ZONE_RING_RADIUS,
  markerPoint,
  needleLine,
  segmentStroke,
  zoneRingSegments,
  zoneRingTurn,
  zoneTargetLabel,
} from '@/lib/client/helpers/zone-ring';

describe('zoneRingSegments', () => {
  it('sizes each segment by its percent-of-FTP span and caps zone 7 at 200', () => {
    const segments = zoneRingSegments();

    expect(segments.map((segment) => segment.endPercent - segment.startPercent)).toEqual([56, 20, 15, 15, 15, 30, 49]);
    expect(segments.reduce((sum, segment) => sum + (segment.endPercent - segment.startPercent), 0)).toBe(ZONE_RING_MAX_PERCENT);
    expect(segments.map((segment) => segment.colour)).toEqual(ZONES.map((zone) => zone.colour));
    expect(segments[6].endPercent).toBe(200);
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

describe('markerPoint', () => {
  it('starts just clockwise of the top, sits at the bottom halfway, and clamps above 200', () => {
    const start = markerPoint(0);
    const middle = markerPoint(100);
    const cap = markerPoint(200);
    const over = markerPoint(240);

    expect(start.x).toBeGreaterThan(ZONE_RING_CENTER);
    expect(start.y).toBeLessThan(ZONE_RING_CENTER);
    expect(middle.x).toBeCloseTo(ZONE_RING_CENTER, 5);
    expect(middle.y).toBeCloseTo(ZONE_RING_CENTER + ZONE_RING_RADIUS, 5);
    expect(cap.x).toBeLessThan(ZONE_RING_CENTER);
    expect(over).toEqual(cap);
    expect(zoneRingTurn(0)).toBeGreaterThan(0);
    expect(zoneRingTurn(200)).toBeLessThan(1);
  });
});

describe('needleLine', () => {
  it('points just clockwise of the top at 0%, down at the middle, and clamps at the cap', () => {
    const start = needleLine(0);
    const middle = needleLine(100);
    const cap = needleLine(200);
    const over = needleLine(260);
    const further = needleLine(40);

    expect(start.x2).toBeGreaterThan(ZONE_RING_CENTER);
    expect(start.y2).toBeLessThan(ZONE_RING_CENTER);
    expect(further.x2).toBeGreaterThan(start.x2);
    expect(middle.x2).toBeCloseTo(ZONE_RING_CENTER, 5);
    expect(middle.y2).toBeGreaterThan(ZONE_RING_CENTER);
    expect(cap.x2).toBeLessThan(ZONE_RING_CENTER);
    expect(over).toEqual(cap);
    expect(start.y1).toBeLessThan(ZONE_RING_CENTER);
    expect(Math.hypot(start.x2 - start.x1, start.y2 - start.y1)).toBeGreaterThan(10);
  });
});

describe('segmentStroke', () => {
  it('gives a wider zone a longer dash', () => {
    const zone1 = Number(segmentStroke(0, 55).dasharray.split(' ')[0]);
    const zone3 = Number(segmentStroke(76, 91).dasharray.split(' ')[0]);

    expect(zone1).toBeGreaterThan(zone3);
  });
});
