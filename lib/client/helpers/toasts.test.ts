import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dismissToasts, mountToasts, showToast } from '@/lib/client/helpers/toasts';

function messages(): string[] {
  return [...document.querySelectorAll('.toast-message')].map((element) => element.textContent ?? '');
}

describe('toasts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.replaceChildren();
    const parent: HTMLElement = document.createElement('div');
    document.body.append(parent);
    mountToasts(parent);
  });

  afterEach(() => {
    dismissToasts();
    vi.useRealTimers();
  });

  it('stacks toasts and dismisses one from its close button', () => {
    // Arrange / Act
    showToast('Connecting bike', 'info');
    showToast('Could not connect bike: GATT connect failed', 'error');

    // Assert
    expect(messages()).toEqual(['Connecting bike', 'Could not connect bike: GATT connect failed']);
    expect(document.querySelector('.toast-host')?.getAttribute('aria-live')).toBe('polite');
    expect(document.querySelector('.toast-error')?.getAttribute('role')).toBe('alert');
    const close: HTMLButtonElement = document.querySelector('.toast-error .toast-close') as HTMLButtonElement;
    expect(close.getAttribute('aria-label')).toBe('Dismiss');
    expect(close.textContent).toBe('×');

    // Act
    close.click();

    // Assert
    expect(messages()).toEqual(['Connecting bike']);
  });

  it('auto-dismisses info and success after 4 seconds and keeps errors', () => {
    // Arrange
    showToast('Connecting bike', 'info');
    showToast('Connected to Wattbike', 'success');
    showToast('Could not connect bike: Bluetooth picker failed', 'error');

    // Act
    vi.advanceTimersByTime(3999);

    // Assert
    expect(messages()).toHaveLength(3);

    // Act
    vi.advanceTimersByTime(1);

    // Assert
    expect(messages()).toEqual(['Could not connect bike: Bluetooth picker failed']);

    // Act
    vi.advanceTimersByTime(8000);

    // Assert
    expect(messages()).toEqual(['Could not connect bike: Bluetooth picker failed']);
  });

  it('ignores a repeat of a message that is already open', () => {
    // Arrange / Act
    showToast('Reconnecting to bike: GATT connect failed', 'error');
    showToast('Reconnecting to bike: GATT connect failed', 'error');

    // Assert
    expect(messages()).toEqual(['Reconnecting to bike: GATT connect failed']);

    // Act
    dismissToasts((message: string): boolean => message.startsWith('Reconnecting to bike'));
    showToast('Reconnecting to bike: GATT connect failed', 'error');

    // Assert
    expect(messages()).toEqual(['Reconnecting to bike: GATT connect failed']);
  });
});
