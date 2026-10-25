import {mkdir,readdir,readFile,writeFile,rm,copyFile,cp,unlink} from 'node:fs/promises';
import {resolve,relative,posix} from 'node:path';
import {createHash} from 'node:crypto';
import {auditVault,statistics} from '../../../ant-journal-plugin/src/journal';
import {readMarkdown} from '../../../ant-journal-plugin/src/markdown';
import {NUMBER_FIELDS} from '../../../ant-journal-plugin/src/model';
import {base,generated,vaultRoot,websiteRoot,repositoryUrl,slug,url,escape} from './config';
import {makeResolver,renderMarkdown} from './markdown';
import {MediaStore} from './media';
import type {Snapshot,Page,Entry,Colony} from './types';

export async function discover(root:string):Promise<string[]> {
  const paths:string[]=[];
  async function walk(dir:string) {
    let entries;try {entries=await readdir(dir,{withFileTypes:true});}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return;throw error;}
    for(const entry of entries) {
      if(entry.name.startsWith('.'))continue;
      const target=resolve(dir,entry.name);
      if(entry.isSymbolicLink())throw Error('Vault symlinks require review: '+relative(root,target));
      if(entry.isDirectory())await walk(target);else if(entry.isFile())paths.push(relative(root,target).replaceAll('\\','/'));
    }
  }
  await walk(root);return paths.sort();
}
function unpack(text:string) {
  if(!/^(?:\uFEFF)?---\r?\n/.test(text))return {data:{},body:text};
  const parsed=readMarkdown(text);if(parsed.error)throw Error(parsed.error);
  const after=text.slice(parsed.end!);const end=/^---[^\S\r\n]*(?:\r?\n|$)/.exec(after)!;
  return {data:parsed.data,body:after.slice(end[0].length)};
}
export function pageRoute(source:string) {
  const prefix=source.startsWith('Docs/')?'guide/':'pages/';
  const parts=source.split('/').slice(1).map(part=>slug(part.replace(/\.md$/,'')));
  if(parts.some(part=>!part))throw Error(`${source}: page path segments must contain letters or numbers.`);
  return prefix+parts.join('/')+'/';
}
export async function buildSnapshot(options:{vault?:string;output?:string;cache?:string;prefix?:string}={}):Promise<Snapshot> {
  const vault=options.vault??vaultRoot,out=options.output??generated,cache=options.cache??resolve(websiteRoot,'.cache/media-v1');
  const prefix=options.prefix??base,toUrl=(route:string)=>prefix+route.replace(/^\//,'');
  // The only recursive cleanup target is a named child of this build's output directory.
  const publicDir=resolve(out,'staging-public');
  if(relative(resolve(out),publicDir)!=='staging-public')throw Error('Invalid generated output path');
  await rm(publicDir,{recursive:true,force:true});await mkdir(publicDir,{recursive:true});
  const files=await discover(vault),sources=[] as {path:string;text:string}[],bodies=new Map<string,{data:Record<string,unknown>;body:string}>();
  const included=files.filter(path=>/^(?:Colonies|Journal|Docs|Pages)\/.+\.md$/.test(path));
  const version=createHash('sha256');
  version.update(process.env.GITHUB_SHA??'local');
  for(const path of included) {
    const text=await readFile(resolve(vault,path),'utf8');version.update(path+'\0'+text);
    try {bodies.set(path,unpack(text));}catch(error){throw Error(`${path}: ${String(error)}`);}
    if(path.startsWith('Colonies/')||path.startsWith('Journal/'))sources.push({path,text});
  }
  const audit=auditVault(sources),errors=audit.issues.filter(i=>i.severity==='error');
  if(errors.length)throw Error(errors.map(e=>`${e.path} · ${e.field}: ${e.message}`).join('\n'));
  const pages:Page[]=[{route:'',kind:'home',title:'A closer look at a smaller world'},{route:'archive/',kind:'archive',title:'The observation archive'},{route:'calendar/',kind:'calendar',title:'A calendar of small discoveries'},{route:'compare/',kind:'compare',title:'Across the colonies'}];
  const routes=new Map<string,string>([['Home.md',''],['Archive.md','archive/'],['Dashboards/Overview.md','compare/']]);
  for(const colony of audit.colonies) {
    const route=`colonies/${colony.id}/`;
    routes.set(colony.path,route);routes.set(`Dashboards/${colony.id}.md`,route);
    pages.push({route,kind:'colony',source:colony.path,title:colony.name??colony.species,colonyId:colony.id});
  }
  for(const entry of audit.observations) {
    const colony=audit.colonies.find(c=>c.id===entry.colonyId)!;
    const route=`journal/${entry.colonyId}/${entry.date}/`;routes.set(entry.path,route);
    pages.push({route,kind:'entry',source:entry.path,title:`${entry.date} · ${colony.name??colony.species}`,colonyId:entry.colonyId,date:entry.date});
  }
  for(const path of included.filter(p=>/^(?:Docs|Pages)\//.test(p))) {
    const {data,body}=bodies.get(path)!,route=pageRoute(path);
    const title=typeof data.title==='string'?data.title:body.match(/^# (.+)$/m)?.[1]??posix.basename(path,'.md');
    routes.set(path,route);pages.push({route,title,source:path,kind:path.startsWith('Docs/')?'guide':'page'});
  }
  const legal=[['LICENSE','license/','License'],['AI_POLICY.md','ai-policy/','LLM access and use policy'],['THIRD_PARTY_NOTICES.md','third-party/','Third-party notices']];
  const noticesRoot=resolve(websiteRoot,'../LICENSES');
  for(const notice of await discover(noticesRoot)) {
    const source='LICENSES/'+notice,destination='notices/'+notice;
    files.push(source);routes.set(source,destination);
    await mkdir(resolve(publicDir,'notices',posix.dirname(notice)),{recursive:true});
    await copyFile(resolve(noticesRoot,notice),resolve(publicDir,'notices',notice));
  }
  for(const [source,route,title] of legal) {
    let text;try{text=await readFile(resolve(vault,source),'utf8');}catch {text=await readFile(resolve(websiteRoot,'..',source),'utf8');}
    files.push(source);bodies.set(source,{data:{},body:text});routes.set(source,route);pages.push({source,route,title,kind:'legal'});version.update(text);
  }
  const seen=new Set<string>();for(const page of pages){if(seen.has(page.route))throw Error('Route collision: '+page.route);seen.add(page.route);}
  const media=new MediaStore(vault,resolve(publicDir,'media'),cache,toUrl),resolver=makeResolver(files,routes,toUrl,repositoryUrl);
  const rendered=new Map<string,Awaited<ReturnType<typeof renderMarkdown>>>();
  for(const page of pages)if(page.source) {
    const text=bodies.get(page.source)!.body;
    let result;
    if(page.source==='LICENSE')result={html:'<pre class="license-text">'+escape(text)+'</pre>',media:[],excerpt:'',search:''};
    else result=await renderMarkdown(text,page.source,resolver,media);
    rendered.set(page.source,result);page.html=result.html;
  }
  const entries:Entry[]=audit.observations.map(entry=>{
    const page=pages.find(p=>p.source===entry.path)!,content=rendered.get(entry.path)!;
    return {path:entry.path,route:page.route,date:entry.date,colonyId:entry.colonyId,title:page.title,...content,values:entry.values,data:entry.data};
  }).reverse();
  const colonies:Colony[]=audit.colonies.map(colony=>{
    const notes=entries.filter(e=>e.colonyId===colony.id),latest:Colony['latest']={};
    for(const field of NUMBER_FIELDS) {
      const note=notes.find(e=>e.values[field].kind==='known');
      if(note)latest[field]={value:note.values[field],date:note.date};
    }
    return {...colony,name:colony.name??colony.species,route:`colonies/${colony.id}/`,data:bodies.get(colony.path)!.data,html:rendered.get(colony.path)!.html,entries:notes,rows:statistics(audit.observations.filter(e=>e.colonyId===colony.id),colony.baseline),latest,cover:notes.flatMap(e=>e.media).find(m=>m.kind==='image')};
  });
  const assets=await Promise.all(media.pending.values());for(const asset of assets)version.update(asset.original);
  const snapshot:Snapshot={version:version.digest('hex').slice(0,20),base:prefix,pages,colonies,entries,media:assets,warnings:audit.issues.filter(i=>i.severity==='warning')};
  await writeFile(resolve(out,'snapshot-next.json'),JSON.stringify(snapshot));
  await writeFile(resolve(publicDir,'version.json'),JSON.stringify({version:snapshot.version}));
  await writeFile(resolve(publicDir,'robots.txt'),'User-agent: *\nAllow: /\n');
  await writeFile(resolve(publicDir,'license.txt'),bodies.get('LICENSE')!.body);
  await copyFile(resolve(websiteRoot,'static/favicon.svg'),resolve(publicDir,'favicon.svg'));
  const notices=['Third-party notices for the Ant Journal website. Third-party components retain their original licenses.\n'];
  for(const name of ['astro','vite','yaml','sharp','unified','remark-parse','remark-gfm','remark-rehype','rehype-raw','rehype-sanitize','rehype-stringify']) {
    for(const license of ['LICENSE','license','LICENSE.md'])try {notices.push(`\n=== ${name} ===\n`+await readFile(resolve(websiteRoot,'node_modules',name,license),'utf8'));break;}catch{}
  }
  await writeFile(resolve(publicDir,'third-party-notices.txt'),notices.join('\n'));
  // Publish only after the complete source snapshot validates and renders successfully.
  // Copying files also works on Windows hosts that disallow directory renames.
  const finalPublic=resolve(out,'public');await mkdir(finalPublic,{recursive:true});
  const active=new Set(await discover(publicDir));await cp(publicDir,finalPublic,{recursive:true});
  for(const obsolete of await discover(finalPublic))if(!active.has(obsolete))await unlink(resolve(finalPublic,obsolete));
  await writeFile(resolve(out,'snapshot.json'),JSON.stringify(snapshot));
  console.log(`Journal: ${colonies.length} colonies, ${entries.length} observations, ${assets.length} referenced media, ${snapshot.warnings.length} warnings.`);
  for(const warning of snapshot.warnings)console.warn(`${warning.path} · ${warning.field}: ${warning.message}`);
  return snapshot;
}
export async function readSnapshot():Promise<Snapshot> {return JSON.parse(await readFile(resolve(generated,'snapshot.json'),'utf8'));}
