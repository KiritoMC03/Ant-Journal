import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,rename,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {buildSnapshot} from '../src/lib/snapshot';
import {makeResolver,renderMarkdown} from '../src/lib/markdown';
import {MediaStore,rejectPointer} from '../src/lib/media';
import {calendarHtml,chartSvg,shiftMonth} from '../src/lib/visuals';
import {normalizeBase} from '../src/lib/text';

const project=resolve('.test-output');await mkdir(project,{recursive:true});
const data={workers:'~14',queens:1,eggs:'?',larvae:2,pupae:0,worker_deaths:0,feed_syrup:true,feed_protein:false,feed_seeds:false,watered:false,condition:'normal'};
function note(date:string,extra:Record<string,unknown>={},body='An isolated synthetic test note.') {
  return '---\n'+Object.entries({date,colony_id:'aa-01',...data,...extra}).map(([k,v])=>k+': '+JSON.stringify(v)).join('\n')+'\n---\n\n## Observations\n\n'+body+'\n';
}
async function fixture() {
  const root=await mkdtemp(resolve(project,'vault-')),vault=resolve(root,'vault');
  for(const folder of ['Colonies','Journal/aa-01','Attachments','Pages','Docs'])await mkdir(resolve(vault,folder),{recursive:true});
  await writeFile(resolve(vault,'Colonies/aa-01.md'),'---\nid: aa-01\nspecies: Test species\nname: Test colony\ninitial_workers: 10\n---\n');
  for(const path of ['LICENSE','AI_POLICY.md','THIRD_PARTY_NOTICES.md'])await writeFile(resolve(vault,path),'Fixture notice.\n');
  const options={vault,output:resolve(root,'output'),cache:resolve(root,'cache'),prefix:'/journal-test/'};
  return {root,vault,options};
}
test('build derives real routes and statistics from source fields, ignoring stale metric caches',async()=>{
  const {vault,options}=await fixture(),path=resolve(vault,'Journal/aa-01/2026-10-01.md');
  const original=note('2026-10-01',{_metric_workers:999});await writeFile(path,original);
  await writeFile(resolve(vault,'Journal/aa-01/2026-10-09.md'),note('2026-10-09',{worker_deaths:2}));
  const site=await buildSnapshot(options);
  assert.deepEqual(site.entries[0].values.workers,{kind:'known',value:14,approximate:true});
  assert.deepEqual(site.colonies[0].rows[1].produced,{kind:'known',value:6,approximate:true});
  assert.ok(site.pages.some(p=>p.route==='journal/aa-01/2026-10-09/'));
  assert.equal(await readFile(path,'utf8'),original);
  assert.ok(site.warnings.some(w=>w.field==='eggs'));
});
test('add, edit, rename, and delete are discovered without hand-maintained indexes',async()=>{
  const {vault,options}=await fixture();
  const path=resolve(vault,'Pages/About.md');await writeFile(path,'# First title\n\nInitial page.');
  let site=await buildSnapshot(options);assert.ok(site.pages.some(p=>p.route==='pages/about/'));
  const before=site.version;await writeFile(path,'# Updated title\n\nRevised page.');
  site=await buildSnapshot(options);assert.notEqual(site.version,before);assert.equal(site.pages.find(p=>p.route==='pages/about/')!.title,'Updated title');
  await rename(path,resolve(vault,'Pages/Background.md'));site=await buildSnapshot(options);
  assert.ok(site.pages.some(p=>p.route==='pages/background/'));assert.ok(!site.pages.some(p=>p.route==='pages/about/'));
  await unlink(resolve(vault,'Pages/Background.md'));site=await buildSnapshot(options);assert.ok(!site.pages.some(p=>p.kind==='page'));
});
test('new colony discovery and invalid identities are handled by the shared validator',async()=>{
  const {vault,options}=await fixture();
  await writeFile(resolve(vault,'Colonies/bb-01.md'),'---\nid: bb-01\nspecies: Second species\n---\n');
  assert.equal((await buildSnapshot(options)).colonies.length,2);
  await writeFile(resolve(vault,'Journal/aa-01/2026-10-01.md'),note('2026-10-02'));
  await assert.rejects(buildSnapshot(options),/does not match the filename/);
});
test('route collisions fail instead of overwriting generated pages',async()=>{
  const {vault,options}=await fixture();
  await writeFile(resolve(vault,'Pages/A B.md'),'# A');await writeFile(resolve(vault,'Pages/A-B.md'),'# B');
  await assert.rejects(buildSnapshot(options),/Route collision/);
});
test('standard links, wikilinks, uppercase media, and video embeds resolve in context',async()=>{
  const {vault,root}=await fixture();
  const png=await readFile('../ant-journal-plugin/test/fixtures/test-photo.png');await writeFile(resolve(vault,'Attachments/PHOTO.PNG'),png);
  const media=new MediaStore(vault,resolve(root,'media'),resolve(root,'cache'),p=>'/repo/'+p);
  const resolver=makeResolver(['Pages/A.md','Pages/B.md','Attachments/PHOTO.PNG'],new Map([['Pages/B.md','pages/b/']]),p=>'/repo/'+p,'https://example.invalid/repo');
  const text='[Other](B.md) and [[B|Alias]].\n\n![[PHOTO.PNG]]\n\n![Original](../Attachments/PHOTO.PNG)\n\n`![[missing.png]]`';
  const result=await renderMarkdown(text,'Pages/A.md',resolver,media);
  assert.ok(result.html.includes('href="/repo/pages/b/"'));assert.equal((result.html.match(/<img /g)??[]).length,2);
  assert.ok(result.html.includes('srcset='));assert.ok(result.html.includes('<code>![[missing.png]]</code>'));
  assert.deepEqual(await readFile(resolve(vault,'Attachments/PHOTO.PNG')),png);
});
test('ambiguous basenames and unsafe protocols are rejected with source diagnostics',()=>{
  const resolver=makeResolver(['Pages/One/A.md','Pages/Two/A.md'],new Map(),p=>p,'https://example.invalid');
  assert.throws(()=>resolver('Pages/B.md','A'),/ambiguous target/);assert.throws(()=>resolver('Pages/B.md','javascript:alert(1)'),/unsupported link protocol/);
  assert.throws(()=>resolver('Pages/B.md','missing.jpg'),/missing target/);
});
test('Markdown HTML is sanitized without removing supported headings and media attributes',async()=>{
  const {vault,root}=await fixture(),media=new MediaStore(vault,resolve(root,'media'),resolve(root,'cache'),p=>p);
  const result=await renderMarkdown('# Title\n\n## Safe heading\n\n<script>alert(1)</script><img src="https://example.invalid/x" onerror="alert(1)"><a href="javascript:alert(1)">Bad</a>','Pages/A.md',makeResolver([],new Map(),p=>p,''),media);
  assert.ok(!result.html.includes('<script'));assert.ok(!result.html.includes('onerror'));assert.ok(!result.html.includes('javascript:'));assert.ok(result.html.includes('id="safe-heading"'));
});
test('unknown data breaks lines, zero is retained, and no intermediate dates are invented',()=>{
  const points=[{date:'2026-10-01',value:0,approximate:false,path:''},{date:'2026-10-09',value:null,approximate:false,path:''},{date:'2026-10-20',value:12,approximate:true,path:''}];
  const html=chartSvg(points,'Workers');assert.ok(html.includes('2026-10-01: 0'));assert.ok(html.includes('approximate'));assert.ok(!html.includes('2026-10-02'));assert.ok(html.includes('d=""'));
});
test('calendar retains independently selectable colonies on the same date',()=>{
  const html=calendarHtml('2026-10',[{date:'2026-10-23',colonyId:'aa-01',name:'First',href:'/a/'},{date:'2026-10-23',colonyId:'bb-01',name:'Second',href:'/b/'}]);
  assert.ok(html.includes('href="/a/"'));assert.ok(html.includes('href="/b/"'));assert.equal((html.match(/class="calendar-note/g)??[]).length,2);assert.equal(shiftMonth('2026-12',1),'2027-01');assert.equal(shiftMonth('2026-01',-1),'2025-12');
});
test('LFS pointers fail before being published as original media',()=>{
  assert.throws(()=>rejectPointer(Buffer.from('version https://git-lfs.github.com/spec/v1\noid sha256:'+'1'.repeat(64)),'test.mp4'),/Missing LFS object/);
});
test('invalid edits retain the last valid snapshot and removing embeds prunes output media',async()=>{
  const {vault,options}=await fixture(),image=await readFile('../ant-journal-plugin/test/fixtures/test-photo.png');
  await writeFile(resolve(vault,'Attachments/PHOTO.PNG'),image);
  await writeFile(resolve(vault,'Attachments/unused.txt'),'Not referenced by public content.');
  const path=resolve(vault,'Journal/aa-01/2026-10-24.md');
  await writeFile(path,note('2026-10-24',{},'![[PHOTO.PNG]]'));
  const site=await buildSnapshot(options);assert.equal(site.media.length,1);
  const before=await readFile(resolve(options.output,'snapshot.json'),'utf8');
  await writeFile(path,note('2026-10-25'));await assert.rejects(buildSnapshot(options),/does not match/);
  assert.equal(await readFile(resolve(options.output,'snapshot.json'),'utf8'),before);
  const original=site.media[0].original.slice(options.prefix.length);
  assert.deepEqual(await readFile(resolve(options.output,'public',original)),image);
  await writeFile(path,note('2026-10-24'));assert.equal((await buildSnapshot(options)).media.length,0);
  await assert.rejects(readFile(resolve(options.output,'public',original)),{code:'ENOENT'});
});
test('repository prefixes are normalized for root and project Pages sites',()=>{
  assert.equal(normalizeBase(''),'/');assert.equal(normalizeBase('/Ant-Journal/'),'/Ant-Journal/');assert.equal(normalizeBase('repo'),'/repo/');
});
