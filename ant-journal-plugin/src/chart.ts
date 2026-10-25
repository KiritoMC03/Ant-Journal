import type { series } from './journal';

type Point = ReturnType<typeof series>[number];

// Join observed values in date order. An explicitly unknown value starts a new segment.
// Dates without observations add no points; isolated measurements remain markers only.
export function chartLinePath(points: Point[], x: (date: string) => number, y: (value: number) => number): string {
  const segments: string[] = [];
  let segment: string[] = [];
  const finish = () => {
    if (segment.length > 1) segments.push(segment.join(' '));
    segment = [];
  };
  for (const point of points) {
    if (point.value === null) { finish(); continue; }
    segment.push(`${segment.length ? 'L' : 'M'} ${x(point.date)} ${y(point.value)}`);
  }
  finish();
  return segments.join(' ');
}
