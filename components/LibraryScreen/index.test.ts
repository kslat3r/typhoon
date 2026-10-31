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

function choose(root: HTMLElement, group: string, label: string): void {
  const field: Element | undefined = [...root.querySelectorAll('.filter-field')].find(
    (element) => element.querySelector('.filter-label')?.textContent === group,
  );
  const select: HTMLSelectElement = field?.querySelector('select') as HTMLSelectElement;
  const option: HTMLOptionElement | undefined = [...select.options].find((item) => item.text === label);
  select.value = option?.value ?? '';
  select.dispatchEvent(new Event('change'));
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
    expect(cards[0].textContent).toContain('First Light');
    expect(cards[0].textContent).toContain('Gentle · 30 min');
    expect(root.querySelector('h2')).toBeNull();
    expect(root.querySelector('h1')?.textContent).toBe('Tracks');
    expect(root.querySelector('a[href="#/history"]')?.getAttribute('aria-label')).toBe('History');
    expect(root.querySelector('a[href="#/settings"]')?.getAttribute('aria-label')).toBe('Settings');
    expect(root.textContent).toContain('1 min FTP test');
    expect(root.textContent).toContain('Moderate');
    expect(root.textContent).toContain('Very hard');
    const selects: HTMLSelectElement[] = [...root.querySelectorAll('select')];
    expect(selects).toHaveLength(2);
    expect([...selects[0].options].map((option) => option.text)).toEqual(['All', '30 min', '45 min']);
    expect([...selects[1].options].map((option) => option.text)).toEqual([
      'All',
      'Gentle',
      'Easy',
      'Moderate',
      'Hard',
      'Very hard',
    ]);
    expect(selects[0].value).toBe('all');
    expect(selects[1].value).toBe('all');
    expect(root.querySelector('.filter-chip')).toBeNull();
  });

  it('filters to Gentle 30 minute tracks and remembers the choice', () => {
    // Arrange
    const root: HTMLElement = document.createElement('div');
    renderLibraryScreen(root);

    // Act
    choose(root, 'Duration', '30 min');
    choose(root, 'Difficulty', 'Gentle');

    // Assert
    const cards: NodeListOf<Element> = root.querySelectorAll('.ride-card');
    expect(cards).toHaveLength(5);
    for (const card of cards) {
      expect(card.textContent).toContain('Gentle · 30 min');
      expect(card.getAttribute('href')).toContain('-30');
    }
    expect(root.querySelector('h2')).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.filters)).toBe('{"duration":1800,"difficulty":1}');
    const again: HTMLElement = document.createElement('div');
    renderLibraryScreen(again);
    const selected: string[] = [...again.querySelectorAll('select')].map((select) => select.selectedOptions[0]?.text ?? '');
    expect(selected).toEqual(['30 min', 'Gentle']);
  });

  it('shows an empty state when nothing matches', () => {
    // Arrange
    const root: HTMLElement = document.createElement('div');
    localStorage.setItem(STORAGE_KEYS.filters, JSON.stringify({ duration: 1800, difficulty: 1 }));

    // Act
    renderLibraryScreen(root, [ONLY_HARD]);

    // Assert
    expect(root.querySelectorAll('.ride-card')).toHaveLength(0);
    expect(root.querySelector('.library-empty')?.textContent).toBe('No tracks match these filters.');
    expect(root.querySelector('h2')).toBeNull();
  });
});
