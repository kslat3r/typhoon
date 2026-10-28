export const ZONES = [
  { zone: 1, minPercent: 0, maxPercent: 56, colour: '#9bb0c9', name: 'Recovery' },
  { zone: 2, minPercent: 56, maxPercent: 76, colour: '#3b8bff', name: 'Endurance' },
  { zone: 3, minPercent: 76, maxPercent: 91, colour: '#2fd18b', name: 'Tempo' },
  { zone: 4, minPercent: 91, maxPercent: 106, colour: '#ffd23f', name: 'Threshold' },
  { zone: 5, minPercent: 106, maxPercent: 121, colour: '#ff8a1f', name: 'VO2' },
  { zone: 6, minPercent: 121, maxPercent: 151, colour: '#ff3b4e', name: 'Anaerobic' },
  { zone: 7, minPercent: 151, maxPercent: Infinity, colour: '#b45cff', name: 'Neuromuscular' },
] as const;
