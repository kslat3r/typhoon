import type { ZoneNumber } from '@/lib/client/models/types';

export default function shouldChangeTrack(
  fromZone: ZoneNumber,
  toZone: ZoneNumber,
  trackPlayedSeconds: number,
  random: () => number,
): boolean {
  if (trackPlayedSeconds < 60) {
    return false;
  }

  const jump = Math.abs(toZone - fromZone);

  if (jump === 0) {
    return false;
  }

  // ponytail: tune after riding; 0.25 felt like the music never changed
  if (jump === 1) {
    return random() < 0.5;
  }

  return random() < 0.8;
}
