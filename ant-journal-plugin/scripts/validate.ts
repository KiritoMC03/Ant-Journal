import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { auditVault } from '../src/journal';
import type { Source } from '../src/model';
const root=resolve(process.argv.slice(2).find(a=>a!=='--') ?? '../AntJournal');
const sources: Source[]=[];
async function walk(path: string) {
  let entries;
  try {entries=await readdir(path,{withFileTypes:true});} catch(e) {if((e as NodeJS.ErrnoException).code==='ENOENT') return;throw e;}
  for(const entry of entries) {const target=resolve(path,entry.name);if(entry.isDirectory()) await walk(target);else if(entry.isFile()&&entry.name.endsWith('.md')) sources.push({path:relative(root,target).replaceAll('\\','/'),text:await readFile(target,'utf8')});}
}
await walk(resolve(root,'Colonies')); await walk(resolve(root,'Journal'));
const result=auditVault(sources);
for(const entry of result.issues) console.log(`${entry.severity}: ${entry.path} · ${entry.field}: ${entry.message}`);
console.log(`Colonies: ${result.colonies.length}; observations: ${result.observations.length}; errors: ${result.issues.filter(i=>i.severity==='error').length}; warnings: ${result.issues.filter(i=>i.severity==='warning').length}. Files were not changed.`);
process.exitCode=result.issues.some(i=>i.severity==='error') ? 1 : 0;
