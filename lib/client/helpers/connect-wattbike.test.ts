import { describe, expect, it } from 'vitest';
import { WATTBIKE_REQUEST } from '@/lib/client/helpers/connect-wattbike';

describe('WATTBIKE_REQUEST', () => {
  it('offers cycling power and FTMS, and may read cadence services', () => {
    // Arrange / Act / Assert
    expect(WATTBIKE_REQUEST.filters).toEqual([{ services: ['cycling_power'] }, { services: ['fitness_machine'] }]);
    expect(WATTBIKE_REQUEST.optionalServices).toEqual(['cycling_power', 'fitness_machine', 'cycling_speed_and_cadence']);
  });
});
