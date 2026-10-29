import { beforeEach, describe, expect, it } from 'vitest';
import renderSummaryScreen from '@/components/SummaryScreen';
import appendRideSummary from '@/lib/client/helpers/append-ride-summary';
import type { RideSummary } from '@/lib/client/models/types';

const SUMMARY: RideSummary = {
  id: 'summary-1',
  rideId: 'ride-1',
  rideName: 'Test Ride',
  difficulty: 3,
  startedAt: '2026-10-28T10:00:00.000Z',
  durationSeconds: 1800,
  averageWatts: 187,
  maxWatts: 320,
  miles: 12.345,
  averageMph: 20.46,
  secondsInZone: [10, 20, 30, 40, 0, 0, 5],
  missingSeconds: 0,
  ftpUsed: 200,
};

describe('renderSummaryScreen', () => {
  beforeEach((): void => {
    localStorage.clear();
  });

  it('shows average watts and seven zone bars', (): void => {
    // Arrange
    appendRideSummary(SUMMARY);
    const root: HTMLElement = document.createElement('div');

    // Act
    renderSummaryScreen(root, SUMMARY.id);

    // Assert
    expect(root.textContent).toContain('187');
    expect(root.querySelectorAll('.zone-bar')).toHaveLength(7);
  });

  it('shows not found for an unknown id', (): void => {
    // Arrange
    const root: HTMLElement = document.createElement('div');

    // Act
    renderSummaryScreen(root, 'missing');

    // Assert
    expect(root.textContent).toContain('Ride not found');
  });
});
