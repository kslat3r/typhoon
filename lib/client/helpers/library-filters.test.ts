import { beforeEach, describe, expect, it } from 'vitest';
import filterRides, { loadLibraryFilters, saveLibraryFilters } from '@/lib/client/helpers/library-filters';
import { STORAGE_KEYS } from '@/lib/client/models/storage-keys';
import type { Ride } from '@/lib/client/models/types';

const LIGHT: Ride = {
  id: 'light-30',
  name: 'Dew',
  lengthSeconds: 1800,
  difficulty: 6,
  archetype: 'endurance',
  intervals: [{ zone: 1, seconds: 1800 }],
};

const HARD: Ride = {
  id: 'hard-45',
  name: 'Wall',
  lengthSeconds: 2700,
  difficulty: 2,
  archetype: 'climb',
  intervals: [{ zone: 1, seconds: 2700 }],
};

describe('library filters', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps every ride when both filters are all', () => {
    // Arrange / Act
    const matches: Ride[] = filterRides([LIGHT, HARD], { duration: 'all', difficulty: 'all' });

    // Assert
    expect(matches).toEqual([LIGHT, HARD]);
  });

  it('filters by duration and grade together', () => {
    // Arrange / Act
    const matches: Ride[] = filterRides([LIGHT, HARD], { duration: 1800, difficulty: 6 });

    // Assert
    expect(matches).toEqual([LIGHT]);
  });

  it('returns nothing when the combination matches no ride', () => {
    // Arrange / Act
    const matches: Ride[] = filterRides([HARD], { duration: 1800, difficulty: 6 });

    // Assert
    expect(matches).toEqual([]);
  });

  it('round-trips the chosen filters', () => {
    // Arrange
    saveLibraryFilters({ duration: 1800, difficulty: 6 });

    // Act
    const loaded = loadLibraryFilters();

    // Assert
    expect(loaded).toEqual({ duration: 1800, difficulty: 6 });
    expect(localStorage.getItem(STORAGE_KEYS.filters)).toBe('{"duration":1800,"difficulty":6}');
  });

  it('falls back to all when storage is missing or corrupt', () => {
    // Arrange / Act / Assert
    expect(loadLibraryFilters()).toEqual({ duration: 'all', difficulty: 'all' });
    localStorage.setItem(STORAGE_KEYS.filters, '{not json');
    expect(loadLibraryFilters()).toEqual({ duration: 'all', difficulty: 'all' });
    localStorage.setItem(STORAGE_KEYS.filters, JSON.stringify({ duration: 900, difficulty: 'steep' }));
    expect(loadLibraryFilters()).toEqual({ duration: 'all', difficulty: 'all' });
  });
});
