import formatClock from '@/lib/client/helpers/format-clock';
import loadHistory from '@/lib/client/helpers/load-history';
import targetCadenceLabel from '@/lib/client/helpers/target-cadence-label';
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

function hasPower(summary: RideSummary): boolean {
  return summary.averageWatts > 0 || summary.maxWatts > 0;
}

function energyKj(summary: RideSummary): number | undefined {
  if (summary.kilojoules !== undefined && summary.kilojoules > 0) {
    return summary.kilojoules;
  }
  if (!hasPower(summary)) {
    return undefined;
  }
  const sampled: number = Math.max(0, summary.durationSeconds - summary.missingSeconds);
  if (sampled <= 0) {
    return undefined;
  }
  const kilojoules: number = Math.round((summary.averageWatts * sampled) / 1000);
  return kilojoules > 0 ? kilojoules : undefined;
}

function intensityPercent(summary: RideSummary): number | undefined {
  if (!hasPower(summary)) {
    return undefined;
  }
  if (summary.intensityPercent !== undefined) {
    return summary.intensityPercent;
  }
  if (summary.ftpUsed <= 0) {
    return undefined;
  }
  return Math.round((summary.averageWatts / summary.ftpUsed) * 100);
}

function appendStat(grid: HTMLElement, label: string, value: string | undefined): void {
  if (value === undefined) {
    return;
  }
  grid.append(buildStatCell(label, value));
}

function buildStats(summary: RideSummary): HTMLElement {
  const grid: HTMLElement = buildElement('section', 'summary-stats', '');
  const power: boolean = hasPower(summary);
  const kilojoules: number | undefined = energyKj(summary);
  const intensity: number | undefined = intensityPercent(summary);
  appendStat(grid, 'Elapsed', formatClock(summary.durationSeconds));
  if (summary.plannedSeconds !== undefined) {
    appendStat(grid, 'Planned', formatClock(summary.plannedSeconds));
  }
  if (power) {
    appendStat(grid, 'Avg watts', String(summary.averageWatts));
    appendStat(grid, 'Max watts', String(summary.maxWatts));
    appendStat(grid, 'NP', summary.normalizedPower === undefined ? undefined : String(summary.normalizedPower));
    appendStat(grid, '% FTP', intensity === undefined ? undefined : `${intensity}%`);
    appendStat(grid, 'IF', summary.intensityFactor === undefined ? undefined : String(summary.intensityFactor));
    appendStat(grid, 'Avg rpm', summary.averageRpm === undefined ? undefined : String(summary.averageRpm));
    appendStat(grid, 'Max rpm', summary.maxRpm === undefined ? undefined : String(summary.maxRpm));
    appendStat(grid, 'Miles', summary.miles > 0 ? summary.miles.toFixed(2) : undefined);
    appendStat(grid, 'Avg mph', summary.averageMph > 0 ? summary.averageMph.toFixed(1) : undefined);
    appendStat(grid, 'Energy', kilojoules === undefined ? undefined : `${kilojoules} kJ`);
    appendStat(grid, 'Calories', kilojoules === undefined ? undefined : `${kilojoules} kcal`);
  } else {
    const target: string | null = targetCadenceLabel(summary.plannedSecondsInZone ?? []);
    if (target !== null) {
      const cell: HTMLElement = buildStatCell('Target', target);
      cell.classList.add('summary-stat-wide');
      grid.append(cell);
    }
  }
  appendStat(grid, 'FTP used', summary.ftpUsed > 0 ? String(summary.ftpUsed) : undefined);

  if (summary.ftpTestSeconds !== undefined && summary.ftpTestAverageWatts !== undefined) {
    grid.append(buildStatCell('Test avg watts', String(Math.round(summary.ftpTestAverageWatts))));
  }

  return grid;
}

function buildZoneStack(zones: number[]): HTMLElement {
  const total: number = zones.reduce((sum: number, seconds: number): number => sum + seconds, 0);
  const stack: HTMLElement = buildElement('div', 'zone-stack', '');
  zones.forEach((seconds: number, index: number): void => {
    if (seconds <= 0 || total <= 0) {
      return;
    }
    const segment: HTMLElement = document.createElement('span');
    segment.style.width = `${(seconds / total) * 100}%`;
    segment.style.background = ZONES[index].colour;
    stack.append(segment);
  });
  return stack;
}

function buildZoneChart(zones: number[], heading: string): HTMLElement {
  const section: HTMLElement = document.createElement('section');
  section.append(buildElement('h2', '', heading), buildZoneStack(zones));

  const maxSeconds: number = Math.max(...zones);
  const bars: HTMLElement = buildElement('div', 'zone-bars', '');

  zones.forEach((seconds: number, index: number): void => {
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

function zoneChart(summary: RideSummary): HTMLElement | null {
  if (summary.secondsInZone.some((seconds: number): boolean => seconds > 0)) {
    return buildZoneChart(summary.secondsInZone, 'Time in zone');
  }
  if (summary.plannedSecondsInZone?.some((seconds: number): boolean => seconds > 0)) {
    return buildZoneChart(summary.plannedSecondsInZone, 'Planned zones');
  }
  return null;
}

function buildSummary(summary: RideSummary): HTMLElement[] {
  const heading: HTMLElement = document.createElement('h1');
  heading.textContent = summary.rideName;

  const date: string = new Date(summary.startedAt).toLocaleString();
  const ended: string = summary.endedEarly === true ? ' · Ended early' : '';
  const detail: string = `${date} - ${DIFFICULTY_LABELS[summary.difficulty as keyof typeof DIFFICULTY_LABELS]}${ended}`;

  const elements: HTMLElement[] = [heading, buildElement('p', 'summary-detail', detail), buildStats(summary)];
  const zones: HTMLElement | null = zoneChart(summary);
  if (zones !== null) {
    elements.push(zones);
  }

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
