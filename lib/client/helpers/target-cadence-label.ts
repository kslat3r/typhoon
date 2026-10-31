import { TARGET_RPM } from '@/lib/client/models/target-cadence';
import type { ZoneNumber } from '@/lib/client/models/types';

export default function targetCadenceLabel(secondsInZone: number[]): string | null {
  const targets: number[] = [];
  secondsInZone.forEach((seconds: number, index: number): void => {
    if (seconds > 0) {
      targets.push(TARGET_RPM[(index + 1) as ZoneNumber]);
    }
  });
  if (targets.length === 0) {
    return null;
  }
  const low: number = Math.min(...targets);
  const high: number = Math.max(...targets);
  return low === high ? `${low} rpm` : `${low}–${high} rpm`;
}
