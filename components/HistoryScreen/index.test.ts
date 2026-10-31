import { beforeEach, describe, expect, it, vi } from 'vitest';
import renderHistoryScreen from '@/components/HistoryScreen';
import appendRideSummary from '@/lib/client/helpers/append-ride-summary';
import loadHistory from '@/lib/client/helpers/load-history';
import type { RideSummary } from '@/lib/client/models/types';

function buildSummary(id: string, rideName: string): RideSummary {
  return {
    id,
    rideId: 'ride',
    rideName,
    difficulty: 3,
    startedAt: '2026-10-28T08:00:00.000Z',
    durationSeconds: 1800,
    averageWatts: 150,
    maxWatts: 300,
    miles: 10,
    averageMph: 20,
    secondsInZone: [0, 0, 0, 0, 0, 0, 0],
    missingSeconds: 0,
    ftpUsed: 150,
  };
}

function textOf(root: HTMLElement, rideName: string): string {
  const row: HTMLElement | undefined = Array.from(root.querySelectorAll<HTMLElement>('.history-row')).find((candidate: HTMLElement): boolean =>
    candidate.textContent?.includes(rideName) === true,
  );
  return row?.textContent ?? '';
}

function deleteButton(root: HTMLElement, rideName: string): HTMLButtonElement {
  const row: HTMLElement | undefined = Array.from(root.querySelectorAll<HTMLElement>('.history-row')).find((candidate: HTMLElement): boolean =>
    candidate.textContent?.includes(rideName) === true,
  );
  const button: HTMLButtonElement | null = row?.querySelector('button') ?? null;
  if (!button) {
    throw new Error(`No delete button for ${rideName}`);
  }
  return button;
}

describe('renderHistoryScreen', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('deletes one ride after confirmation and keeps the others', () => {
    // Arrange
    appendRideSummary(buildSummary('keep', 'Keep ride'));
    appendRideSummary(buildSummary('drop', 'Drop ride'));
    const root: HTMLElement = document.createElement('div');
    document.body.replaceChildren(root);
    renderHistoryScreen(root);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    // Act
    deleteButton(root, 'Drop ride').click();

    // Assert
    expect(confirm).toHaveBeenCalledWith('Delete this ride?');
    expect(loadHistory().map((summary: RideSummary): string => summary.id)).toEqual(['keep']);
    expect(root.textContent).toContain('Keep ride');
    expect(root.textContent).not.toContain('Drop ride');
    expect(deleteButton(root, 'Keep ride').classList.contains('history-delete')).toBe(true);
  });

  it('keeps the ride when deletion is cancelled', () => {
    // Arrange
    appendRideSummary(buildSummary('keep', 'Keep ride'));
    const root: HTMLElement = document.createElement('div');
    renderHistoryScreen(root);
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    // Act
    deleteButton(root, 'Keep ride').click();

    // Assert
    expect(loadHistory()).toHaveLength(1);
    expect(root.textContent).toContain('Keep ride');
  });

  it('shows only the date, title, and duration on each row', () => {
    // Arrange
    const startedAt = '2026-10-28T08:00:00.000Z';
    appendRideSummary({ ...buildSummary('bike', 'Edge Work'), averageRpm: 88, durationSeconds: 1800, averageWatts: 187, endedEarly: true, startedAt });
    appendRideSummary({
      ...buildSummary('manual', 'Rolling Tempo'),
      averageWatts: 0,
      maxWatts: 0,
      miles: 0,
      durationSeconds: 900,
      plannedSecondsInZone: [0, 900, 0, 0, 0, 0, 0],
      endedEarly: true,
      startedAt,
    });
    const root: HTMLElement = document.createElement('div');

    // Act
    renderHistoryScreen(root);

    // Assert
    const date: string = new Date(startedAt).toLocaleDateString();
    const bike: string = textOf(root, 'Edge Work');
    const manual: string = textOf(root, 'Rolling Tempo');
    expect(bike).toContain('Edge Work');
    expect(bike).toContain(date);
    expect(bike).toContain('30:00');
    expect(bike).not.toContain('187 W');
    expect(bike).not.toContain('rpm');
    expect(bike).not.toContain('Ended early');
    expect(manual).toContain('Rolling Tempo');
    expect(manual).toContain(date);
    expect(manual).toContain('15:00');
    expect(manual).not.toContain('Target');
    expect(manual).not.toContain('0 W');
    expect(manual).not.toContain('Ended early');
    expect(root.querySelector('a[href="#/summary/bike"]')).not.toBeNull();
    expect(deleteButton(root, 'Edge Work').classList.contains('history-delete')).toBe(true);
  });

  it('shows an empty history after the last ride is deleted', () => {
    // Arrange
    appendRideSummary(buildSummary('only', 'Only ride'));
    const root: HTMLElement = document.createElement('div');
    renderHistoryScreen(root);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    // Act
    deleteButton(root, 'Only ride').click();

    // Assert
    expect(loadHistory()).toEqual([]);
    expect(root.textContent).toContain('No rides yet');
  });
});
