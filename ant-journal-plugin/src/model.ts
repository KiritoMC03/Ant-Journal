export const COUNT_FIELDS = ['workers','queens','eggs','larvae','pupae','worker_deaths'] as const;
export const NUMBER_FIELDS = [...COUNT_FIELDS,'temperature_c','humidity_pct'] as const;
export const FEED_FIELDS = ['feed_syrup','feed_protein','feed_seeds'] as const;
export const BOOL_FIELDS = [...FEED_FIELDS,'watered'] as const;
export type NumberField = typeof NUMBER_FIELDS[number];
export type FeedField = typeof FEED_FIELDS[number];
export type Data = Record<string, unknown>;
export type Measurement =
  | { kind: 'known'; value: number; approximate: boolean }
  | { kind: 'unknown' | 'missing' }
  | { kind: 'invalid'; message: string };
export type Known = Extract<Measurement, { kind: 'known' }>;
export interface Issue { path: string; field: string; message: string; severity: 'error' | 'warning' }
export interface Source { path: string; text: string }
export interface Colony { id: string; species: string; name?: string; path: string; baseline: Measurement }
export interface Observation { path: string; date: string; colonyId: string; data: Data; values: Record<NumberField, Measurement> }
export interface Row {
  observation: Observation;
  living: Measurement;
  cumulativeDeaths: Measurement;
  knownDeathsSubtotal: number;
  produced: Measurement;
  totalEverObserved: Measurement;
}

export function parseMeasurement(raw: unknown, decimal = false, max?: number): Measurement {
  if (raw === undefined || raw === null || raw === '') return { kind: 'missing' };
  if (raw === '?') return { kind: 'unknown' };
  let approximate = false;
  let value: number;
  if (typeof raw === 'number') value = raw;
  else if (typeof raw === 'string') {
    approximate = raw.startsWith('~');
    const pattern = decimal ? /^~?\d+(?:\.\d+)?$/ : /^~?\d+$/;
    if (!pattern.test(raw)) return { kind: 'invalid', message: decimal ? 'Expected nonnegative N, N.N, "~N.N", or "?"; no spaces or decimal comma.' : 'Expected a nonnegative integer N, "~N", or "?"; no spaces.' };
    value = Number(approximate ? raw.slice(1) : raw);
  } else return { kind: 'invalid', message: 'Expected a number or an N / "~N" / "?" string.' };
  if (!Number.isFinite(value) || value < 0 || (!decimal && !Number.isSafeInteger(value)) || (decimal && value > Number.MAX_SAFE_INTEGER)) return { kind: 'invalid', message: 'The number must be finite and nonnegative; counts must be safe integers.' };
  if (max !== undefined && value > max) return { kind: 'invalid', message: `Allowed range: 0–${max}.` };
  return { kind: 'known', value, approximate };
}

export function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function normalPath(path: string) { return path.replaceAll('\\', '/'); }
export function issue(path: string, field: string, message: string, severity: Issue['severity'] = 'error'): Issue { return { path, field, message, severity }; }
export function combine(values: Measurement[], calculate: (v: number[]) => number): Measurement {
  if (!values.every((v): v is Known => v.kind === 'known')) return { kind: 'unknown' };
  const value = calculate(values.map(v => v.value));
  if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) return { kind: 'invalid', message: 'Result exceeds the safe numeric range.' };
  return { kind: 'known', value, approximate: values.some(v => v.approximate) };
}
export function display(m: Measurement): string {
  return m.kind === 'known' ? `${m.approximate ? '~' : ''}${m.value}` : m.kind === 'invalid' ? 'invalid' : '?';
}
