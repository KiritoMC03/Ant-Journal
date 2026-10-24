import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readMarkdown, syncMetrics } from '../src/markdown';
test('preserve source bytes, quotes, comments, body, and custom properties',()=> {
  const original='---\n# comment\nworkers: "~100" # approximate\nquoted: "42"\ncustom:\n  nested: [one, two]\nnotes: |\n  line one\n  line two\n---\n\n## Text\n![[Unicode \u0424\u043e\u0442\u043e.jpg]]\n';
  const next=syncMetrics(original,{_metric_workers:100}).text;
  assert.equal(next.replace('_metric_workers: 100\n',''),original);
  assert.equal(syncMetrics(next,{_metric_workers:100}).text,next);
  const changed=syncMetrics(next,{_metric_workers:110}).text;
  assert.equal(changed.replace('_metric_workers: 110\n',''),original);
});
test('remove stale projections for unknown values and preserve source fields',()=> {const text='---\nworkers: "?"\n_metric_workers: 100\n_metric_eggs: 25\nextra: true\n---\nBODY\n';assert.equal(syncMetrics(text,{_metric_eggs:30}).text,'---\nworkers: "?"\n_metric_eggs: 30\nextra: true\n---\nBODY\n');});
test('BOM, CRLF, final delimiter without newline, and quoted projection key',()=> {const text='\uFEFF---\r\nworkers: "~100"\r\n"_metric_workers": 99 # cache\r\ncustom: ok\r\n---';const next=syncMetrics(text,{_metric_workers:100}).text;assert.equal(next,'\uFEFF---\r\nworkers: "~100"\r\n_metric_workers: 100\r\ncustom: ok\r\n---');assert.equal(syncMetrics(next,{_metric_workers:100}).text,next);});
test('remove invalid multiline projection without damaging adjacent fields',()=> {const text='---\n_metric_workers:\n  bad: true\nworkers: 10\n---\nBODY';assert.equal(syncMetrics(text,{_metric_workers:10}).text,'---\n_metric_workers: 10\nworkers: 10\n---\nBODY');});
test('repeated saves preserve text; changing to ? removes the chart point',()=> {let text='---\nworkers: 0\n---\n';text=syncMetrics(text,{_metric_workers:0}).text;for(let i=0;i<10;i++) assert.equal(syncMetrics(text,{_metric_workers:0}).text,text);const unknown=text.replace('workers: 0','workers: "?"');assert.ok(!syncMetrics(unknown,{}).text.includes('_metric_workers'));});
test('do not write invalid YAML, duplicate keys, or flow maps',()=> {for(const text of ['---\nworkers: [\n---\n','---\nworkers: 1\nworkers: 2\n---\n','---\n{workers: 1}\n---\n']){const result=syncMetrics(text,{_metric_workers:10});assert.equal(result.text,text);assert.ok(result.error);}});
test('read YAML numbers and dates without creating UTC Date objects',()=> {const result=readMarkdown('---\ndate: 2026-10-24\nworkers: "42"\nqueens: 1\n---\n');assert.equal(result.data.date,'2026-10-24');assert.equal(result.data.workers,'42');assert.equal(result.data.queens,1);});
