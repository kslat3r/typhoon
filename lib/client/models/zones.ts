// Coggan's 7-zone model, which the colour-coded Cyclone zones follow.
// David Lloyd does not publish official Cyclone percentages. A zone is every
// percent from its minimum up to, but not including, the next zone's minimum.
// Zone 7 is open-ended above 150%.
export const ZONES = [
  { zone: 1, minPercent: 0, maxPercent: 55, colour: '#3b8bff', name: 'Recover' },
  { zone: 2, minPercent: 56, maxPercent: 75, colour: '#2fd18b', name: 'Endurance' },
  { zone: 3, minPercent: 76, maxPercent: 90, colour: '#ffd23f', name: 'Tempo' },
  { zone: 4, minPercent: 91, maxPercent: 105, colour: '#ff8a1f', name: 'Threshold' },
  { zone: 5, minPercent: 106, maxPercent: 120, colour: '#ff3b4e', name: 'VO2' },
  { zone: 6, minPercent: 121, maxPercent: 150, colour: '#b0122c', name: 'Anaerobic' },
  { zone: 7, minPercent: 151, maxPercent: Infinity, colour: '#b45cff', name: 'Sprint' },
] as const;

// Planned intensity for a block written only as a zone. Zone 7 has no top, so a
// sprint block is taken at 175% of FTP. The ring draws that zone only up to 160%.
export const ZONE_MID_PERCENT: readonly number[] = [0, 27.5, 65.5, 83, 98, 113, 135.5, 175];
