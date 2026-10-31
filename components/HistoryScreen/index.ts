import deleteRideSummary from '@/lib/client/helpers/delete-ride-summary';
import formatClock from '@/lib/client/helpers/format-clock';
import loadHistory from '@/lib/client/helpers/load-history';
import targetCadenceLabel from '@/lib/client/helpers/target-cadence-label';
import type { RideSummary } from '@/lib/client/models/types';

function buildDetail(text: string): HTMLSpanElement {
  const detail: HTMLSpanElement = document.createElement('span');
  detail.className = 'ride-difficulty';
  detail.textContent = text;
  return detail;
}

function historyDetail(summary: RideSummary): string {
  const date: string = new Date(summary.startedAt).toLocaleDateString();
  const duration: string = formatClock(summary.durationSeconds);
  if (summary.averageWatts > 0 || summary.maxWatts > 0) {
    const cadence: string = summary.averageRpm !== undefined && summary.averageRpm > 0 ? ` · ${summary.averageRpm} rpm` : '';
    return `${date} · ${duration} · ${summary.averageWatts} W${cadence}`;
  }
  return `${date} · ${duration}`;
}

function buildBackLink(): HTMLAnchorElement {
  const link: HTMLAnchorElement = document.createElement('a');
  link.href = '#/';
  link.textContent = 'Back to library';
  return link;
}

function buildRideLink(summary: RideSummary): HTMLAnchorElement {
  const link: HTMLAnchorElement = document.createElement('a');
  link.className = 'ride-link';
  link.href = `#/summary/${summary.id}`;

  const name: HTMLSpanElement = document.createElement('span');
  name.className = 'ride-name';
  name.textContent = summary.rideName;

  const detail: HTMLSpanElement = document.createElement('span');
  detail.className = 'ride-difficulty';
  detail.textContent = historyDetail(summary);

  link.append(name, detail);
  const target: string | null = summary.averageWatts > 0 || summary.maxWatts > 0 ? null : targetCadenceLabel(summary.plannedSecondsInZone ?? []);
  if (target !== null) {
    link.append(buildDetail(`Target ${target}`));
  }
  if (summary.endedEarly === true) {
    const ended: HTMLSpanElement = document.createElement('span');
    ended.className = 'ride-difficulty';
    ended.textContent = 'Ended early';
    link.append(ended);
  }
  return link;
}

function buildRow(summary: RideSummary, redraw: () => void): HTMLElement {
  const row: HTMLElement = document.createElement('div');
  row.className = 'history-row';

  const button: HTMLButtonElement = document.createElement('button');
  button.type = 'button';
  button.className = 'history-delete';
  button.setAttribute('aria-label', `Delete ${summary.rideName}`);
  button.textContent = 'Delete';
  button.addEventListener('click', (): void => {
    if (!window.confirm('Delete this ride?')) {
      return;
    }
    deleteRideSummary(summary.id);
    redraw();
  });

  row.append(buildRideLink(summary), button);
  return row;
}

export default function renderHistoryScreen(root: HTMLElement): void {
  const heading: HTMLHeadingElement = document.createElement('h1');
  heading.textContent = 'History';

  const history: RideSummary[] = loadHistory();
  if (history.length === 0) {
    const empty: HTMLParagraphElement = document.createElement('p');
    empty.textContent = 'No rides yet';
    root.replaceChildren(heading, empty, buildBackLink());
    return;
  }

  root.replaceChildren(heading, ...history.map((summary: RideSummary): HTMLElement => buildRow(summary, (): void => renderHistoryScreen(root))), buildBackLink());
}
