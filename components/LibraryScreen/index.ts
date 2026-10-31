import renderRideProfile from '@/components/RideProfile';
import filterRides, { loadLibraryFilters, saveLibraryFilters, type LibraryFilters } from '@/lib/client/helpers/library-filters';
import { DIFFICULTY_LABELS, DIFFICULTY_ORDER, difficultyRank } from '@/lib/client/models/difficulty-labels';
import { RIDES } from '@/lib/client/models/rides';
import type { Difficulty, Ride } from '@/lib/client/models/types';

const HISTORY_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
const SETTINGS_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';

function buildLink(href: string, label: string, detail: string | null): HTMLAnchorElement {
  const link: HTMLAnchorElement = document.createElement('a');
  link.className = 'ride-link';
  link.href = href;

  const name: HTMLSpanElement = document.createElement('span');
  name.className = 'ride-name';
  name.textContent = label;
  link.append(name);

  if (detail !== null) {
    const difficulty: HTMLSpanElement = document.createElement('span');
    difficulty.className = 'ride-difficulty';
    difficulty.textContent = detail;
    link.append(difficulty);
  }

  return link;
}

function rideDetail(ride: Ride): string {
  const label: string = DIFFICULTY_LABELS[ride.difficulty];
  return ride.ftpTest === undefined ? label : `${label} · ${ride.ftpTest.seconds / 60} min FTP test`;
}

function buildRideCard(ride: Ride): HTMLAnchorElement {
  const link: HTMLAnchorElement = buildLink(`#/ride/${ride.id}`, ride.name, rideDetail(ride));
  link.classList.add('ride-card');
  const head: HTMLDivElement = document.createElement('div');
  head.className = 'ride-card-head';
  head.append(...link.childNodes);
  const shape: HTMLDivElement = document.createElement('div');
  shape.className = 'ride-shape';
  renderRideProfile(shape, { ride, position: null });
  link.append(head, shape);
  return link;
}

function compareRides(a: Ride, b: Ride): number {
  return difficultyRank(a.difficulty) - difficultyRank(b.difficulty) || a.name.localeCompare(b.name);
}

function buildSection(title: string, rides: Ride[]): HTMLElement {
  const section: HTMLElement = document.createElement('section');
  const heading: HTMLHeadingElement = document.createElement('h2');
  heading.textContent = title;
  section.append(heading);
  for (const ride of rides) {
    section.append(buildRideCard(ride));
  }
  return section;
}

function buildIconLink(href: string, label: string, icon: string): HTMLAnchorElement {
  const link: HTMLAnchorElement = document.createElement('a');
  link.className = 'icon-link';
  link.href = href;
  link.setAttribute('aria-label', label);
  link.title = label;
  link.innerHTML = icon;
  return link;
}

function buildHeader(): HTMLElement {
  const header: HTMLElement = document.createElement('header');
  header.className = 'library-header';
  const heading: HTMLHeadingElement = document.createElement('h1');
  heading.textContent = 'Tracks';
  const nav: HTMLElement = document.createElement('nav');
  nav.append(buildIconLink('#/history', 'History', HISTORY_ICON), buildIconLink('#/settings', 'Settings', SETTINGS_ICON));
  header.append(heading, nav);
  return header;
}

function buildChip<K extends keyof LibraryFilters>(
  root: HTMLElement,
  rides: Ride[],
  filters: LibraryFilters,
  key: K,
  value: LibraryFilters[K],
  label: string,
): HTMLButtonElement {
  const button: HTMLButtonElement = document.createElement('button');
  button.type = 'button';
  button.className = 'filter-chip';
  button.textContent = label;
  button.setAttribute('aria-pressed', String(filters[key] === value));
  button.addEventListener('click', (): void => {
    const next: LibraryFilters = { ...filters, [key]: value };
    saveLibraryFilters(next);
    renderLibraryScreen(root, rides);
  });
  return button;
}

function buildFilterRow<K extends keyof LibraryFilters>(
  root: HTMLElement,
  rides: Ride[],
  filters: LibraryFilters,
  key: K,
  groupLabel: string,
  options: { value: LibraryFilters[K]; label: string }[],
): HTMLElement {
  const row: HTMLDivElement = document.createElement('div');
  row.className = 'filter-row';
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', groupLabel);
  for (const option of options) {
    row.append(buildChip(root, rides, filters, key, option.value, option.label));
  }
  return row;
}

function buildFilters(root: HTMLElement, rides: Ride[], filters: LibraryFilters): HTMLElement {
  const bar: HTMLDivElement = document.createElement('div');
  bar.className = 'library-filters';
  const grades: { value: Difficulty; label: string }[] = DIFFICULTY_ORDER.map((difficulty: Difficulty) => ({
    value: difficulty,
    label: DIFFICULTY_LABELS[difficulty],
  }));
  bar.append(
    buildFilterRow(root, rides, filters, 'duration', 'Duration', [
      { value: 'all', label: 'All' },
      { value: 1800, label: '30 min' },
      { value: 2700, label: '45 min' },
    ]),
    buildFilterRow(root, rides, filters, 'difficulty', 'Difficulty', [{ value: 'all', label: 'All' }, ...grades]),
  );
  return bar;
}

export default function renderLibraryScreen(root: HTMLElement, rides: Ride[] = RIDES): void {
  const filters: LibraryFilters = loadLibraryFilters();
  const matched: Ride[] = filterRides(rides, filters).sort(compareRides);
  const thirty: Ride[] = matched.filter((ride: Ride): boolean => ride.lengthSeconds === 1800);
  const fortyFive: Ride[] = matched.filter((ride: Ride): boolean => ride.lengthSeconds === 2700);
  const children: HTMLElement[] = [buildHeader(), buildFilters(root, rides, filters)];
  if (thirty.length > 0) {
    children.push(buildSection('30 minutes', thirty));
  }
  if (fortyFive.length > 0) {
    children.push(buildSection('45 minutes', fortyFive));
  }
  if (thirty.length === 0 && fortyFive.length === 0) {
    const empty: HTMLParagraphElement = document.createElement('p');
    empty.className = 'library-empty';
    empty.textContent = 'No tracks match these filters.';
    children.push(empty);
  }
  root.replaceChildren(...children);
}
