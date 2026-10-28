export default async function requestWakeLock(): Promise<WakeLockSentinel | null> {
  if (!navigator.wakeLock) {
    return null;
  }

  let sentinel: WakeLockSentinel;
  try {
    sentinel = await navigator.wakeLock.request('screen');
  } catch {
    // A missing wake lock must not stop a ride, so a refusal is treated as unsupported.
    return null;
  }

  return sentinel;
}
