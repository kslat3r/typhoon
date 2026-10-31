type OrientationControls = {
  lock?: (mode: 'landscape') => Promise<void>;
  unlock?: () => void;
};

export function lockRideLandscape(orientation: OrientationControls | undefined): void {
  if (orientation === undefined || typeof orientation.lock !== 'function') {
    return;
  }
  try {
    void orientation.lock('landscape').catch((): void => undefined);
  } catch {
    // Some browsers throw instead of rejecting when a lock is refused.
  }
}

export function unlockRideOrientation(orientation: OrientationControls | undefined): void {
  if (orientation === undefined || typeof orientation.unlock !== 'function') {
    return;
  }
  try {
    orientation.unlock();
  } catch {
    // Nothing was locked, or this browser has no orientation lock.
  }
}
