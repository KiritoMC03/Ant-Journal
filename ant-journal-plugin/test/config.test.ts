import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'yaml';
import { auditVault } from '../src/journal';
import type { Source } from '../src/model';
// Test the generator in an isolated directory, never in the real public archive.
await mkdir('.test-output', {recursive:true});
const root = await mkdtemp(resolve('.test-output/config-vault-'));
const { init } = await import(pathToFileURL(resolve('scripts/init-vault.mjs')).href);
await init(root);
test('new vault is empty and colony cards have no fabricated baseline',async()=> {
  const sources:Source[]=[];
  for(const id of ['cn-01','cj-01','ag-01']) {
    assert.deepEqual(await readdir(resolve(root,`Journal/${id}`)),[]);
    sources.push({path:`Colonies/${id}.md`,text:await readFile(resolve(root,`Colonies/${id}.md`),'utf8')});
  }
  const result=auditVault(sources);assert.equal(result.colonies.length,3);assert.ok(result.colonies.every(c=>c.baseline.kind==='missing'));assert.equal(result.issues.length,0);
});
test('Calendar Hub scans Journal only and uses filename dates without ctime fallback',async()=> {
  const settings=JSON.parse(await readFile(resolve(root,'.obsidian/plugins/calendar-hub/data.json'),'utf8'));
  assert.equal(settings.dailyNoteIncludedFolders,'Journal');assert.equal(settings.dailyNoteFilenameDateFormat,'YYYY-MM-DD');assert.equal(settings.shouldIndexDailyNotesFromCreationDate,false);assert.equal(settings.shouldIndexDailyNotesInAllFolders,true);
  // This checks supplied configuration, not Calendar Hub UI behavior.
});
test('Tracker configurations isolate colonies and preserve zero and gaps without interpolation',async()=> {
  for(const id of ['cn-01','cj-01','ag-01']) {
    const text=await readFile(resolve(root,`Dashboards/${id}.md`),'utf8');
    const blocks=[...text.matchAll(/^```tracker\n([\s\S]*?)^```/gm)];assert.equal(blocks.length,4);
    for(const match of blocks) {const config=parse(match[1]);assert.equal(config.folder,`Journal/${id}`);assert.equal(config.searchType,'frontmatter');assert.equal(config.dateFormat,'YYYY-MM-DD');assert.equal(config.ignoreZeroValue,false);assert.equal(config.line.fillGap,false);assert.equal(config.line.showLine,false);assert.ok(config.searchTarget.includes('_metric_'));}
  }
});
test('Metadata Menu maps folders and preserves mixed measurement formats',async()=> {
  const loadClass=async(name:string)=>{
    const text=await readFile(resolve(root,`FileClasses/${name}.md`),'utf8');
    return parse(text.match(/^---\n([\s\S]*?)\n---/)![1]);
  };
  const observation=await loadClass('Observation');
  assert.deepEqual(observation.filesPaths,['Journal']);
  const fields=new Map(observation.fields.map((f:{name:string;type:string;options:unknown})=>[f.name,f]));
  const get=(name:string)=>fields.get(name) as {name:string;type:string;options:Record<string,unknown>};
  assert.equal(get('date').type,'Date');assert.equal(get('date').options.defaultInsertAsLink,false);
  for(const name of ['workers','queens','eggs','larvae','pupae','worker_deaths','temperature_c','humidity_pct']) assert.equal(get(name).type,'Input');
  for(const name of ['feed_syrup','feed_protein','feed_seeds','watered']) assert.equal(get(name).type,'Boolean');
  assert.deepEqual(Object.values(get('condition').options.valuesList as object),['normal','attention','critical']);
  assert.equal(get('colony_id').options.valuesListNotePath,'Config/ColonyIds.md');
  assert.deepEqual((await readFile(resolve(root,'Config/ColonyIds.md'),'utf8')).trim().split('\n'),['ag-01','cj-01','cn-01']);
  const colony=await loadClass('Colony');assert.deepEqual(colony.filesPaths,['Colonies']);
  assert.equal(colony.fields.find((f:{name:string})=>f.name==='acquired_on').type,'Date');
  const settings=JSON.parse(await readFile(resolve(root,'.obsidian/plugins/metadata-menu/data.json'),'utf8'));
  assert.equal(settings.autoInsertFieldsAtFileClassInsertion,false);assert.equal(settings.chooseFileClassAtFileCreation,false);
  const types=JSON.parse(await readFile(resolve(root,'.obsidian/types.json'),'utf8')).types;
  assert.equal(types.feed_syrup,'checkbox');assert.equal(types.workers,'text');assert.equal(types._metric_workers,'number');
});
test('repeated Metadata Menu setup preserves user schemas, settings, types, and notes',async()=> {
  const {setupMetadataMenu}=await import(pathToFileURL(resolve('scripts/metadata-menu.mjs')).href);
  const separate=await mkdtemp(resolve('.test-output/metadata-vault-'));await init(separate);
  const notePath=resolve(separate,'Journal/cn-01/2026-10-24.md');
  const note='---\nworkers: "~123" # original representation\ncustom: 42\n---\n\nUser-authored test text.\n';
  const {writeFile}=await import('node:fs/promises');
  await writeFile(notePath,note);
  const classPath=resolve(separate,'FileClasses/Observation.md');const classText=(await readFile(classPath,'utf8'))+'\nCustom test setting.\n';await writeFile(classPath,classText);
  const settingsPath=resolve(separate,'.obsidian/plugins/metadata-menu/data.json');await writeFile(settingsPath,'{"enableEditor":false}\n');
  const typesPath=resolve(separate,'.obsidian/types.json');await writeFile(typesPath,'{"types":{"custom":"number","workers":"number"}}');
  await writeFile(resolve(separate,'Colonies/new-02.md'),'---\nid: new-02\nspecies: Other species\n---\n');
  await setupMetadataMenu(separate);
  assert.equal(await readFile(notePath,'utf8'),note);assert.equal(await readFile(classPath,'utf8'),classText);assert.equal(await readFile(settingsPath,'utf8'),'{"enableEditor":false}\n');
  const types=JSON.parse(await readFile(typesPath,'utf8')).types;assert.equal(types.custom,'number');assert.equal(types.workers,'number');
  assert.ok((await readFile(resolve(separate,'Config/ColonyIds.md'),'utf8')).includes('new-02\n'));
});
