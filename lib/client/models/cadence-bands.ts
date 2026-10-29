// ponytail: tune after riding
const EASY_BAND = { min: 75, max: 85 } as const;
const TEMPO_BAND = { min: 85, max: 95 } as const;
const HARD_BAND = { min: 95, max: 110 } as const;

// Zones that share a band object share a cadence, which is what the music logic compares
export const CADENCE_BANDS = {
  1: EASY_BAND,
  2: EASY_BAND,
  3: TEMPO_BAND,
  4: TEMPO_BAND,
  5: HARD_BAND,
  6: HARD_BAND,
  7: HARD_BAND,
} as const;
