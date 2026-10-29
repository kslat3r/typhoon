import type { RideProfileProps } from '@/components/RideProfile/types';
import { ZONES } from '@/lib/client/models/zones';
import type { RideInterval, ZoneNumber } from '@/lib/client/models/types';

const SVG_NS = 'http://www.w3.org/2000/svg';
const WIDTH = 1000;
const HEIGHT = 300;
const GAP = 1;
const DOT_RADIUS = 13;
const LINE_WIDTH = 3;

function percentToY(percent: number): number {
  const zoneIndex: number = ZONES.findIndex((zone): boolean => percent < zone.maxPercent);
  const index: number = zoneIndex === -1 ? ZONES.length - 1 : zoneIndex;
  const zone = ZONES[index];
  const fraction: number =
    zone.zone === 7 ? Math.min((percent - 151) / 50, 1) : (percent - zone.minPercent) / (zone.maxPercent - zone.minPercent);
  const y: number = HEIGHT - ((index + fraction) / ZONES.length) * HEIGHT;
  return Math.min(Math.max(y, DOT_RADIUS), HEIGHT - DOT_RADIUS);
}

function buildBar(interval: RideInterval, x: number, width: number): SVGRectElement {
  const height: number = ((interval.zone - 1) / ZONES.length) * HEIGHT;
  const colour: string = ZONES[interval.zone - 2].colour;
  const bar: SVGRectElement = document.createElementNS(SVG_NS, 'rect');
  bar.setAttribute('class', 'ride-profile-bar');
  bar.setAttribute('x', String(x));
  bar.setAttribute('y', String(HEIGHT - height));
  bar.setAttribute('width', String(width));
  bar.setAttribute('height', String(height));
  bar.setAttribute('fill', colour);
  return bar;
}

function buildRect(className: string, x: number, width: number): SVGRectElement {
  const rect: SVGRectElement = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('class', className);
  rect.setAttribute('x', String(x));
  rect.setAttribute('y', '0');
  rect.setAttribute('width', String(width));
  rect.setAttribute('height', String(HEIGHT));
  return rect;
}

function buildDot(x: number, zone: ZoneNumber, percentOfFtp: number): SVGCircleElement {
  const dot: SVGCircleElement = document.createElementNS(SVG_NS, 'circle');
  dot.setAttribute('class', 'ride-profile-dot');
  dot.setAttribute('cx', String(x));
  dot.setAttribute('cy', String(percentToY(percentOfFtp)));
  dot.setAttribute('r', String(DOT_RADIUS));
  dot.setAttribute('fill', '#ffffff');
  dot.setAttribute('stroke', ZONES[zone - 2].colour);
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
  const position = props.position;
  let x = 0;
  let lineX = 0;

  intervals.forEach((interval: RideInterval, index: number): void => {
    const width: number = (interval.seconds / totalSeconds) * usableWidth;
    svg.append(buildBar(interval, x, width));

    if (position !== null && index === position.index) {
      lineX = x + (position.secondsIntoInterval / position.interval.seconds) * width;
    }

    x += width + GAP;
  });

  if (position !== null) {
    svg.append(buildRect('ride-profile-mask', 0, lineX), buildRect('ride-profile-line', lineX - LINE_WIDTH / 2, LINE_WIDTH));
  }

  if (position !== null && props.percentOfFtp !== null) {
    svg.append(buildDot(lineX, position.interval.zone, props.percentOfFtp));
  }

  root.replaceChildren(svg);
}
