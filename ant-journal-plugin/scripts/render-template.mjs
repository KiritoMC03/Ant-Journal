import {copyFile,mkdir,mkdtemp,readdir,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {init,project,repository,put} from './init-vault.mjs';
const target=resolve(repository,'vault-template');
// Refuse to overwrite observations accidentally placed in the public template.
async function hasPersonalContent(dir) {
  let entries;try {entries=await readdir(dir,{withFileTypes:true});}catch(error){if(error.code==='ENOENT')return false;throw error;}
  for(const entry of entries) {
    if(entry.name==='.gitkeep')continue;
    if(entry.isDirectory()) {if(await hasPersonalContent(resolve(dir,entry.name)))return true;}
    else return true;
  }
  return false;
}
for(const folder of ['Journal','Attachments']) if(await hasPersonalContent(resolve(target,folder))) throw Error('Preserve observations in the real archive or a separate backup before rendering this empty starter.');
for(const id of ['cn-01','cj-01','ag-01']) {
  try {
    const card=await readFile(resolve(target,`Colonies/${id}.md`),'utf8');
    if(/^(?:name|founded_on|acquired_on|origin|formicarium|initial_workers):[ \t]*\S/m.test(card)) throw Error('Starter colony cards contain real facts; preserve them in the archive or a separate backup before rendering.');
  } catch(error) {if(error.code!=='ENOENT')throw error;}
}
await mkdir(resolve(project,'.test-output'),{recursive:true});
const temporary=await mkdtemp(resolve(project,'.test-output/public-template-'));
await init(temporary);
await put(temporary,'Journal/.gitkeep','');await put(temporary,'Attachments/.gitkeep','');
await put(temporary,'README.md','# Clean public template\n\nThis is a generated, empty starter. Run the setup commands in the repository README to set up the AntJournal archive workspace. This template is independent of the real public records. Keep this reusable template empty; real observations belong in AntJournal.\n');
async function copyGenerated(from,to) {
  await mkdir(to,{recursive:true});
  for(const entry of await readdir(from,{withFileTypes:true})) {
    if(entry.isDirectory())await copyGenerated(resolve(from,entry.name),resolve(to,entry.name));
    else await copyFile(resolve(from,entry.name),resolve(to,entry.name));
  }
}
await copyGenerated(temporary,target);
console.log('Clean English vault-template rendered exclusively from project defaults and public docs.');
