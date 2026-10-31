import type { Difficulty } from '@/lib/client/models/types';

export const DIFFICULTY_ORDER: readonly Difficulty[] = [1, 2, 3, 4, 5];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: 'Easy',
  2: 'Moderate',
  3: 'Hard',
  4: 'Very hard',
  5: 'Brutal',
};

export function difficultyRank(difficulty: Difficulty): number {
  return DIFFICULTY_ORDER.indexOf(difficulty);
}

export function difficultyLabel(difficulty: number): string {
  if (difficulty in DIFFICULTY_LABELS) {
    return DIFFICULTY_LABELS[difficulty as Difficulty];
  }
  return 'Ride';
}
