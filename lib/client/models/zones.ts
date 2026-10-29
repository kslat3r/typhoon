// Cyclone's zones: the orange zone holds 100% of FTP, blue tops out at 55%, red at 120%
export const ZONES = [
  { zone: 2, minPercent: 0, maxPercent: 56, colour: '#3b8bff', name: 'Recovery' },
  { zone: 3, minPercent: 56, maxPercent: 76, colour: '#2fd18b', name: 'Endurance' },
  { zone: 4, minPercent: 76, maxPercent: 91, colour: '#ffd23f', name: 'Tempo' },
  { zone: 5, minPercent: 91, maxPercent: 106, colour: '#ff8a1f', name: 'Threshold' },
  { zone: 6, minPercent: 106, maxPercent: 121, colour: '#ff3b4e', name: 'VO2' },
  { zone: 7, minPercent: 121, maxPercent: Infinity, colour: '#b45cff', name: 'Anaerobic' },
] as const;
