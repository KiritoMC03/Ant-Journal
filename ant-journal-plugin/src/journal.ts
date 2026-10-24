import { BOOL_FIELDS, COUNT_FIELDS, FEED_FIELDS, NUMBER_FIELDS, combine, issue, normalPath, parseMeasurement, validDate, type Colony, type Data, type Issue, type Measurement, type NumberField, type Observation, type Row, type Source } from './model';
import { readMarkdown } from './markdown';

export interface Audit { colonies: Colony[]; observations: Observation[]; issues: Issue[]; projections: Map<string, Record<string, number>> }
export function observationData(path: string, data: Data, colonies: Colony[]): { observation?: Observation; issues: Issue[]; identityValid: boolean } {
  path = normalPath(path);
  const issues: Issue[] = [];
  const add = (field: string, message: string, severity: Issue['severity'] = 'error') => issues.push(issue(path, field, message, severity));
  const match = /^Journal\/([a-z0-9][a-z0-9-]*)\/(\d{4}-\d{2}-\d{2})\.md$/.exec(path);
  if (!match) add('path', 'Canonical path: Journal/<id>/YYYY-MM-DD.md (ID: lowercase Latin letters, digits, hyphens).');
  if (!validDate(data.date)) add('date', 'A valid calendar date in YYYY-MM-DD format is required.');
  if (typeof data.colony_id !== 'string' || !colonies.some(c => c.id === data.colony_id)) add('colony_id', 'Use the ID of a valid existing Colonies/<id>.md card.');
  if (match && data.colony_id !== match[1]) add('colony_id', `ID does not match its folder; expected ${match[1]}.`);
  if (match && data.date !== match[2]) add('date', `Date does not match the filename; expected ${match[2]}.`);
  const identityValid = !issues.some(i => i.severity === 'error');
  const values = {} as Record<NumberField, Measurement>;
  for (const field of NUMBER_FIELDS) {
    const required = (COUNT_FIELDS as readonly string[]).includes(field);
    const value = parseMeasurement(data[field], !required, field === 'humidity_pct' ? 100 : undefined);
    values[field] = value;
    if (value.kind === 'invalid') add(field, value.message);
    if (required && value.kind === 'missing') add(field, 'Required field is empty. Enter N, "~N", or "?".');
    if (value.kind === 'unknown') add(field, 'Explicitly unknown: no chart point; composite metrics may be incomplete.', 'warning');
  }
  for (const field of BOOL_FIELDS) if (typeof data[field] !== 'boolean') add(field, 'An explicit unquoted true or false is required; missing does not mean false.');
  if (!['normal','attention','critical'].includes(data.condition as string)) add('condition', 'Required: normal, attention, or critical.');
  const observation = validDate(data.date) && typeof data.colony_id === 'string' ? { path, date: data.date, colonyId: data.colony_id, data, values } : undefined;
  return { observation, issues, identityValid };
}

