import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {scanPublicationEntry,inspectRepository,knownFixtures}=await import(pathToFileURL(resolve('scripts/public-check.mjs')).href);
const scan=(path:string,text:string)=>scanPublicationEntry(path,Buffer.from(text)) as {path:string;code:string}[];
const fakeToken=()=>['ghp','_', 'x'.repeat(36)].join('');

test('publication rejects backups and runtime files even when force-added',()=> {
  for(const path of ['.private/backups/note.md','ant-journal-plugin/test-vault/SMOKE.md','vault-template/Journal/example/2026-10-24.md','vault-template/Attachments/private.jpg','vault-template/.obsidian/workspace.json','AntJournal/.obsidian/appearance.json','AntJournal/.obsidian/plugins/installed-releases.json','.env','account.key']) assert.ok(scan(path,'benign text').length,path);
  assert.ok(scan('vault-template/.obsidian/plugins/other/data.json','{}').some(x=>x.code==='RUNTIME_PLUGIN_SETTINGS'));
  assert.equal(scan('vault-template/Journal/.gitkeep','').length,0);
});

test('public archive observations, colony facts, portable settings, and original media are allowed',()=> {
  assert.deepEqual(scan('AntJournal/Journal/example/2026-10-24.md','---\nworkers: ~50\n---\n\nOwner observation.'),[]);
  assert.deepEqual(scan('AntJournal/Colonies/example.md','---\norigin: Recorded origin\nacquired_on: 2026-10-23\n---\n'),[]);
  for(const id of ['calendar-hub','metadata-menu'])assert.deepEqual(scan(`AntJournal/.obsidian/plugins/${id}/data.json`,'{}'),[]);
  assert.deepEqual(scan('AntJournal/.obsidian/app.json','{}'),[]);
  for(const ext of ['JPG','gif','mp4','heic'])assert.deepEqual(scanPublicationEntry(`AntJournal/Attachments/original.${ext}`,Buffer.from([0,1,2,3])),[]);
  assert.deepEqual(scan('AntJournal/Attachments/original.jpg','version https://git-lfs.github.com/spec/v1\noid sha256:'+'1'.repeat(64)+'\nsize 4\n'),[]);
  assert.ok(scan('AntJournal/.obsidian/plugins/metadata-menu/main.js','vendor').some(x=>x.code==='GENERATED_PLUGIN_BINARY'));
  assert.ok(scan('AntJournal/Journal/example/2026-10-24.md',fakeToken()).some(x=>x.code==='ACCESS_TOKEN'));
  assert.ok(scanPublicationEntry('AntJournal/Attachments/unknown.bin',Buffer.from([0])).some((x:{code:string})=>x.code==='UNREVIEWED_BINARY'));
});
test('publication detects secret-like contents without returning matched values',()=> {
  const token=fakeToken(), findings=scan('docs/example.md',token);
  assert.ok(findings.some(x=>x.code==='ACCESS_TOKEN'));
  assert.ok(!JSON.stringify(findings).includes(token));
  assert.ok(scan('config.json',JSON.stringify({password:'x'.repeat(20)})).some(x=>x.code==='CREDENTIAL_ASSIGNMENT'));
});
test('publication detects local paths, personal emails, and untranslated first-party text',()=> {
  const path=['Z',':','/','Users','/','person','/','note.md'].join('');
  assert.ok(scan('docs/readme.md',path).some(x=>x.code==='LOCAL_ABSOLUTE_PATH'));
  assert.ok(scan('docs/readme.md',['someone','example.invalid'].join('@')).some(x=>x.code==='EMAIL_ADDRESS'));
  assert.ok(scan('src/ui.ts',String.fromCodePoint(0x041f)).some(x=>x.code==='NON_ENGLISH_FIRST_PARTY_TEXT'));
});
test('test fixtures require reviewed bytes or matching LFS pointers',async()=> {
  for(const [path,hash] of Object.entries(knownFixtures)) {
    const bytes=await readFile(resolve('..',path));
    assert.equal(scanPublicationEntry(path,bytes).length,0);
    const pointer=['version https://git-lfs.github.com/spec/v1','oid sha256:'+hash,'size '+bytes.length,''].join('\n');
    assert.equal(scan(path,pointer).length,0);
    assert.ok(scanPublicationEntry(path,Buffer.concat([bytes,Buffer.from('changed')])).some((x:{code:string})=>x.code==='UNREVIEWED_FIXTURE_BYTES'));
  }
  assert.ok(scan('docs/unreviewed.png','arbitrary bytes').some(x=>x.code==='UNREVIEWED_BINARY'));
});
test('public starter colony facts must remain blank',()=> {
  assert.equal(scan('vault-template/Colonies/example.md','---\nname:\ninitial_workers:\n---\n').length,0);
  assert.ok(scan('vault-template/Colonies/example.md','---\norigin: private test location\n---\n').some(x=>x.code==='PERSONAL_COLONY_FACTS'));
});
test('publication reads staged blobs instead of trusting cleaned working files',async()=> {
  await mkdir('.test-output',{recursive:true});
  const root=await mkdtemp(resolve('.test-output/public-index-'));
  await writeFile(resolve(root,'note.md'),'Clean working version.\n');
  let indexed=fakeToken();
  // Inject read results: tests never initialize, stage, commit, or change Git state.
  const readGit=(args:string[])=>{
    if(args[0]==='ls-files')return Buffer.from(args.includes('--stage')?'100644 synthetic 0\tnote.md\0':'note.md\0');
    if(args[0]==='show')return Buffer.from(indexed);
    throw Error('Unexpected Git read: '+args[0]);
  };
  const result=await inspectRepository(root,{working:true,index:true,history:false,readGit});
  assert.ok(result.findings.some((x:{scope:string;code:string})=>x.scope==='index'&&x.code==='ACCESS_TOKEN'));
  assert.ok(!result.findings.some((x:{scope:string})=>x.scope==='working'));
  indexed='Clean indexed version.\n';
  assert.equal((await inspectRepository(root,{working:true,index:true,history:false,readGit})).findings.length,0);
});
test('publication detects forbidden history after the latest revision has been cleaned',async()=> {
  await mkdir('.test-output',{recursive:true});
  const root=await mkdtemp(resolve('.test-output/public-history-'));
  await writeFile(resolve(root,'note.md'),'Clean current revision.\n');
  const readGit=(args:string[])=>{
    switch(args[0]) {
      case 'ls-files': return Buffer.from(args.includes('--stage')?'100644 clean 0\tnote.md\0':'note.md\0');
      case 'show': return Buffer.from('Clean current revision.\n');
      case 'rev-list': return Buffer.from('latest\nolder\n');
      case 'ls-tree': return Buffer.from('100644 blob '+(args.at(-1)==='older'?'unsafe':'clean')+'\tnote.md\0');
      case 'cat-file': return Buffer.from(args.at(-1)==='unsafe'?fakeToken():'Clean current revision.\n');
      default: throw Error('Unexpected Git read: '+args[0]);
    }
  };
  const result=await inspectRepository(root,{readGit});
  assert.equal(result.historyCount,2);
  assert.ok(result.findings.some((x:{scope:string;code:string})=>x.scope==='history'&&x.code==='ACCESS_TOKEN'));
  assert.ok(!result.findings.some((x:{scope:string})=>x.scope==='index'||x.scope==='working'));
});
