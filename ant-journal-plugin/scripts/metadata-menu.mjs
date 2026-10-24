import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';

const field = (name, type, options = {}, prefix = 'obs') => ({name, type, options, id:`${prefix}_${name}`, path:''});
const dateOptions = {dateFormat:'YYYY-MM-DD', defaultInsertAsLink:false, linkPath:''};
export const measurements = ['workers','queens','eggs','larvae','pupae','worker_deaths','temperature_c','humidity_pct'];
export const booleans = ['feed_syrup','feed_protein','feed_seeds','watered'];
export const observationClass = {
  version:'2.0', icon:'ant', filesPaths:['Journal'],
  fields:[
    field('date','Date',dateOptions),
    field('colony_id','Select',{sourceType:'ValuesListNotePath',valuesList:{},valuesListNotePath:'Config/ColonyIds.md'}),
    ...measurements.slice(0,6).map(name=>field(name,'Input')),
    ...booleans.map(name=>field(name,'Boolean')),
    field('condition','Select',{sourceType:'ValuesList',valuesList:{'0':'normal','1':'attention','2':'critical'}}),
    ...measurements.slice(6).map(name=>field(name,'Input')),
    ...['feed_notes','water_notes','notes'].map(name=>field(name,'Input')),
  ],
};
export const colonyClass = {
  version:'2.0', icon:'ant', filesPaths:['Colonies'],
  fields:[
    ...['id','species','name'].map(name=>field(name,'Input',{},'col')),
    ...['founded_on','acquired_on'].map(name=>field(name,'Date',dateOptions,'col')),
    ...['origin','formicarium','initial_workers'].map(name=>field(name,'Input',{},'col')),
  ],
};
export const metadataSettings = {
  settingsVersion:'5.0', presetFields:[], fileClassQueries:[], classFilesPath:'FileClasses/',
  fileClassAlias:'fileClass', frontmatterOnly:true, displayFieldsInContextMenu:false,
  globallyIgnoredFields:measurements.map(name=>'_metric_'+name),
  fileIndexingExcludedFolders:['Templates','Docs','Dashboards','Config'],
  isAutosuggestEnabled:true, enableProperties:true, enableTabHeader:true, enableFileExplorer:true,
  enableEditor:true, enableMarkdown:true, enableLinks:true, firstDayOfWeek:1,
  chooseFileClassAtFileCreation:false, autoInsertFieldsAtFileClassInsertion:false,
  showFileClassSelectInModal:false, isAutoCalculationEnabled:false, disableDataviewPrompt:true,
};
export const propertyTypes = {
  date:'date', founded_on:'date', acquired_on:'date',
  colony_id:'text', condition:'text', id:'text', species:'text', name:'text',
  origin:'text', formicarium:'text', initial_workers:'text',
  feed_notes:'text', water_notes:'text', notes:'text',
  ...Object.fromEntries(measurements.map(name=>[name,'text'])),
  ...Object.fromEntries(booleans.map(name=>[name,'checkbox'])),
  ...Object.fromEntries(measurements.map(name=>['_metric_'+name,'number'])),
};

async function createIfMissing(root, relative, text) {
  const target=resolve(root,relative); await mkdir(dirname(target),{recursive:true});
  try {await writeFile(target,text,{flag:'wx',encoding:'utf8'});}
  catch(error) {if(error.code!=='EEXIST') throw error;}
}
async function mergeJson(root, relative, merge) {
  const target=resolve(root,relative); await mkdir(dirname(target),{recursive:true});
  let old;
  try {old=await readFile(target,'utf8');}
  catch(error) {if(error.code!=='ENOENT') throw error;}
  const next=JSON.stringify(merge(old ? JSON.parse(old) : undefined),null,2)+'\n';
  if(next!==old) await writeFile(target,next,'utf8');
}
export async function setupMetadataMenu(root) {
  // Folder mapping applies classes without adding fileClass to existing notes.
  await createIfMissing(root,'FileClasses/Observation.md','---\n'+stringify(observationClass)+'---\n\n# Observation\n\nField types for Journal/**. Input preserves N / ~N / ?. See [Typed controls](../Docs/Fields.md).\n');
  await createIfMissing(root,'FileClasses/Colony.md','---\n'+stringify(colonyClass)+'---\n\n# Colony card\n\nPermanent property types for Colonies/**.\n');
  await createIfMissing(root,'.obsidian/plugins/metadata-menu/data.json',JSON.stringify(metadataSettings,null,2)+'\n');
  await mergeJson(root,'.obsidian/types.json',old=>({...old,types:{...propertyTypes,...old?.types}}));
  await mergeJson(root,'.obsidian/community-plugins.json',old=>[...new Set([...(old ?? []),'metadata-menu'])]);
  const ids=[];
  for(const entry of await readdir(resolve(root,'Colonies'),{withFileTypes:true})) {
    if(!entry.isFile() || !/^[a-z0-9][a-z0-9-]*\.md$/.test(entry.name)) continue;
    const content=await readFile(resolve(root,'Colonies',entry.name),'utf8');
    const match=/^(?:\uFEFF)?---\r?\n([\s\S]*?)^---[ \t]*(?:\r?\n|$)/m.exec(content);
    if(!match) continue;
    try {const data=parse(match[1]);if(data?.id===entry.name.slice(0,-3) && typeof data.species==='string' && data.species.trim()) ids.push(data.id);}
    catch {/* The core validator reports invalid colony cards. */}
  }
  // Only this separate list is derived; preserve user settings and classes.
  const list=ids.sort().join('\n')+(ids.length?'\n':'');
  await mkdir(resolve(root,'Config'),{recursive:true});
  let oldList; try {oldList=await readFile(resolve(root,'Config/ColonyIds.md'),'utf8');} catch(error) {if(error.code!=='ENOENT') throw error;}
  if(oldList!==list) await writeFile(resolve(root,'Config/ColonyIds.md'),list,'utf8');
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const root=resolve(process.argv[2] ?? fileURLToPath(new URL('../../AntJournal',import.meta.url)));
  await setupMetadataMenu(root);
  console.log(`Metadata Menu: classes, property types, and colony choices configured in ${root}. Observations were not changed.`);
}
