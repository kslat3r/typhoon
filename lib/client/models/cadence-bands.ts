// Ed's cadence per zone colour (2026-10-29): green 70-80, yellow 80-82, orange and above 87-90.
// Blue has no target of its own and shares green's band.
const EASY_BAND = { min: 70, max: 80 } as const;
const TEMPO_BAND = { min: 80, max: 82 } as const;
const HARD_BAND = { min: 87, max: 90 } as const;

export const CADENCE_BANDS = {
  1: EASY_BAND,
  2: EASY_BAND,
  3: TEMPO_BAND,
  4: HARD_BAND,
  5: HARD_BAND,
  6: HARD_BAND,
  7: HARD_BAND,
} as const;
