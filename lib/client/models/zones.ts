export const ZONES = [
  { zone: 1, minPercent: 0, maxPercent: 56, colour: '#6b7280', name: 'Recovery' },
  { zone: 2, minPercent: 56, maxPercent: 76, colour: '#2563eb', name: 'Endurance' },
  { zone: 3, minPercent: 76, maxPercent: 91, colour: '#16a34a', name: 'Tempo' },
  { zone: 4, minPercent: 91, maxPercent: 106, colour: '#eab308', name: 'Threshold' },
  { zone: 5, minPercent: 106, maxPercent: 121, colour: '#f97316', name: 'VO2' },
  { zone: 6, minPercent: 121, maxPercent: 151, colour: '#dc2626', name: 'Anaerobic' },
  { zone: 7, minPercent: 151, maxPercent: Infinity, colour: '#9333ea', name: 'Neuromuscular' },
] as const;
