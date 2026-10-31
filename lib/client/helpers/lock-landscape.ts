type OrientationControls = {
  lock?: (mode: 'landscape') => Promise<void>;
};

export function lockLandscape(orientation: OrientationControls | undefined): void {
  if (orientation === undefined || typeof orientation.lock !== 'function') {
    return;
  }
  try {
    void orientation.lock('landscape').catch((): void => undefined);
  } catch {
    // Some browsers throw instead of rejecting when a lock is refused.
  }
}
