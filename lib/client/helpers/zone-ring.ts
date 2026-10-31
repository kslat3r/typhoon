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
  return ZONES.map((band) => ({
    zone: band.zone,
    colour: band.colour,
    startPercent: band.minPercent,
    endPercent: band.maxPercent === Infinity ? ZONE_RING_MAX_PERCENT : band.maxPercent,
  }));
}

export function zoneTargetLabel(zone: ZoneNumber): string {
  const band = ZONES[zone - 1];
  if (band.maxPercent === Infinity) {
    return `${band.minPercent}%+`;
  }
  return `${band.minPercent}–${band.maxPercent}%`;
}

// 0 is 12 o'clock. The seam keeps the first and last turns just off that point.
export function zoneRingTurn(percent: number): number {
  const clamped: number = Math.min(ZONE_RING_MAX_PERCENT, Math.max(0, percent));
  return SEAM / 2 + (clamped / ZONE_RING_MAX_PERCENT) * (1 - SEAM);
}

export function markerPoint(percent: number): { x: number; y: number } {
  const angle: number = -Math.PI / 2 + zoneRingTurn(percent) * Math.PI * 2;
  return {
    x: ZONE_RING_CENTER + ZONE_RING_RADIUS * Math.cos(angle),
    y: ZONE_RING_CENTER + ZONE_RING_RADIUS * Math.sin(angle),
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
