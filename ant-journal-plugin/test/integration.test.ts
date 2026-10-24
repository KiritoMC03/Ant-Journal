import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { base, card, note } from './helpers';

// Real plugin class with only the Obsidian transport API substituted.
// Checks events, debounce, atomic writes, and reload; does not emulate Calendar Hub UI.
test('Obsidian events: validation, debounce, restoration, no write loops, and concurrent edit protection', async()=> {
  await mkdir('.test-output',{recursive:true});
  await build({entryPoints:['src/main.ts'],outfile:'.test-output/plugin.cjs',bundle:true,platform:'node',format:'cjs',alias:{obsidian:resolve('test/obsidian-mock.ts')},logLevel:'silent'});
  const require=createRequire(import.meta.url);
  const Plugin=require(resolve('.test-output/plugin.cjs')).default;
  const handlers=new Map<string,((...args:unknown[])=>void)[]>();
  const file=(path:string)=>({path,__testFile:true});
  const cardSource=card(); const noteSource=note({...base,workers:'~100'});
  const data=new Map([[cardSource.path,cardSource.text],[noteSource.path,noteSource.text]]);
  const writes: string[]=[];
  let concurrent='';
  const vault={
    getMarkdownFiles:()=>[...data.keys()].map(file),
    getAbstractFileByPath:(path:string)=>data.has(path)?file(path):null,
    read:async(f:{path:string})=>data.get(f.path)!,
    on:(event:string,fn:(...args:unknown[])=>void)=>{handlers.set(event,[...(handlers.get(event)??[]),fn]);return {event,fn};},
    process:async(f:{path:string},fn:(s:string)=>string)=>{
      const before=concurrent || data.get(f.path)!; concurrent='';
      const next=fn(before); data.set(f.path,next); writes.push(next);
      for(const handler of handlers.get('modify')??[])handler(f);
      return next;
    },
  };
  const workspace={onLayoutReady:()=>{},getLeavesOfType:()=>[]};
  const plugin=new Plugin({vault,workspace});
  const previousWindow=globalThis.window;
  (globalThis as unknown as {window:unknown}).window={setTimeout,clearTimeout};
  try {
    await plugin.onload();
    await plugin.refresh();
    assert.equal(writes.length,1);
    assert.ok(data.get(noteSource.path)!.includes('workers: ~100'));
    assert.ok(data.get(noteSource.path)!.includes('_metric_workers: 100'));
    await new Promise(r=>setTimeout(r,850));
    assert.equal(writes.length,1,'plugin writes do not loop');
    await Promise.all([plugin.refresh(),plugin.refresh()]);
    assert.equal(writes.length,1,'full validation is idempotent');
    const changed=data.get(noteSource.path)!.replace('workers: ~100','workers: ~110');
    data.set(noteSource.path,changed);
    for(let i=0;i<3;i++) for(const handler of handlers.get('modify')??[])handler(file(noteSource.path));
    await new Promise(r=>setTimeout(r,850));
    assert.ok(data.get(noteSource.path)!.includes('_metric_workers: 110'));
    assert.equal(writes.length,2,'debounce combines event bursts');
    data.set(noteSource.path,data.get(noteSource.path)!.replace('workers: ~110','workers: "?"'));
    await plugin.refresh();
    assert.ok(!data.get(noteSource.path)!.includes('_metric_workers'));
    assert.ok(plugin.audit.issues.some((i:{field:string})=>i.field==='workers'));
    data.set(noteSource.path,data.get(noteSource.path)!.replace('workers: "?"','workers: 42'));
    concurrent=data.get(noteSource.path)!.replace('workers: 42','workers: "~200"')+'\nA concurrent user edit.\n';
    await plugin.refresh();
    assert.ok(data.get(noteSource.path)!.includes('workers: "~200"'));
    assert.ok(data.get(noteSource.path)!.includes('_metric_workers: 200'));
    assert.ok(data.get(noteSource.path)!.endsWith('A concurrent user edit.\n'));
    plugin.onunload();
    const restored=new Plugin({vault,workspace});await restored.onload();await restored.refresh();
    assert.ok(data.get(noteSource.path)!.includes('_metric_workers: 200'));
    restored.onunload();
  } finally {plugin.onunload();globalThis.window=previousWindow;}
});

test('JPEG/PNG/HEIC attachments are outside the plugin write scope',async()=> {
  // An isolated filesystem vault and the real plugin runtime with attachments alongside Markdown.
  const root=resolve('.test-output/photo-vault');await mkdir(resolve(root,'Attachments'),{recursive:true});
  const files=['test-photo.png','test-photo.jpg','test-original.heic'];
  const before=await Promise.all(files.map(name=>readFile(resolve('test/fixtures',name))));
  for(const name of files) await copyFile(resolve('test/fixtures',name),resolve(root,'Attachments',name));
  const sources=[card(),note()];
  for(const source of sources) {await mkdir(resolve(root,source.path,'..'),{recursive:true});await writeFile(resolve(root,source.path),source.text);}
  const require=createRequire(import.meta.url);const Plugin=require(resolve('.test-output/plugin.cjs')).default;
  const file=(path:string)=>({path,__testFile:true});
  const writes:string[]=[];
  const vault={getMarkdownFiles:()=>sources.map(s=>file(s.path)),getAbstractFileByPath:file,read:async(f:{path:string})=>readFile(resolve(root,f.path),'utf8'),on:()=>({}),process:async(f:{path:string},fn:(text:string)=>string)=>{assert.ok(f.path.endsWith('.md'));writes.push(f.path);const next=fn(await readFile(resolve(root,f.path),'utf8'));await writeFile(resolve(root,f.path),next);return next;}};
  const plugin=new Plugin({vault,workspace:{onLayoutReady:()=>{},getLeavesOfType:()=>[]}});
  const previousWindow=globalThis.window;(globalThis as unknown as {window:unknown}).window={setTimeout,clearTimeout};
  try {await plugin.onload();await plugin.refresh();await plugin.refresh();assert.equal(writes.length,1);}
  finally {plugin.onunload();globalThis.window=previousWindow;}
  for(let i=0;i<files.length;i++) assert.deepEqual(await readFile(resolve(root,'Attachments',files[i])),before[i]);
});
