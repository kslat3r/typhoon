export default function speedFromWatts(watts: number): number {
  // ponytail: air-resistance guess, tune against the Wattbike monitor
  return Math.cbrt(watts / 0.22) * 2.237;
}
