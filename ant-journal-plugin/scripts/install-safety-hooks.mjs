import {execFileSync} from 'node:child_process';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
let previous='';try {previous=execFileSync('git',['config','--get','core.hooksPath'],{cwd:root,encoding:'utf8'}).trim();}catch{}
if(previous&&previous!=='.githooks')throw Error('An existing custom hooksPath is configured. Integrate the public check manually rather than replacing it.');
execFileSync('git',['config','--local','core.hooksPath','.githooks'],{cwd:root});
console.log('Repository-local publication hooks enabled. Existing working files were not changed.');
