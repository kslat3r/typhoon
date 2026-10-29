import type { RideProfileProps } from '@/components/RideProfile/types';
import { ZONES } from '@/lib/client/models/zones';
import type { RideInterval } from '@/lib/client/models/types';

const SVG_NS = 'http://www.w3.org/2000/svg';
const WIDTH = 1000;
const HEIGHT = 300;
const GAP = 1;
const LINE_WIDTH = 3;

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

  root.replaceChildren(svg);
}
