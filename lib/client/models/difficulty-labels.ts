import type { Difficulty } from '@/lib/client/models/types';

// Easiest to hardest. 6–9 were added below the original library.
// Grade 1 was labeled Moderate. That name now belongs to grade 9, the step just below the original rides.
export const DIFFICULTY_ORDER: readonly Difficulty[] = [6, 7, 8, 9, 1, 2, 3, 4, 5];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  6: 'Light',
  7: 'Easy',
  8: 'Average',
  9: 'Moderate',
  1: 'Challenging',
  2: 'Hard',
  3: 'Very hard',
  4: 'Severe',
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
