import loadHistory from '@/lib/client/helpers/load-history';
import type { RideSummary } from '@/lib/client/models/types';

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
  detail.textContent = `${new Date(summary.startedAt).toLocaleDateString()} ${summary.averageWatts} W`;

  link.append(name, detail);
  return link;
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

  root.replaceChildren(heading, ...history.map(buildRideLink), buildBackLink());
}
