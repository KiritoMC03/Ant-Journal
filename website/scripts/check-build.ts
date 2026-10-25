import {readdir,readFile,stat,open,writeFile} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {readSnapshot} from '../src/lib/snapshot';
import {websiteRoot,vaultRoot} from '../src/lib/config';
const snapshot=await readSnapshot(),root=resolve(websiteRoot,'dist');
const files:string[]=[];
async function walk(dir:string){for(const entry of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,entry.name);if(entry.isSymbolicLink())throw Error('Build contains a symlink');if(entry.isDirectory())await walk(path);else if(entry.isFile())files.push(path);}}
await walk(root);let bytes=0,links=0;
for(const path of files) {
  bytes+=(await stat(path)).size;
  if(path.endsWith('.html')) {
    const html=await readFile(path,'utf8');
    for(const match of html.matchAll(/\b(?:href|src|poster)="([^"]+)"/g)) {
      const target=match[1].replaceAll('&amp;','&');if(/^(?:https?:|mailto:|tel:|#|data:)/.test(target))continue;
      const pathname=decodeURIComponent(target.split(/[?#]/)[0]);
      let destination:string;
      if(pathname.startsWith('/')) {
        if(!pathname.startsWith(snapshot.base))throw Error(`${relative(root,path)}: link escapes base path: ${target}`);
        destination=resolve(root,pathname.slice(snapshot.base.length));
      } else destination=resolve(dirname(path),pathname);
      if(relative(root,destination).startsWith('..'))throw Error('Link escapes output: '+target);
      try{const s=await stat(destination);if(s.isDirectory())await stat(resolve(destination,'index.html'));}catch{throw Error(`${relative(root,path)}: broken link ${target}`);}
      links++;
    }
  } else if(path.includes('media')) {
    const handle=await open(path,'r');const buffer=Buffer.alloc(80);await handle.read(buffer,0,80,0);await handle.close();
    if(buffer.toString().startsWith('version https://git-lfs.github.com/spec/v1'))throw Error('Build contains an unresolved LFS pointer: '+relative(root,path));
  }
}
for(const page of snapshot.pages)await stat(resolve(root,page.route,'index.html'));
for(const asset of snapshot.media) {
  const source=await readFile(resolve(vaultRoot,asset.source)),original=await readFile(resolve(root,asset.original.slice(snapshot.base.length)));
  const hash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
  if(hash(source)!==hash(original))throw Error('An original media file was modified: '+asset.source);
}
const budget=Number(process.env.SITE_MAX_BYTES??900*1024*1024);
if(!Number.isFinite(budget)||budget<=0)throw Error('SITE_MAX_BYTES must be a positive byte count');
if(bytes>budget)throw Error(`Site is ${(bytes/1024/1024).toFixed(1)} MiB, above the configured ${(budget/1024/1024).toFixed(1)} MiB budget. No media was silently omitted.`);
if(bytes>750*1024*1024)console.warn('Site is approaching the Pages storage limit. Plan media storage before the configured build budget is reached.');
await writeFile(resolve(root,'build-report.json'),JSON.stringify({pages:snapshot.pages.length,media:snapshot.media.length,bytes,links,version:snapshot.version,warnings:snapshot.warnings.length},null,2));
console.log(`Website checks passed: ${snapshot.pages.length} pages, ${snapshot.media.length} original media, ${links} local links, ${(bytes/1024/1024).toFixed(1)} MiB. Base: ${snapshot.base}`);
