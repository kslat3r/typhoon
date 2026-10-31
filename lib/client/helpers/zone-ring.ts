import zoneForWatts from '@/lib/client/helpers/zone-for-watts';
import type { ZoneNumber } from '@/lib/client/models/types';
import { ZONES } from '@/lib/client/models/zones';

// The ring draws from 20% of FTP. Zone 1 itself still starts at 0%; only the gauge floor moves.
export const ZONE_RING_MIN_PERCENT = 20;
// Zone 7 is open-ended. The ring stops at 170% of FTP so the purple sprint arc is the band above 150%.
export const ZONE_RING_MAX_PERCENT = 170;
// Strong enough that the zone colour reads at a glance, with white type still readable.
export const ZONE_RING_FILL_ALPHA = 0.7;

// The old ring left 1.5 units open on a 36-radius circle. The bar keeps that fraction of its height between zones.
const ZONE_BAR_CIRCUMFERENCE = 2 * Math.PI * 36;
export const ZONE_BAR_GAP = 1.5 / ZONE_BAR_CIRCUMFERENCE;

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

// The disc uses the same percent the needle points at, mapped through the Coggan bands.
export function zoneRingFill(percent: number): string {
  return ZONES[zoneForWatts(percent, 100) - 1].colour;
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

// Threshold (zone 4, 91–105) sits at the middle of the bar. 98 is the middle of that zone.
export const ZONE_RING_TOP_PERCENT = (ZONES[3].minPercent + ZONES[3].maxPercent) / 2;

// 20% is the bottom. 98% is halfway up. 170% is the top.
// Each half is linear, so the zones on that half keep their percent proportions.
// Readings below 20% sit on the bottom; readings above 170% sit on the top.
export function zoneRingTurn(percent: number): number {
  const clamped: number = Math.min(ZONE_RING_MAX_PERCENT, Math.max(ZONE_RING_MIN_PERCENT, percent));
  if (clamped <= ZONE_RING_TOP_PERCENT) {
    const lowerSpan: number = ZONE_RING_TOP_PERCENT - ZONE_RING_MIN_PERCENT;
    return ((clamped - ZONE_RING_MIN_PERCENT) / lowerSpan) * 0.5;
  }
  const upperSpan: number = ZONE_RING_MAX_PERCENT - ZONE_RING_TOP_PERCENT;
  return 0.5 + ((clamped - ZONE_RING_TOP_PERCENT) / upperSpan) * 0.5;
}

export type ZoneBarBand = {
  zone: ZoneNumber;
  colour: string;
  bottom: number;
  height: number;
};

// 0 is the bottom of the bar (20%). 1 is the top (170%). 98% of FTP is the middle.
export function zoneBarFraction(percent: number): number {
  return zoneRingTurn(percent);
}

// Bands stack from the bottom. Each gap matches the ring, and the last band reaches the top.
export function zoneBarBands(): ZoneBarBand[] {
  const segments: ZoneRingSegment[] = zoneRingSegments();
  return segments.map((segment, index) => {
    const bottom: number = zoneRingTurn(segment.startPercent);
    const end: number = zoneRingTurn(segment.endPercent);
    const gap: number = index === segments.length - 1 ? 0 : ZONE_BAR_GAP;
    return {
      zone: segment.zone,
      colour: segment.colour,
      bottom,
      height: end - bottom - gap,
    };
  });
}
