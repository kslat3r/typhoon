// Info and success toasts leave on their own. Errors stay until dismissed so a
// reconnect loop can keep one toast up instead of flashing a new one every few seconds.
const AUTO_DISMISS_MS = 4000;

export type ToastTone = 'info' | 'success' | 'error';

const timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

export function mountToasts(parent: HTMLElement): HTMLElement {
  const existing: HTMLElement | null = parent.querySelector('.toast-host');
  if (existing) {
    return existing;
  }
  const host: HTMLElement = document.createElement('div');
  host.className = 'toast-host';
  host.setAttribute('aria-live', 'polite');
  host.setAttribute('aria-relevant', 'additions');
  parent.append(host);
  return host;
}

function host(): HTMLElement | null {
  return document.querySelector('.toast-host');
}

function dismiss(toast: HTMLElement): void {
  const timer: ReturnType<typeof setTimeout> | undefined = timers.get(toast);
  if (timer !== undefined) {
    clearTimeout(timer);
    timers.delete(toast);
  }
  toast.remove();
}

export function dismissToasts(match?: (message: string) => boolean): void {
  const region: HTMLElement | null = host();
  if (region === null) {
    return;
  }
  for (const toast of [...region.querySelectorAll<HTMLElement>('.toast')]) {
    const message: string = toast.querySelector('.toast-message')?.textContent ?? '';
    if (match === undefined || match(message)) {
      dismiss(toast);
    }
  }
}

export function showToast(message: string, tone: ToastTone): void {
  const region: HTMLElement | null = host();
  if (region === null) {
    return;
  }
  const open: HTMLElement[] = [...region.querySelectorAll<HTMLElement>('.toast')];
  if (open.some((toast: HTMLElement): boolean => toast.querySelector('.toast-message')?.textContent === message)) {
    return;
  }

  const toast: HTMLElement = document.createElement('div');
  toast.className = `toast toast-${tone}`;
  if (tone === 'error') {
    toast.setAttribute('role', 'alert');
  }

  const text: HTMLParagraphElement = document.createElement('p');
  text.className = 'toast-message';
  text.textContent = message;

  const close: HTMLButtonElement = document.createElement('button');
  close.type = 'button';
  close.className = 'toast-close';
  close.setAttribute('aria-label', 'Dismiss');
  close.textContent = '×';
  close.addEventListener('click', (): void => {
    dismiss(toast);
  });

  toast.append(text, close);
  region.append(toast);

  if (tone !== 'error') {
    timers.set(
      toast,
      setTimeout((): void => {
        dismiss(toast);
      }, AUTO_DISMISS_MS),
    );
  }
}
