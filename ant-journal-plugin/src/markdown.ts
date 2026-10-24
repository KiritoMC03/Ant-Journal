import { isMap, isScalar, parseDocument } from 'yaml';
import { NUMBER_FIELDS, type Data } from './model';

export function readMarkdown(text: string): { data: Data; error?: string; yaml?: string; start?: number; end?: number; eol: string } {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const opening = /^(?:\uFEFF)?---\r?\n/.exec(text);
  if (!opening) return { data: {}, error: 'Missing YAML frontmatter: insert the template with a --- block at the start of the file.', eol };
  const tail = text.slice(opening[0].length);
  const closing = /^---[ \t]*(?:\r?\n|$)/m.exec(tail);
  if (!closing) return { data: {}, error: 'Unclosed YAML frontmatter: missing --- delimiter.', eol };
  const start = opening[0].length;
  const end = start + closing.index;
  const yaml = text.slice(start, end);
  const doc = parseDocument(yaml, { schema: 'core', uniqueKeys: true, keepSourceTokens: true });
  if (doc.errors.length) return { data: {}, error: doc.errors.map(e => e.message).join('; '), yaml, start, end, eol };
  if (!isMap(doc.contents)) return { data: {}, error: 'YAML must be a key: value mapping.', yaml, start, end, eol };
  try { return { data: doc.toJS({ maxAliasCount: 100 }) as Data, yaml, start, end, eol }; }
  catch (error) { return { data: {}, error: `Cannot read YAML: ${String(error)}`, yaml, start, end, eol }; }
}

// Patch only plugin-owned keys; never reserialize user YAML.
// Vault.process provides current file contents rather than a delayed metadataCache.
export function syncMetrics(text: string, desired: Record<string, number>): { text: string; error?: string } {
  const parsed = readMarkdown(text);
  if (parsed.error || parsed.yaml === undefined || parsed.start === undefined || parsed.end === undefined) return { text, error: parsed.error };
  const doc = parseDocument(parsed.yaml, { keepSourceTokens: true });
  if (!isMap(doc.contents)) return { text };
  if (doc.contents.flow) return { text, error: 'Tracker projections require a block YAML mapping instead of {flow: map}. The source is preserved; core statistics remain available.' };
  const owned = new Set(NUMBER_FIELDS.map(f => '_metric_' + f));
  const edits: { start: number; end: number; value: string }[] = [];
  const found = new Set<string>();
  for (const pair of doc.contents.items) {
    if (!isScalar(pair.key) || typeof pair.key.value !== 'string' || !owned.has(pair.key.value)) continue;
    const key = pair.key.value;
    found.add(key);
    if (desired[key] !== undefined && isScalar(pair.value) && pair.value.value === desired[key]) continue;
    if (!pair.key.range) return { text, error: 'Cannot safely locate the derived field.' };
    const start = parsed.yaml.lastIndexOf('\n', pair.key.range[0] - 1) + 1;
    const nodeEnd = pair.value?.range?.[2] ?? pair.key.range[2];
    const end = nodeEnd > 0 && parsed.yaml[nodeEnd - 1] === '\n' ? nodeEnd : (parsed.yaml.indexOf('\n', nodeEnd) + 1 || parsed.yaml.length);
    edits.push({ start, end, value: desired[key] === undefined ? '' : `${key}: ${desired[key]}${parsed.eol}` });
  }
  let yaml = parsed.yaml;
  for (const edit of edits.sort((a,b) => b.start - a.start)) yaml = yaml.slice(0, edit.start) + edit.value + yaml.slice(edit.end);
  for (const key of owned) if (desired[key] !== undefined && !found.has(key)) {
    if (yaml && !yaml.endsWith('\n')) yaml += parsed.eol;
    yaml += `${key}: ${desired[key]}${parsed.eol}`;
  }
  if (yaml === parsed.yaml) return { text };
  return { text: text.slice(0, parsed.start) + yaml + text.slice(parsed.end) };
}
