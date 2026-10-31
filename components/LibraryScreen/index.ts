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
  const label: string = `${ride.lengthSeconds / 60} min · ${DIFFICULTY_LABELS[ride.difficulty]}`;
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
  return difficultyRank(a.difficulty) - difficultyRank(b.difficulty) || a.lengthSeconds - b.lengthSeconds || a.name.localeCompare(b.name);
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

function filterValue(filters: LibraryFilters, key: keyof LibraryFilters): string {
  const value: LibraryFilters[keyof LibraryFilters] = filters[key];
  return value === 'all' ? 'all' : String(value);
}

function applyFilter(filters: LibraryFilters, key: keyof LibraryFilters, raw: string): LibraryFilters {
  if (key === 'duration') {
    const duration: LibraryFilters['duration'] = raw === '1800' ? 1800 : raw === '2700' ? 2700 : 'all';
    return { ...filters, duration };
  }
  const parsed: number = Number(raw);
  const difficulty: LibraryFilters['difficulty'] = raw !== 'all' && DIFFICULTY_ORDER.includes(parsed as Difficulty) ? (parsed as Difficulty) : 'all';
  return { ...filters, difficulty };
}

function buildFilterSelect(
  root: HTMLElement,
  rides: Ride[],
  filters: LibraryFilters,
  key: keyof LibraryFilters,
  groupLabel: string,
  options: { value: string; label: string }[],
): HTMLLabelElement {
  const field: HTMLLabelElement = document.createElement('label');
  field.className = 'filter-field';
  const caption: HTMLSpanElement = document.createElement('span');
  caption.className = 'filter-label';
  caption.textContent = groupLabel;
  const select: HTMLSelectElement = document.createElement('select');
  select.className = 'filter-select';
  for (const option of options) {
    const item: HTMLOptionElement = document.createElement('option');
    item.value = option.value;
    item.textContent = option.label;
    select.append(item);
  }
  select.value = filterValue(filters, key);
  select.addEventListener('change', (): void => {
    saveLibraryFilters(applyFilter(filters, key, select.value));
    renderLibraryScreen(root, rides);
  });
  field.append(caption, select);
  return field;
}

function buildFilters(root: HTMLElement, rides: Ride[], filters: LibraryFilters): HTMLElement {
  const bar: HTMLDivElement = document.createElement('div');
  bar.className = 'library-filters';
  const grades: { value: string; label: string }[] = DIFFICULTY_ORDER.map((difficulty: Difficulty) => ({
    value: String(difficulty),
    label: DIFFICULTY_LABELS[difficulty],
  }));
  bar.append(
    buildFilterSelect(root, rides, filters, 'duration', 'Duration', [
      { value: 'all', label: 'All' },
      { value: '1800', label: '30 min' },
      { value: '2700', label: '45 min' },
    ]),
    buildFilterSelect(root, rides, filters, 'difficulty', 'Difficulty', [{ value: 'all', label: 'All' }, ...grades]),
  );
  return bar;
}

export default function renderLibraryScreen(root: HTMLElement, rides: Ride[] = RIDES): void {
  const filters: LibraryFilters = loadLibraryFilters();
  const matched: Ride[] = filterRides(rides, filters).sort(compareRides);
  const children: HTMLElement[] = [buildHeader(), buildFilters(root, rides, filters), ...matched.map(buildRideCard)];
  if (matched.length === 0) {
    const empty: HTMLParagraphElement = document.createElement('p');
    empty.className = 'library-empty';
    empty.textContent = 'No tracks match these filters.';
    children.push(empty);
  }
  root.replaceChildren(...children);
}
