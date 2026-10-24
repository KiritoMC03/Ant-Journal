import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { vault } from './init-vault.mjs';
export const releases = [
  { id:'calendar-hub', repo:'HWY1dot0/calendar-hub', version:'0.2.3' },
  { id:'obsidian-tracker', repo:'pyrochlore/obsidian-tracker', version:'1.19.0' },
  { id:'metadata-menu', repo:'mdelobelle/metadatamenu', version:'0.8.12' },
];
export async function community(root=vault, ids) {
  const inventory=[];
  if(ids) {
    try { inventory.push(...JSON.parse(await readFile(resolve(root,'.obsidian/plugins/installed-releases.json'),'utf8')).filter(item=>!ids.includes(item.id))); }
    catch(error) { if(error.code!=='ENOENT') throw error; }
  }
  for(const release of releases.filter(item=>!ids || ids.includes(item.id))) {
    const target=resolve(root,'.obsidian/plugins',release.id);
    await mkdir(target,{recursive:true});
    for(const name of ['main.js','manifest.json','styles.css']) {
      const url=`https://github.com/${release.repo}/releases/download/${release.version}/${name}`;
      const response=await fetch(url);
      if(!response.ok) throw Error(`${response.status}: ${url}`);
      const bytes=Buffer.from(await response.arrayBuffer());
      if(name==='manifest.json') { const manifest=JSON.parse(bytes.toString()); if(manifest.id!==release.id || manifest.version!==release.version) throw Error('Manifest mismatch'); }
      inventory.push({...release,name,url,sha256:createHash('sha256').update(bytes).digest('hex')});
      await writeFile(resolve(target,name),bytes);
    }
    const license=await fetch(`https://raw.githubusercontent.com/${release.repo}/${release.version}/LICENSE`);
    if(license.ok) await writeFile(resolve(target,'LICENSE'),await license.text());
    console.log(`${release.id} ${release.version}`);
  }
  // Hashes record downloaded official files; they are not independent publisher signatures.
  await writeFile(resolve(root,'.obsidian/plugins/installed-releases.json'),JSON.stringify(inventory,null,2));
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) await community(process.argv[2] ? resolve(process.argv[2]) : vault);