export function auditVault(sources: Source[]): Audit {
  const issues: Issue[] = [];
  let colonies: Colony[] = [];
  const journal: { path: string; data: Data; error?: string }[] = [];
  for (const source of sources) {
    const path = normalPath(source.path);
    if (!/^Colonies\/[^/]+\.md$/.test(path) && !path.startsWith('Journal/')) continue;
    const parsed = readMarkdown(source.text);
    if (parsed.error) issues.push(issue(path, 'YAML', parsed.error));
    if (path.startsWith('Journal/')) { journal.push({ path, data: parsed.data, error: parsed.error }); continue; }
    if (parsed.error) continue;
    const data = parsed.data;
    const id = path.slice('Colonies/'.length, -3);
    let valid = true;
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id) || data.id !== id) { issues.push(issue(path,'id','ID must match the card filename; use a-z, 0-9, and hyphens.')); valid = false; }
    if (typeof data.species !== 'string' || !data.species.trim()) { issues.push(issue(path,'species','Provide the colony species.')); valid = false; }
    const baseline = parseMeasurement(data.initial_workers);
    if (baseline.kind === 'invalid') issues.push(issue(path,'initial_workers',baseline.message));
    for (const field of ['founded_on','acquired_on']) if (data[field] !== null && data[field] !== undefined && data[field] !== '' && !validDate(data[field])) issues.push(issue(path,field,'Expected a YYYY-MM-DD date or an empty value.'));
    if (valid) colonies.push({ id, species: data.species as string, name: typeof data.name === 'string' ? data.name : undefined, path, baseline });
  }
  colonies = colonies.sort((a,b) => a.id.localeCompare(b.id));
  const groups = new Map<string, string[]>();
  for (const entry of journal) if (typeof entry.data.colony_id === 'string' && validDate(entry.data.date)) {
    const key = `${entry.data.colony_id}/${entry.data.date}`;
    groups.set(key, [...(groups.get(key) ?? []), entry.path]);
  }
  const duplicates = new Set<string>();
  for (const paths of groups.values()) if (paths.length > 1) for (const path of paths) {
    duplicates.add(path);
    issues.push(issue(path, 'duplicate', `Duplicate (colony_id, date) pair: ${paths.join(', ')}. Keep one canonical observation; ambiguous records are excluded from statistics.`));
  }
  const observations: Observation[] = [];
  const projections = new Map<string, Record<string, number>>();
  for (const entry of journal) {
    const projection: Record<string, number> = {};
    projections.set(entry.path, projection);
    if (entry.error) continue;
    const checked = observationData(entry.path, entry.data, colonies);
    issues.push(...checked.issues);
    if (checked.identityValid && !duplicates.has(entry.path) && checked.observation) {
      observations.push(checked.observation);
      for (const field of NUMBER_FIELDS) {
        const v = checked.observation.values[field];
        if (v.kind === 'known') projection['_metric_' + field] = v.value;
      }
    }
  }
  observations.sort((a,b) => a.date.localeCompare(b.date) || a.colonyId.localeCompare(b.colonyId));
  for (const colony of colonies) {
    const rows = statistics(observations.filter(o => o.colonyId === colony.id), colony.baseline);
    if (rows.length && colony.baseline.kind !== 'known') issues.push(issue(colony.path, 'initial_workers', 'No known baseline at the start of observations: worker production is unknown.', 'warning'));
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      if (row.produced.kind === 'known' && row.produced.value < 0) issues.push(issue(row.observation.path,'produced_workers','Negative production estimate since observations began: check the baseline, deaths, and transfers.', 'warning'));
      if (index > 0) {
        const births = combine([row.observation.values.workers, rows[index - 1].observation.values.workers, row.observation.values.worker_deaths], ([now,prev,deaths]) => now - prev + deaths);
        if (births.kind === 'known' && births.value < 0) issues.push(issue(row.observation.path,'worker_deaths','Negative estimate of new workers since the previous observation: data may be incomplete or inaccurate.', 'warning'));
      }
    }
  }
  return { colonies, observations, issues, projections };
}

export function statistics(observations: Observation[], baseline: Measurement): Row[] {
  let cumulative: Measurement = { kind: 'known', value: 0, approximate: false };
  let knownDeathsSubtotal = 0;
  return [...observations].sort((a,b) => a.date.localeCompare(b.date)).map(observation => {
    const v = observation.values;
    if (v.worker_deaths.kind === 'known') knownDeathsSubtotal += v.worker_deaths.value;
    cumulative = combine([cumulative, v.worker_deaths], ([sum, deaths]) => sum + deaths);
    const totalEverObserved = combine([v.workers, cumulative], ([workers,deaths]) => workers + deaths);
    return {
      observation,
      living: combine([v.workers, v.queens, v.eggs, v.larvae, v.pupae], values => values.reduce((a,b) => a+b, 0)),
      cumulativeDeaths: cumulative,
      knownDeathsSubtotal,
      totalEverObserved,
      produced: combine([totalEverObserved, baseline], ([total, initial]) => total - initial),
    };
  });
}

export function feeding(observations: Observation[], start: string, end: string) {
  const selected = observations.filter(o => o.date >= start && o.date <= end);
  return FEED_FIELDS.map(field => {
    const dates = selected.filter(o => o.data[field] === true).map(o => o.date);
    const known = selected.filter(o => typeof o.data[field] === 'boolean').length;
    return { field, count: dates.length, dates, known, observations: selected.length, complete: known === selected.length };
  });
}

// Only observation dates; null is not zero. Used by core SVG charts and tests.
export function series(rows: Row[], key: 'living' | 'cumulativeDeaths' | 'produced' | 'totalEverObserved' | NumberField) {
  return rows.map(row => {
    const m = key in row.observation.values ? row.observation.values[key as NumberField] : row[key as 'living'];
    return { date: row.observation.date, path: row.observation.path, value: m.kind === 'known' ? m.value : null, approximate: m.kind === 'known' && m.approximate };
  });
}
