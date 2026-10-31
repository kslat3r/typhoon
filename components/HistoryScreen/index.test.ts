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
