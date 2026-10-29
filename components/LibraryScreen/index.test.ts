import { describe, expect, it } from 'vitest';
import renderLibraryScreen from '@/components/LibraryScreen';
import { RIDES } from '@/lib/client/models/rides';

describe('renderLibraryScreen', () => {
  it('lists every ride with its shape and difficulty', () => {
    // Arrange
    const root: HTMLElement = document.createElement('div');

    // Act
    renderLibraryScreen(root);

    // Assert
    const cards: NodeListOf<Element> = root.querySelectorAll('.ride-card');
    expect(cards).toHaveLength(RIDES.length);
    expect(cards[0].querySelectorAll('.ride-shape .ride-profile-bar').length).toBeGreaterThanOrEqual(10);
    expect(cards[0].textContent).toContain('Moderate');
  });
});
