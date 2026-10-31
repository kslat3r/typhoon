import { beforeEach, describe, expect, it } from 'vitest';
import renderLibraryScreen from '@/components/LibraryScreen';
import { STORAGE_KEYS } from '@/lib/client/models/storage-keys';
import { RIDES } from '@/lib/client/models/rides';
import type { Ride } from '@/lib/client/models/types';

const ONLY_HARD: Ride = {
  id: 'only-hard',
  name: 'Only Hard',
  lengthSeconds: 2700,
  difficulty: 2,
  archetype: 'climb',
  intervals: [{ zone: 1, seconds: 2700 }],
};

function press(root: HTMLElement, group: string, label: string): void {
  const row: Element | undefined = [...root.querySelectorAll('.filter-row')].find((element) => element.getAttribute('aria-label') === group);
  const chip: HTMLButtonElement | undefined = [...(row?.querySelectorAll('button') ?? [])].find((button) => button.textContent === label);
  chip?.click();
}

describe('renderLibraryScreen', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('lists every ride with its shape and difficulty, easiest first', () => {
    // Arrange
    const root: HTMLElement = document.createElement('div');

    // Act
    renderLibraryScreen(root);

    // Assert
    const cards: NodeListOf<Element> = root.querySelectorAll('.ride-card');
    expect(cards).toHaveLength(RIDES.length);
    expect(cards[0].querySelectorAll('.ride-shape .ride-profile-bar').length).toBeGreaterThanOrEqual(10);
    expect(cards[0].textContent).toContain('Dew');
    expect(cards[0].textContent).toContain('Light');
    expect(root.querySelector('h1')?.textContent).toBe('Tracks');
    expect(root.querySelector('a[href="#/history"]')?.getAttribute('aria-label')).toBe('History');
    expect(root.querySelector('a[href="#/settings"]')?.getAttribute('aria-label')).toBe('Settings');
    expect(root.textContent).toContain('1 min FTP test');
    expect(root.textContent).toContain('Challenging');
    expect(root.textContent).toContain('Brutal');
    expect([...root.querySelectorAll('.filter-chip')].map((chip) => chip.textContent)).toEqual([
      'All',
      '30 min',
      '45 min',
      'All',
      'Light',
      'Easy',
      'Average',
      'Moderate',
      'Challenging',
      'Hard',
      'Very hard',
      'Severe',
      'Brutal',
    ]);
  });

  it('filters to Light 30 minute tracks and remembers the choice', () => {
    // Arrange
    const root: HTMLElement = document.createElement('div');
    renderLibraryScreen(root);

    // Act
    press(root, 'Duration', '30 min');
    press(root, 'Difficulty', 'Light');

    // Assert
    const cards: NodeListOf<Element> = root.querySelectorAll('.ride-card');
    expect(cards).toHaveLength(5);
    for (const card of cards) {
      expect(card.textContent).toContain('Light');
      expect(card.getAttribute('href')).toContain('-30');
    }
    expect([...root.querySelectorAll('h2')].map((heading) => heading.textContent)).toEqual(['30 minutes']);
    expect(localStorage.getItem(STORAGE_KEYS.filters)).toBe('{"duration":1800,"difficulty":6}');
    const again: HTMLElement = document.createElement('div');
    renderLibraryScreen(again);
    const pressed: string[] = [...again.querySelectorAll('.filter-chip[aria-pressed="true"]')].map((chip) => chip.textContent ?? '');
    expect(pressed).toEqual(['30 min', 'Light']);
  });

  it('shows an empty state when nothing matches', () => {
    // Arrange
    const root: HTMLElement = document.createElement('div');
    localStorage.setItem(STORAGE_KEYS.filters, JSON.stringify({ duration: 1800, difficulty: 6 }));

    // Act
    renderLibraryScreen(root, [ONLY_HARD]);

    // Assert
    expect(root.querySelectorAll('.ride-card')).toHaveLength(0);
    expect(root.querySelector('.library-empty')?.textContent).toBe('No tracks match these filters.');
    expect(root.querySelector('h2')).toBeNull();
  });
});
