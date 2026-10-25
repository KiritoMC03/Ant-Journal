import {copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {stringify} from 'yaml';
import {init,project,vault,put} from './init-vault.mjs';
import {releases} from './community.mjs';
const root=resolve(project,'test-vault');
await init(root);
for(const release of [...releases,{id:'ant-journal-core'}]) {
  const target=resolve(root,'.obsidian/plugins',release.id);await mkdir(target,{recursive:true});
  for(const name of ['main.js','manifest.json','styles.css',...(release.id==='ant-journal-core'?['LICENSE','AI_POLICY.md']:[])]) await copyFile(resolve(vault,'.obsidian/plugins',release.id,name),resolve(target,name));
}
for(const name of ['test-photo.png','test-photo.jpg','test-original.heic']) {
  try {await copyFile(resolve(project,'test/fixtures',name),resolve(root,'Attachments',name),1);}
  catch(error) {if(error.code!=='EEXIST') throw error;}
}
const card=resolve(root,'Colonies/cn-01.md');
const cardText=await readFile(card,'utf8');
if(cardText.includes('initial_workers:\n')) await writeFile(card,cardText.replace('initial_workers:\n','initial_workers: 10\n'));
const sample={date:'2026-10-24',colony_id:'cn-01',workers:'~14',queens:1,eggs:'~25',larvae:12,pupae:8,worker_deaths:2,feed_syrup:true,feed_protein:false,feed_seeds:false,watered:true,condition:'normal',temperature_c:'~24.5',humidity_pct:'~60',notes:'SYNTHETIC TEST DATA. Not a personal observation.'};
for(const id of ['cn-01','cj-01','ag-01']) await put(root,`Journal/${id}/2026-10-24.md`,'---\n'+stringify({...sample,colony_id:id,...(id==='cn-01'?{}:{workers:'~100',worker_deaths:0})})+'---\n\n# SYNTHETIC OBSERVATION\n\nNever copy into a personal journal.\n\n![[test-photo.png]]\n![[test-photo.jpg]]\n');
await put(root,'Journal/cn-01/2026-10-17.md','---\n'+stringify({...sample,date:'2026-10-17',workers:10,worker_deaths:1,feed_syrup:false,feed_protein:true})+'---\n\nSYNTHETIC TEST DATA.\n');
await put(root,'Journal/cn-01/2026-10-31.md','---\n'+stringify({...sample,date:'2026-10-31',workers:0,worker_deaths:'?',feed_seeds:true})+'---\n\nSYNTHETIC TEST DATA: unknown interval deaths and a real zero worker count.\n');
await put(root,'SMOKE.md','# SYNTHETIC TEST VAULT\n\nThis ignored vault contains fabricated acceptance fixtures only. It is never part of the public repository.\n\n1. At baseline 10, ~14 workers and 3 cumulative deaths on October 24 produce ~7 workers.\n2. Calendar Hub shows three separate records on October 24 and one cn-01 record each on October 17 and 31.\n3. Open Dashboards/cn-01. Change ~14 to ~110 and check automatic chart updates. Restore the fixture afterwards.\n4. Introduce a missing required field, date conflict, and duplicate; verify errors and then repair.\n5. Compare original attachment hashes before/after recalculation and core reload.\n6. Open Metadata Menu controls for date, condition, colony_id, and booleans. Empty booleans must remain unfilled until explicitly saved.\n');
console.log('Synthetic test vault prepared. Existing notes were preserved.');
