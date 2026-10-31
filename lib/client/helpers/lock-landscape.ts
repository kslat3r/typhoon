export default function lockLandscape(orientation: { lock?: (mode: 'landscape') => Promise<void> } | undefined, installed: boolean): void {
  if (!installed || orientation === undefined || typeof orientation.lock !== 'function') {
    return;
  }
  void orientation.lock('landscape').catch((): void => undefined);
}
