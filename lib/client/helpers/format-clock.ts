export default function formatClock(totalSeconds: number): string {
  const clampedSeconds: number = Math.max(0, Math.floor(totalSeconds));
  const minutes: number = Math.floor(clampedSeconds / 60);
  const seconds: number = clampedSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
