import { ZONES } from '@/lib/client/models/zones';
import type { ZoneNumber } from '@/lib/client/models/types';

export default function zoneForWatts(watts: number, ftp: number): ZoneNumber {
  const percent: number = (watts / ftp) * 100;

  for (const zoneDefinition of ZONES) {
    if (percent >= zoneDefinition.minPercent && percent < zoneDefinition.maxPercent) {
      return zoneDefinition.zone;
    }
  }

  return 2;
}
