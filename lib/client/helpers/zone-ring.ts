import type { ZoneNumber } from '@/lib/client/models/types';
import { ZONES } from '@/lib/client/models/zones';

// Zone 7 is open-ended. The ring stops at 200% of FTP so the last segment has a width.
export const ZONE_RING_MAX_PERCENT = 200;
export const ZONE_RING_RADIUS = 36;
export const ZONE_RING_CENTER = 50;

// A sliver of the circle stays open at 12 o'clock so 0% and the cap do not share a point.
const SEAM = 0.02;
const SEGMENT_GAP = 1.5;

export type ZoneRingSegment = {
  zone: ZoneNumber;
  colour: string;
  startPercent: number;
  endPercent: number;
};

export function zoneRingSegments(): ZoneRingSegment[] {
  return ZONES.map((band, index) => {
    const next = ZONES[index + 1];
    return {
      zone: band.zone,
      colour: band.colour,
      startPercent: band.minPercent,
      // Run each segment up to the next zone so the 1% Coggan gaps do not open holes.
      endPercent: next === undefined ? ZONE_RING_MAX_PERCENT : next.minPercent,
    };
  });
}

// The caption under the ring is the top of the target zone, not the middle of the range.
// Zone 7 has no finite top. 150%+ is the published open end; 200% is only the drawing cap.
export function zoneTargetLabel(zone: ZoneNumber): string {
  const band = ZONES[zone - 1];
  if (!Number.isFinite(band.maxPercent)) {
    return '150%+';
  }
  return `${band.maxPercent}%`;
}

// 0 is 12 o'clock. The seam keeps the first and last turns just off that point.
export function zoneRingTurn(percent: number): number {
  const clamped: number = Math.min(ZONE_RING_MAX_PERCENT, Math.max(0, percent));
  return SEAM / 2 + (clamped / ZONE_RING_MAX_PERCENT) * (1 - SEAM);
}

function ringAngle(percent: number): number {
  return -Math.PI / 2 + zoneRingTurn(percent) * Math.PI * 2;
}

export function markerPoint(percent: number): { x: number; y: number } {
  const angle: number = ringAngle(percent);
  return {
    x: ZONE_RING_CENTER + ZONE_RING_RADIUS * Math.cos(angle),
    y: ZONE_RING_CENTER + ZONE_RING_RADIUS * Math.sin(angle),
  };
}

// A needle from inside the dial out to the ring. 0% is just clockwise of 12 o'clock.
const NEEDLE_INNER = 15;
const NEEDLE_OUTER = ZONE_RING_RADIUS - 1.5;

export function needleLine(percent: number): { x1: number; y1: number; x2: number; y2: number } {
  const angle: number = ringAngle(percent);
  return {
    x1: ZONE_RING_CENTER + NEEDLE_INNER * Math.cos(angle),
    y1: ZONE_RING_CENTER + NEEDLE_INNER * Math.sin(angle),
    x2: ZONE_RING_CENTER + NEEDLE_OUTER * Math.cos(angle),
    y2: ZONE_RING_CENTER + NEEDLE_OUTER * Math.sin(angle),
  };
}

export function segmentStroke(startPercent: number, endPercent: number): { dasharray: string; dashoffset: string } {
  const circumference: number = 2 * Math.PI * ZONE_RING_RADIUS;
  const start: number = zoneRingTurn(startPercent);
  const end: number = zoneRingTurn(endPercent);
  const dash: number = Math.max((end - start) * circumference - SEGMENT_GAP, 0.5);
  const offset: number = (0.25 - start) * circumference;
  return {
    dasharray: `${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}`,
    dashoffset: offset.toFixed(2),
  };
}
