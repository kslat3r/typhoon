import { STORAGE_KEYS } from '@/lib/client/models/storage-keys';
import type { Difficulty, Ride } from '@/lib/client/models/types';

export type DurationFilter = 'all' | 1800 | 2700;
export type DifficultyFilter = 'all' | Difficulty;

export interface LibraryFilters {
  duration: DurationFilter;
  difficulty: DifficultyFilter;
}

export const DEFAULT_LIBRARY_FILTERS: LibraryFilters = {
  duration: 'all',
  difficulty: 'all',
};

const DIFFICULTY_VALUES: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function isDuration(value: unknown): value is DurationFilter {
  return value === 'all' || value === 1800 || value === 2700;
}

function isDifficulty(value: unknown): value is DifficultyFilter {
  return value === 'all' || (typeof value === 'number' && DIFFICULTY_VALUES.includes(value));
}

export function loadLibraryFilters(): LibraryFilters {
  const raw: string | null = localStorage.getItem(STORAGE_KEYS.filters);
  if (raw === null) {
    return DEFAULT_LIBRARY_FILTERS;
  }
  try {
    const stored: unknown = JSON.parse(raw);
    if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) {
      return DEFAULT_LIBRARY_FILTERS;
    }
    const record: { duration?: unknown; difficulty?: unknown } = stored;
    return {
      duration: isDuration(record.duration) ? record.duration : 'all',
      difficulty: isDifficulty(record.difficulty) ? record.difficulty : 'all',
    };
  } catch {
    return DEFAULT_LIBRARY_FILTERS;
  }
}

export function saveLibraryFilters(filters: LibraryFilters): void {
  localStorage.setItem(STORAGE_KEYS.filters, JSON.stringify(filters));
}

export default function filterRides(rides: readonly Ride[], filters: LibraryFilters): Ride[] {
  return rides.filter((ride: Ride): boolean => {
    if (filters.duration !== 'all' && ride.lengthSeconds !== filters.duration) {
      return false;
    }
    if (filters.difficulty !== 'all' && ride.difficulty !== filters.difficulty) {
      return false;
    }
    return true;
  });
}
