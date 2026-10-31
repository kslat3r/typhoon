import { describe, expect, it } from 'vitest';
import { ZONES } from '@/lib/client/models/zones';
import {
  ZONE_RING_CENTER,
  ZONE_RING_MAX_PERCENT,
  ZONE_RING_MIN_PERCENT,
  ZONE_RING_RADIUS,
  ZONE_RING_TOP_PERCENT,
  markerPoint,
  needleLine,
  segmentStroke,
  zoneRingSegments,
  zoneRingTurn,
  zoneTargetLabel,
} from '@/lib/client/helpers/zone-ring';

describe('zoneRingSegments', () => {
  it('sizes each segment by its percent-of-FTP span and caps zone 7 at 180', () => {
    const segments = zoneRingSegments();
    const sprint = segments[6];

    expect(segments.map((segment) => segment.endPercent - segment.startPercent)).toEqual([36, 20, 15, 15, 15, 30, 29]);
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
    expect(ZONE_RING_MAX_PERCENT).toBe(180);
    expect(sprint.startPercent).toBe(151);
    expect(sprint.endPercent).toBe(180);
    expect(sprint.colour).toBe('#b45cff');
    expect((sprint.endPercent - 150) / ZONE_RING_MAX_PERCENT).toBeCloseTo(30 / 180);
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
  it('starts at 6 o clock, puts the orange midpoint at 12 o clock, and clamps above 180', () => {
    const start = markerPoint(0);
    const clockwise = markerPoint(40);
    const top = markerPoint(ZONE_RING_TOP_PERCENT);
    const beforeTop = markerPoint(90);
    const pastTop = markerPoint(100);
    const cap = markerPoint(180);
    const over = markerPoint(200);

    expect(ZONE_RING_TOP_PERCENT).toBe(98);
    expect(start.x).toBeCloseTo(ZONE_RING_CENTER, 5);
    expect(start.y).toBeCloseTo(ZONE_RING_CENTER + ZONE_RING_RADIUS, 5);
    expect(clockwise.x).toBeLessThan(start.x);
    expect(top.x).toBeCloseTo(ZONE_RING_CENTER, 5);
    expect(top.y).toBeCloseTo(ZONE_RING_CENTER - ZONE_RING_RADIUS, 5);
    expect(beforeTop.x).toBeLessThan(ZONE_RING_CENTER);
    expect(pastTop.x).toBeGreaterThan(ZONE_RING_CENTER);
    expect(pastTop.y).toBeLessThan(ZONE_RING_CENTER);
    expect(cap.x).toBeCloseTo(start.x, 5);
    expect(cap.y).toBeCloseTo(start.y, 5);
    expect(over).toEqual(cap);
    expect(markerPoint(10)).toEqual(start);
    expect(markerPoint(20)).toEqual(start);
    expect(zoneRingTurn(0)).toBe(0);
    expect(zoneRingTurn(10)).toBe(0);
    expect(zoneRingTurn(20)).toBe(0);
    expect(zoneRingTurn(98)).toBe(0.5);
    expect(zoneRingTurn(180)).toBe(1);
    expect(zoneRingTurn(200)).toBe(1);
  });
});

describe('needleLine', () => {
  it('points at 6 o clock from 20% down, up at the orange midpoint, and clamps at 180', () => {
    const start = needleLine(20);
    const below = needleLine(0);
    const clockwise = needleLine(40);
    const middle = needleLine(ZONE_RING_TOP_PERCENT);
    const cap = needleLine(180);
    const over = needleLine(260);

    expect(start.x2).toBeCloseTo(ZONE_RING_CENTER, 5);
    expect(start.y2).toBeGreaterThan(ZONE_RING_CENTER);
    expect(clockwise.x2).toBeLessThan(start.x2);
    expect(middle.x2).toBeCloseTo(ZONE_RING_CENTER, 5);
    expect(middle.y2).toBeLessThan(ZONE_RING_CENTER);
    expect(cap.x2).toBeCloseTo(start.x2, 5);
    expect(cap.y2).toBeCloseTo(start.y2, 5);
    expect(over).toEqual(cap);
    expect(below).toEqual(start);
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

  it('centres the orange segment on 12 o clock and keeps each half proportional', () => {
    const segments = zoneRingSegments();
    const orange = segments[3];
    const orangeMidTurn = (zoneRingTurn(orange.startPercent) + zoneRingTurn(orange.endPercent)) / 2;

    expect(orange.colour).toBe('#ff8a1f');
    expect(orange.startPercent).toBe(91);
    expect(orange.endPercent).toBe(106);
    expect(zoneRingTurn(orange.startPercent)).toBeLessThan(0.5);
    expect(zoneRingTurn(orange.endPercent)).toBeGreaterThan(0.5);
    expect(orangeMidTurn).toBeCloseTo(0.5, 1);

    const lower = zoneRingTurn(56) - zoneRingTurn(20);
    const lowerNext = zoneRingTurn(76) - zoneRingTurn(56);
    expect(lower / lowerNext).toBeCloseTo(36 / 20, 5);

    const upper = zoneRingTurn(121) - zoneRingTurn(106);
    const upperNext = zoneRingTurn(151) - zoneRingTurn(121);
    expect(upper / upperNext).toBeCloseTo(15 / 30, 5);
  });
});
