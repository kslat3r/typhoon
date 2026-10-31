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
    expect(root.textContent).toContain('Elapsed');
    expect(root.textContent).toContain('30:00');
    expect(root.textContent).not.toContain('Planned');
    expect(root.textContent).toContain('187');
    expect(root.textContent).toContain('94%');
    expect(root.textContent).toContain('337 kJ');
    expect(root.textContent).not.toContain('Heart');
    expect(root.textContent).not.toContain('NP');
    expect(root.querySelectorAll('.zone-bar')).toHaveLength(7);
  });

  it('shows the saved power, cadence, and zone stats', (): void => {
    // Arrange
    appendRideSummary({
      ...SUMMARY,
      plannedSeconds: 1800,
      normalizedPower: 190,
      averageRpm: 88,
      maxRpm: 102,
      kilojoules: 337,
      intensityPercent: 94,
      intensityFactor: 0.95,
    });
    const root: HTMLElement = document.createElement('div');

    // Act
    renderSummaryScreen(root, SUMMARY.id);

    // Assert
    expect(root.textContent).toContain('Elapsed');
    expect(root.textContent).toContain('Planned');
    expect(root.textContent).toContain('30:00');
    expect(root.textContent).toContain('190');
    expect(root.textContent).toContain('88');
    expect(root.textContent).toContain('102');
    expect(root.textContent).toContain('0.95');
    expect(root.textContent).toContain('337 kJ');
    expect(root.textContent).toContain('337 kcal');
    expect(root.textContent).toContain('Time in zone');
  });

  it('hides bike stats and shows the target cadence when the ride has no power', (): void => {
    // Arrange
    appendRideSummary({
      ...SUMMARY,
      averageWatts: 0,
      maxWatts: 0,
      miles: 0,
      averageMph: 0,
      secondsInZone: [0, 0, 0, 0, 0, 0, 0],
      missingSeconds: 900,
      durationSeconds: 900,
      plannedSeconds: 1800,
      plannedSecondsInZone: [0, 600, 0, 300, 0, 0, 0],
      endedEarly: true,
    });
    const root: HTMLElement = document.createElement('div');

    // Act
    renderSummaryScreen(root, SUMMARY.id);

    // Assert
    expect(root.textContent).toContain('Elapsed');
    expect(root.textContent).toContain('15:00');
    expect(root.textContent).toContain('Planned');
    expect(root.textContent).toContain('30:00');
    expect(root.textContent).toContain('70–85 rpm');
    expect(root.textContent).toContain('Planned zones');
    expect(root.textContent).toContain('Ended early');
    expect(root.textContent).not.toContain('Avg watts');
    expect(root.textContent).not.toContain('Miles');
    expect(root.textContent).not.toContain('NP');
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
