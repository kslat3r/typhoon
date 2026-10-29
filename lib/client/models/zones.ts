// Cyclone's zones as Ed reads them off the studio screen
export const ZONES = [
  { zone: 1, minPercent: 0, maxPercent: 55, colour: '#3b8bff', name: 'Blue' },
  { zone: 2, minPercent: 55, maxPercent: 76, colour: '#2fd18b', name: 'Green' },
  { zone: 3, minPercent: 76, maxPercent: 91, colour: '#ffd23f', name: 'Yellow' },
  { zone: 4, minPercent: 91, maxPercent: 111, colour: '#ff8a1f', name: 'Orange' },
  { zone: 5, minPercent: 111, maxPercent: 126, colour: '#ff3b4e', name: 'Red' },
  { zone: 6, minPercent: 126, maxPercent: 151, colour: '#b0122c', name: 'Dark red' },
  { zone: 7, minPercent: 151, maxPercent: Infinity, colour: '#b45cff', name: 'Purple' },
] as const;
