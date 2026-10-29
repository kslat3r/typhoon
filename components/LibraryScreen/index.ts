import renderRideProfile from '@/components/RideProfile';
import { DIFFICULTY_LABELS } from '@/lib/client/models/difficulty-labels';
import { RIDES } from '@/lib/client/models/rides';
import type { Ride } from '@/lib/client/models/types';

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

function buildSection(title: string): HTMLElement {
  const section: HTMLElement = document.createElement('section');
  const heading: HTMLHeadingElement = document.createElement('h2');
  heading.textContent = title;
  section.append(heading);
  return section;
}

function buildRideSection(title: string, lengthSeconds: number): HTMLElement {
  const section: HTMLElement = buildSection(title);
  const rides: Ride[] = RIDES.filter((ride: Ride): boolean => ride.lengthSeconds === lengthSeconds).sort(
    (a: Ride, b: Ride): number => a.difficulty - b.difficulty || a.name.localeCompare(b.name),
  );

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
  heading.textContent = 'Typhoon';
  const nav: HTMLElement = document.createElement('nav');
  nav.append(buildIconLink('#/history', 'History', HISTORY_ICON), buildIconLink('#/settings', 'Settings', SETTINGS_ICON));
  header.append(heading, nav);
  return header;
}

export default function renderLibraryScreen(root: HTMLElement): void {
  root.replaceChildren(buildHeader(), buildRideSection('30 minutes', 1800), buildRideSection('45 minutes', 2700));
}
