import { describe, expect, it } from 'vitest';
import formatClock from '@/lib/client/helpers/format-clock';

describe('formatClock', () => {
  it('formats seconds as m:ss', () => {
    // Arrange / Act / Assert
    expect(formatClock(92)).toBe('1:32');
    expect(formatClock(2700)).toBe('45:00');
    expect(formatClock(5)).toBe('0:05');
    expect(formatClock(-3)).toBe('0:00');
  });
});
