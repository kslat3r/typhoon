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
  it('starts at 6 o clock, moves clockwise, sits at the top halfway, and clamps above 200', () => {
    const start = markerPoint(0);
    const clockwise = markerPoint(40);
    const middle = markerPoint(100);
    const cap = markerPoint(200);
    const over = markerPoint(240);

    expect(start.x).toBeCloseTo(ZONE_RING_CENTER, 5);
    expect(start.y).toBeCloseTo(ZONE_RING_CENTER + ZONE_RING_RADIUS, 5);
    expect(clockwise.x).toBeLessThan(start.x);
    expect(middle.x).toBeCloseTo(ZONE_RING_CENTER, 5);
    expect(middle.y).toBeCloseTo(ZONE_RING_CENTER - ZONE_RING_RADIUS, 5);
    expect(cap.x).toBeCloseTo(start.x, 5);
    expect(cap.y).toBeCloseTo(start.y, 5);
    expect(over).toEqual(cap);
    expect(zoneRingTurn(0)).toBe(0);
    expect(zoneRingTurn(200)).toBe(1);
  });
});

describe('needleLine', () => {
  it('points at 6 o clock at 0%, up at the middle, and clamps at the cap', () => {
    const start = needleLine(0);
    const clockwise = needleLine(40);
    const middle = needleLine(100);
    const cap = needleLine(200);
    const over = needleLine(260);

    expect(start.x2).toBeCloseTo(ZONE_RING_CENTER, 5);
    expect(start.y2).toBeGreaterThan(ZONE_RING_CENTER);
    expect(clockwise.x2).toBeLessThan(start.x2);
    expect(middle.x2).toBeCloseTo(ZONE_RING_CENTER, 5);
    expect(middle.y2).toBeLessThan(ZONE_RING_CENTER);
    expect(cap.x2).toBeCloseTo(start.x2, 5);
    expect(cap.y2).toBeCloseTo(start.y2, 5);
    expect(over).toEqual(cap);
    expect(start.y1).toBeGreaterThan(ZONE_RING_CENTER);
    expect(Math.hypot(start.x2 - start.x1, start.y2 - start.y1)).toBeGreaterThan(10);
  });
});

describe('segmentStroke', () => {
  it('gives a wider zone a longer dash', () => {
    const zone1 = Number(segmentStroke(0, 55).dasharray.split(' ')[0]);
    const zone3 = Number(segmentStroke(76, 91).dasharray.split(' ')[0]);

    expect(zone1).toBeGreaterThan(zone3);
  });

  it('leaves the same gap between every pair of segments, including where the last meets the first', () => {
    const segments = zoneRingSegments();
    const circumference = 2 * Math.PI * ZONE_RING_RADIUS;
    const arcs = segments.map((segment) => {
      const start = zoneRingTurn(segment.startPercent);
      const dash = Number(segmentStroke(segment.startPercent, segment.endPercent).dasharray.split(' ')[0]);
      return { start, end: start + dash / circumference };
    });
    const gaps = arcs.map((arc, index) => {
      const next = arcs[(index + 1) % arcs.length];
      const nextStart = index === arcs.length - 1 ? next.start + 1 : next.start;
      return (nextStart - arc.end) * circumference;
    });

    expect(segments[0].colour).toBe('#3b8bff');
    for (const gap of gaps) {
      expect(gap).toBeCloseTo(gaps[0], 1);
    }
    expect(gaps[0]).toBeGreaterThan(1);
    expect(gaps[0]).toBeLessThan(2);
  });
});
