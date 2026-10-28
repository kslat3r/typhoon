import type { RideProfileProps } from '@/components/RideProfile/types';
import { ZONES } from '@/lib/client/models/zones';
import type { RideInterval } from '@/lib/client/models/types';

const SVG_NS = 'http://www.w3.org/2000/svg';
const WIDTH = 1000;
const HEIGHT = 300;
const GAP = 1;
const DOT_RADIUS = 8;

function percentToY(percent: number): number {
  const zoneIndex: number = ZONES.findIndex((zone): boolean => percent < zone.maxPercent);
  const index: number = zoneIndex === -1 ? ZONES.length - 1 : zoneIndex;
  const zone = ZONES[index];
  const fraction: number =
    zone.zone === 7 ? Math.min((percent - 151) / 50, 1) : (percent - zone.minPercent) / (zone.maxPercent - zone.minPercent);
  const y: number = HEIGHT - ((index + fraction) / ZONES.length) * HEIGHT;
  return Math.min(Math.max(y, DOT_RADIUS), HEIGHT - DOT_RADIUS);
}

function buildBar(interval: RideInterval, index: number, x: number, width: number, props: RideProfileProps): SVGRectElement {
  const height: number = (interval.zone / ZONES.length) * HEIGHT;
  const colour: string = ZONES[interval.zone - 1].colour;
  const currentIndex: number | null = props.position === null ? null : props.position.index;
  const bar: SVGRectElement = document.createElementNS(SVG_NS, 'rect');
  bar.setAttribute('class', index === currentIndex ? 'ride-profile-bar ride-profile-bar-current' : 'ride-profile-bar');
  bar.setAttribute('x', String(x));
  bar.setAttribute('y', String(HEIGHT - height));
  bar.setAttribute('width', String(width));
  bar.setAttribute('height', String(height));
  bar.setAttribute('fill', colour);

  if (currentIndex !== null && index < currentIndex) {
    bar.setAttribute('fill-opacity', '0.45');
  }

  if (index === currentIndex) {
    bar.setAttribute('stroke', '#ffffff');
    bar.setAttribute('stroke-width', '3');
  }

  return bar;
}

function buildDot(x: number, width: number, props: RideProfileProps, percentOfFtp: number): SVGCircleElement {
  const position = props.position;
  if (position === null) {
    throw new Error('buildDot requires a position');
  }

  const dot: SVGCircleElement = document.createElementNS(SVG_NS, 'circle');
  dot.setAttribute('class', 'ride-profile-dot');
  dot.setAttribute('cx', String(x + (position.secondsIntoInterval / position.interval.seconds) * width));
  dot.setAttribute('cy', String(percentToY(percentOfFtp)));
  dot.setAttribute('r', String(DOT_RADIUS));
  dot.setAttribute('fill', '#ffffff');
  dot.setAttribute('stroke', ZONES[position.interval.zone - 1].colour);
  dot.setAttribute('stroke-width', '4');
  return dot;
}

export default function renderRideProfile(root: HTMLElement, props: RideProfileProps): void {
  const svg: SVGSVGElement = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'ride-profile');
  svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');

  const intervals: RideInterval[] = props.ride.intervals;
  const totalSeconds: number = intervals.reduce((sum: number, interval: RideInterval): number => sum + interval.seconds, 0);
  const usableWidth: number = WIDTH - GAP * (intervals.length - 1);
  let x = 0;
  let currentX = 0;
  let currentWidth = 0;

  intervals.forEach((interval: RideInterval, index: number): void => {
    const width: number = (interval.seconds / totalSeconds) * usableWidth;
    svg.append(buildBar(interval, index, x, width, props));

    if (props.position !== null && index === props.position.index) {
      currentX = x;
      currentWidth = width;
    }

    x += width + GAP;
  });

  if (props.position !== null && props.percentOfFtp !== null) {
    svg.append(buildDot(currentX, currentWidth, props, props.percentOfFtp));
  }

  root.replaceChildren(svg);
}
