// Ed's song tempo per zone colour in bpm (2026-10-29): green 140-160, yellow 161-174, orange and above 175-180.
// Blue has no target of its own and shares green's band. Cadence is half the tempo.
const EASY_BAND = { min: 140, max: 160 } as const;
const TEMPO_BAND = { min: 161, max: 174 } as const;
const HARD_BAND = { min: 175, max: 180 } as const;

export const TEMPO_BANDS = {
  1: EASY_BAND,
  2: EASY_BAND,
  3: TEMPO_BAND,
  4: HARD_BAND,
  5: HARD_BAND,
  6: HARD_BAND,
  7: HARD_BAND,
} as const;
