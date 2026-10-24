import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,lstat} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const knownFixtures={
  'ant-journal-plugin/test/fixtures/test-photo.png':'744f6b1a01dc8b7bbaf1578f2a8a967f32bc587da5668f6c036ef81f2be6caaf',
  'ant-journal-plugin/test/fixtures/test-photo.jpg':'5cf4eeed06a742427741329306b371ad54d0e9c59185e531c1640fb2bdf4f999',
  'ant-journal-plugin/test/fixtures/test-original.heic':'7f8b363e4936c0666a25f64f3a92fda10bd8e5453be4592530b65a55dd98f3f2',
};
const forbiddenPaths=[
  /^\.private\//i,
  /^ant-journal-plugin\/(?:test-vault|node_modules|dist|\.test-output)\//i,
  /(?:^|\/)(?:\.git|\.aws|\.codex|\.agents|\.idea|\.vscode|node_modules|\.trash)\//i,
  /(?:^|\/)\.obsidian\/(?:workspace[^/]*\.json|cache\/)/i,
  /(?:^|\/)(?:\.env(?:\..*)?|credentials[^/]*\.json|[^/]*service-account[^/]*\.json)$/i,
  /\.(?:pem|key|p12|pfx|har|log)$/i,
  /^vault-template\/(?:Journal|Attachments)\/(?!\.gitkeep$).+/i,
];
const publicVaults=['AntJournal','vault-template'];
const bootstrapSettings=new Set(publicVaults.flatMap(vault=>['calendar-hub','metadata-menu'].map(id=>`${vault}/.obsidian/plugins/${id}/data.json`)));
const portableSettings=new Set(publicVaults.flatMap(vault=>['app','community-plugins','core-plugins','daily-notes','templates','types'].map(name=>`${vault}/.obsidian/${name}.json`)));
const mediaExtension=/\.(?:png|jpe?g|jfif|gif|webp|avif|hei[cf]|tiff?|bmp|ico|dng|mp4|mov|m4v|webm|mkv|avi|mpg|mpeg|mts|m2ts)$/i;
const textRules=[
  ['PRIVATE_KEY',/-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/],
  ['ACCESS_TOKEN',/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,}|sk-[A-Za-z0-9_-]{24,}|AKIA[0-9A-Z]{16})\b/],
  ['CREDENTIAL_ASSIGNMENT',/\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password)\b["']?\s*[:=]\s*["'][A-Za-z0-9_+\/=.-]{12,}["']/i],
  ['LOCAL_ABSOLUTE_PATH',/\b[A-Za-z]:[\\/]|\/(?:Users|home)\/[A-Za-z0-9_.-]+\//],
  ['EMAIL_ADDRESS',/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/],
  ['NON_ENGLISH_FIRST_PARTY_TEXT',/[\u0400-\u04ff]/],
];
export function scanPublicationEntry(path,bytes) {
  path=path.replaceAll('\\','/');
  const findings=[];
  const add=code=>findings.push({path,code});
  if(forbiddenPaths.some(rule=>rule.test(path))) {add('PRIVATE_OR_RUNTIME_PATH');return findings;}
  if(/\.obsidian\/plugins\/[^/]+\/data\.json$/.test(path)&&!bootstrapSettings.has(path)) {add('RUNTIME_PLUGIN_SETTINGS');return findings;}
  if(/\.obsidian\/plugins\/[^/]+\/(?:main\.js|manifest\.json|styles\.css|LICENSE)$/.test(path)) {add('GENERATED_PLUGIN_BINARY');return findings;}
  if(path.includes('/.obsidian/')&&!portableSettings.has(path)&&!bootstrapSettings.has(path)) {add('RUNTIME_OBSIDIAN_SETTINGS');return findings;}
  if(knownFixtures[path]) {
    const text=bytes.toString('utf8');
    const pointer=/^version https:\/\/git-lfs.github.com\/spec\/v1\noid sha256:([a-f0-9]{64})\nsize \d+\n?$/.exec(text);
    const hash=pointer?.[1]??createHash('sha256').update(bytes).digest('hex');
    if(hash!==knownFixtures[path])add('UNREVIEWED_FIXTURE_BYTES');
    return findings;
  }
  // The archive owner explicitly publishes original media, including embedded metadata.
  // Binary contents are not treated as text; LFS pointers at these paths are allowed too.
  if(path.startsWith('AntJournal/Attachments/')&&mediaExtension.test(path))return findings;
  if(mediaExtension.test(path)||bytes.includes(0)) {add('UNREVIEWED_BINARY');return findings;}
  const text=bytes.toString('utf8');
  for(const [code,pattern] of textRules) if(pattern.test(text))add(code);
  if(path.startsWith('vault-template/Colonies/')&&/^(?:name|founded_on|acquired_on|origin|formicarium|initial_workers):[ \t]*\S/m.test(text))add('PERSONAL_COLONY_FACTS');
  return findings;
}
function git(root,args) {return execFileSync('git',args,{cwd:root,maxBuffer:64*1024*1024,stdio:['pipe','pipe','pipe']});}
function paths(buffer) {return buffer.toString('utf8').split('\0').filter(Boolean);}
export async function inspectRepository(root,{index=true,working=true,history=true,readGit=args=>git(root,args)}={}) {
  const findings=[];let indexCount=0,workingCount=0,historyCount=0;
  if(index)for(const entry of paths(readGit(['ls-files','--stage','-z']))) {
    const tab=entry.indexOf('\t'), meta=entry.slice(0,tab), path=entry.slice(tab+1);
    indexCount++;
    if(meta.startsWith('120000 ')||meta.startsWith('160000 ')) {findings.push({path,scope:'index',code:'EXTERNAL_GIT_OBJECT'});continue;}
    for(const item of scanPublicationEntry(path,readGit(['show',':'+path])))findings.push({...item,scope:'index'});
  }
  if(working)for(const path of new Set(paths(readGit(['ls-files','--cached','--others','--exclude-standard','-z'])))) {
    // Ignored private paths already staged are reported by the index pass; never inspect their local contents here.
    if(forbiddenPaths.some(rule=>rule.test(path)))continue;
    try {
      const stat=await lstat(resolve(root,path));
      if(stat.isSymbolicLink()) {findings.push({path,scope:'working',code:'SYMLINK_REQUIRES_REVIEW'});continue;}
      if(!stat.isFile())continue;
      workingCount++;
      for(const item of scanPublicationEntry(path,await readFile(resolve(root,path))))findings.push({...item,scope:'working'});
    } catch(error) {if(error.code!=='ENOENT')throw error;}
  }
  if(history) {
    const seen=new Set();
    const commits=readGit(['rev-list','--all']).toString('utf8').trim().split('\n').filter(Boolean);
    historyCount=commits.length;
    for(const commit of commits)for(const entry of paths(readGit(['ls-tree','-r','-z','--full-tree',commit]))) {
      const [meta,path]=entry.split('\t');const [mode,type,oid]=meta.split(' ');
      if(type!=='blob') {findings.push({path,scope:'history',code:'EXTERNAL_GIT_OBJECT'});continue;}
      const key=path+'\0'+oid;if(seen.has(key))continue;seen.add(key);
      if(mode==='120000') {findings.push({path,scope:'history',code:'SYMLINK_REQUIRES_REVIEW'});continue;}
      for(const item of scanPublicationEntry(path,readGit(['cat-file','blob',oid])))findings.push({...item,scope:'history'});
    }
  }
  return {findings,indexCount,workingCount,historyCount};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
  try {
    const result=await inspectRepository(root,{index:!process.argv.includes('--working-only'),history:!process.argv.includes('--working-only')});
    for(const finding of result.findings)console.error(`${finding.scope}: ${finding.code}: ${finding.path}`);
    console.log(`Publication check: ${result.indexCount} staged files, ${result.workingCount} working files, ${result.historyCount} reachable commits; ${result.findings.length} findings. Matched values are never printed.`);
    process.exitCode=result.findings.length?1:0;
  } catch {console.error('Publication check could not complete. Verify repository access and review staged content manually.');process.exitCode=2;}
}
