import type { ZoneNumber } from '@/lib/client/models/types';
import { ZONES } from '@/lib/client/models/zones';

// The ring draws from 20% of FTP. Zone 1 itself still starts at 0%; only the gauge floor moves.
export const ZONE_RING_MIN_PERCENT = 20;
// Zone 7 is open-ended. The ring stops at 170% of FTP so the purple sprint arc is the band above 150%.
export const ZONE_RING_MAX_PERCENT = 170;
export const ZONE_RING_RADIUS = 36;
export const ZONE_RING_CENTER = 50;

// The same arc is left open after every segment, including the join where zone 7 meets zone 1.
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
      startPercent: index === 0 ? ZONE_RING_MIN_PERCENT : band.minPercent,
      // Run each segment up to the next zone so the 1% Coggan gaps do not open holes.
      endPercent: next === undefined ? ZONE_RING_MAX_PERCENT : next.minPercent,
    };
  });
}

// The caption under the ring is the top of the target zone, not the middle of the range.
// Zone 7 has no finite top. 150%+ is the published open end; 170% is only the drawing cap.
export function zoneTargetLabel(zone: ZoneNumber): string {
  const band = ZONES[zone - 1];
  if (!Number.isFinite(band.maxPercent)) {
    return '150%+';
  }
  return `${band.maxPercent}%`;
}

// Threshold (zone 4, 91–105) is centred on 12 o'clock. 98 is the middle of that zone.
export const ZONE_RING_TOP_PERCENT = (ZONES[3].minPercent + ZONES[3].maxPercent) / 2;

// 20% is 6 o'clock. 98% is 12 o'clock. 170% returns to 6 o'clock.
// Each semicircle is linear, so the zones on that half keep their percent proportions.
// Readings below 20% sit on the start; readings above 170% sit on the cap.
export function zoneRingTurn(percent: number): number {
  const clamped: number = Math.min(ZONE_RING_MAX_PERCENT, Math.max(ZONE_RING_MIN_PERCENT, percent));
  if (clamped <= ZONE_RING_TOP_PERCENT) {
    const lowerSpan: number = ZONE_RING_TOP_PERCENT - ZONE_RING_MIN_PERCENT;
    return ((clamped - ZONE_RING_MIN_PERCENT) / lowerSpan) * 0.5;
  }
  const upperSpan: number = ZONE_RING_MAX_PERCENT - ZONE_RING_TOP_PERCENT;
  return 0.5 + ((clamped - ZONE_RING_TOP_PERCENT) / upperSpan) * 0.5;
}

function ringAngle(percent: number): number {
  return Math.PI / 2 + zoneRingTurn(percent) * Math.PI * 2;
}

export function markerPoint(percent: number): { x: number; y: number } {
  const angle: number = ringAngle(percent);
  return {
    x: ZONE_RING_CENTER + ZONE_RING_RADIUS * Math.cos(angle),
    y: ZONE_RING_CENTER + ZONE_RING_RADIUS * Math.sin(angle),
  };
}

// A needle from inside the dial out to the ring. 20% is 6 o'clock; power moves it clockwise.
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
  const offset: number = (0.75 - start) * circumference;
  return {
    dasharray: `${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}`,
    dashoffset: offset.toFixed(2),
  };
}
