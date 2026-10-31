import { ZONES } from '@/lib/client/models/zones';
import type { ZoneNumber } from '@/lib/client/models/types';

export default function zoneForWatts(watts: number, ftp: number): ZoneNumber {
  const percent: number = (watts / ftp) * 100;

  for (let index = ZONES.length - 1; index >= 0; index -= 1) {
    if (percent >= ZONES[index].minPercent) {
      return ZONES[index].zone;
    }
  }

  return 1;
}
