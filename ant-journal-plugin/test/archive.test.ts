import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {auditVault} from '../src/journal';
import {base,note} from './helpers';
import {renderArchive,refreshArchive} from '../scripts/render-archive';

const card=(id:string,species='Test species')=>({path:`Colonies/${id}.md`,text:`---\nid: ${id}\nspecies: ${species}\n---\n`});
test('reader index retains separate colonies on one date, estimates, zero, and gaps',()=>{
  const audit=auditVault([card('cn-01'),card('ag-01'),note({...base,date:'2026-10-23',workers:'~14',eggs:'?',pupae:0}),note({...base,date:'2026-10-23',colony_id:'ag-01'}),note({...base,date:'2026-10-31'})]);
  const text=renderArchive(audit);
  for(const path of ['Journal/cn-01/2026-10-23.md','Journal/ag-01/2026-10-23.md','Journal/cn-01/2026-10-31.md'])assert.ok(text.includes(']('+path+')'));
  assert.ok(text.includes('| ~14 | ? |'));
  assert.ok(text.includes('| 0 |'));
  assert.ok(!text.includes('2026-10-24.md'));
  assert.ok(text.includes('| Monday | Tuesday |'));
});
test('reader index handles empty colonies and refuses invalid source identities',()=>{
  assert.ok(renderArchive(auditVault([card('cn-01')])).includes('No observations yet'));
  const invalid=auditVault([card('cn-01'),note({...base,date:'2026-02-30'})]);
  assert.throws(()=>renderArchive(invalid),/Repair validation/);
});
test('reader index escapes source labels and orders month sections newest first',()=>{
  const text=renderArchive(auditVault([card('cn-01','Species | <example>'),note({...base,date:'2026-09-30'}),note({...base,date:'2026-10-01'})]));
  assert.ok(text.includes('Species &#124; &#60;example&#62;'));
  assert.ok(text.indexOf('## 2026-10')<text.indexOf('## 2026-09'));
});
test('refresh only rewrites index and preserves observation and attachment bytes',async()=>{
  await mkdir('.test-output',{recursive:true});
  const root=await mkdtemp(resolve('.test-output/archive-'));
  await mkdir(resolve(root,'Colonies'));await mkdir(resolve(root,'Journal/cn-01'),{recursive:true});await mkdir(resolve(root,'Attachments'));
  const original=note(),photo=Buffer.from([0,2,255,17]);
  await writeFile(resolve(root,'Colonies/cn-01.md'),card('cn-01').text);
  await writeFile(resolve(root,original.path),original.text);
  await writeFile(resolve(root,'Attachments/original.jpg'),photo);
  await refreshArchive(root);
  assert.equal(await readFile(resolve(root,original.path),'utf8'),original.text);
  assert.deepEqual(await readFile(resolve(root,'Attachments/original.jpg')),photo);
  assert.ok((await readFile(resolve(root,'Archive.md'),'utf8')).includes(original.path));
});
