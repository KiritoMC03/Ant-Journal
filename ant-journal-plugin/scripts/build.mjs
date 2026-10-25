import { build } from 'esbuild';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
await mkdir('dist', {recursive:true});
const yamlLicense=await readFile(new URL('../node_modules/yaml/LICENSE',import.meta.url),'utf8');
await build({entryPoints:['src/main.ts'], outfile:'dist/main.js', bundle:true, external:['obsidian'], platform:'browser', format:'cjs', target:'es2022', sourcemap:false, minify:false, logLevel:'info', banner:{js:'/* Ant Journal original code: Ant Journal Human Use License 1.0.\nSee accompanying LICENSE and AI_POLICY.md; third-party code retains its own terms.\nIncludes yaml under the following license:\n'+yamlLicense+'\n*/'}});
for (const file of ['manifest.json','styles.css','LICENSE','AI_POLICY.md']) await copyFile(file,'dist/'+file);
