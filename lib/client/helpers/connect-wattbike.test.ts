import { describe, expect, it } from 'vitest';
import { WATTBIKE_REQUEST } from '@/lib/client/helpers/connect-wattbike';

describe('WATTBIKE_REQUEST', () => {
  it('offers cycling power, FTMS, and cadence, plus a Stages name for bikes that hide the service UUID', () => {
    // Arrange / Act / Assert
    expect(WATTBIKE_REQUEST.filters).toEqual([
      { services: ['cycling_power'] },
      { services: ['fitness_machine'] },
      { services: ['cycling_speed_and_cadence'] },
      { namePrefix: 'Stages' },
    ]);
    expect(WATTBIKE_REQUEST.optionalServices).toEqual(['cycling_power', 'fitness_machine', 'cycling_speed_and_cadence']);
    expect(WATTBIKE_REQUEST.filters.some((filter) => 'namePrefix' in filter && String(filter.namePrefix).toLowerCase() === 'wattbike')).toBe(false);
  });
});
