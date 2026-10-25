import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const packageUrl=import.meta.resolve('astro/package.json');
const pkg=JSON.parse(readFileSync(fileURLToPath(packageUrl),'utf8'));
const bin=typeof pkg.bin==='string'?pkg.bin:pkg.bin.astro;
const result=spawnSync(process.execPath,[fileURLToPath(new URL(bin,packageUrl)),...process.argv.slice(2)],{stdio:'inherit',env:{...process.env,ASTRO_TELEMETRY_DISABLED:'1'},windowsHide:true});
if(result.error)throw result.error;process.exitCode=result.status??1;
