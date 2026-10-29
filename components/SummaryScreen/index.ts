import formatClock from '@/lib/client/helpers/format-clock';
import loadHistory from '@/lib/client/helpers/load-history';
import { DIFFICULTY_LABELS } from '@/lib/client/models/difficulty-labels';
import { ZONES } from '@/lib/client/models/zones';
import type { RideSummary } from '@/lib/client/models/types';

const CHART_HEIGHT_PX = 120;
const MIN_BAR_HEIGHT_PX = 2;

function buildElement(tag: string, className: string, text: string): HTMLElement {
  const element: HTMLElement = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function buildLink(href: string, label: string): HTMLAnchorElement {
  const link: HTMLAnchorElement = document.createElement('a');
  link.href = href;
  link.textContent = label;
  return link;
}

function buildStatCell(label: string, value: string): HTMLElement {
  const cell: HTMLElement = buildElement('div', 'summary-stat', '');
  cell.append(buildElement('span', 'summary-stat-label', label), buildElement('span', 'summary-stat-value', value));
  return cell;
}

function buildStats(summary: RideSummary): HTMLElement {
  const grid: HTMLElement = buildElement('section', 'summary-stats', '');
  grid.append(
    buildStatCell('Duration', formatClock(summary.durationSeconds)),
    buildStatCell('Avg watts', String(summary.averageWatts)),
    buildStatCell('Max watts', String(summary.maxWatts)),
    buildStatCell('Miles', summary.miles.toFixed(2)),
    buildStatCell('Avg mph', summary.averageMph.toFixed(1)),
    buildStatCell('FTP used', String(summary.ftpUsed)),
  );

  if (summary.ftpTestSeconds !== undefined && summary.ftpTestAverageWatts !== undefined) {
    grid.append(buildStatCell('Test avg watts', String(Math.round(summary.ftpTestAverageWatts))));
  }

  return grid;
}

function buildZoneChart(summary: RideSummary): HTMLElement {
  const section: HTMLElement = document.createElement('section');
  section.append(buildElement('h2', '', 'Time in zone'));

  const maxSeconds: number = Math.max(...summary.secondsInZone);
  const bars: HTMLElement = buildElement('div', 'zone-bars', '');

  summary.secondsInZone.forEach((seconds: number, index: number): void => {
    const column: HTMLElement = buildElement('div', 'zone-column', '');
    const bar: HTMLElement = buildElement('div', 'zone-bar', '');
    const proportion: number = maxSeconds > 0 ? seconds / maxSeconds : 0;
    bar.style.background = ZONES[index].colour;
    bar.style.height = `${Math.max(MIN_BAR_HEIGHT_PX, Math.round(proportion * CHART_HEIGHT_PX))}px`;
    column.append(
      buildElement('span', 'zone-time', formatClock(seconds)),
      bar,
      buildElement('span', 'zone-number', String(index + 1)),
    );
    bars.append(column);
  });

  section.append(bars);
  return section;
}

function buildSummary(summary: RideSummary): HTMLElement[] {
  const heading: HTMLElement = document.createElement('h1');
  heading.textContent = summary.rideName;

  const date: string = new Date(summary.startedAt).toLocaleString();
  const detail: string = `${date} - ${DIFFICULTY_LABELS[summary.difficulty as keyof typeof DIFFICULTY_LABELS]}`;

  const elements: HTMLElement[] = [heading, buildElement('p', 'summary-detail', detail), buildStats(summary), buildZoneChart(summary)];

  if (summary.missingSeconds > 0) {
    elements.push(buildElement('p', 'summary-missing', `No bike data for ${summary.missingSeconds} s`));
  }

  const footer: HTMLElement = document.createElement('footer');
  footer.append(buildLink('#/', 'Back to library'), buildLink('#/history', 'History'));
  elements.push(footer);
  return elements;
}

export default function renderSummaryScreen(root: HTMLElement, summaryId: string): void {
  const summary: RideSummary | undefined = loadHistory().find((candidate: RideSummary): boolean => candidate.id === summaryId);

  if (!summary) {
    root.replaceChildren(buildElement('p', 'summary-missing', 'Ride not found'), buildLink('#/', 'Back to library'));
    return;
  }

  root.replaceChildren(...buildSummary(summary));
}
