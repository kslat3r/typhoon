import { DIFFICULTY_LABELS } from '@/lib/client/models/difficulty-labels';
import { RIDES } from '@/lib/client/models/rides';
import type { Ride } from '@/lib/client/models/types';

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
    section.append(buildLink(`#/ride/${ride.id}`, ride.name, DIFFICULTY_LABELS[ride.difficulty]));
  }

  return section;
}

function buildFtpSection(): HTMLElement {
  const section: HTMLElement = buildSection('FTP test');
  const tests: { seconds: number; label: string }[] = [
    { seconds: 60, label: '1 minute test' },
    { seconds: 180, label: '3 minute test' },
    { seconds: 300, label: '5 minute test' },
  ];

  for (const test of tests) {
    section.append(buildLink(`#/ftp-test/${test.seconds}`, test.label, null));
  }

  return section;
}

function buildFooter(): HTMLElement {
  const footer: HTMLElement = document.createElement('footer');
  footer.append(buildLink('#/history', 'History', null), buildLink('#/settings', 'Settings', null));
  return footer;
}

export default function renderLibraryScreen(root: HTMLElement): void {
  const heading: HTMLHeadingElement = document.createElement('h1');
  heading.textContent = 'Typhoon';

  root.replaceChildren(
    heading,
    buildRideSection('30 minutes', 1800),
    buildRideSection('45 minutes', 2700),
    buildFtpSection(),
    buildFooter(),
  );
}
