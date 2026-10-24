import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {dirname,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditVault,type Audit} from '../src/journal';
import {display,type Source} from '../src/model';

const escape=(text:string)=>text.replace(/[&<>|\[\]\\\r\n]/g,char=>`&#${char.charCodeAt(0)};`);
const link=(path:string)=>path.split('/').map(encodeURIComponent).join('/');

export function renderArchive(audit:Audit):string {
  if(audit.issues.some(issue=>issue.severity==='error'))throw Error('Repair validation errors before refreshing the public archive index.');
  const lines=['# Observation archive','','Public field notes and original photographs. Read every entry directly in Markdown; Obsidian is optional.','','[Home](Home.md) | [Data model](Docs/DataSchema.md)','','## Reading the records','','Dates are local observation dates. `~` marks an estimate; `?` means unknown. A day without a record has no observation. Reported conditions describe the keeper\'s assessment. No synthetic observations are included.','','## Colonies','','| Colony | Species | Records | Observation dates |','| --- | --- | ---: | --- |'];
  for(const colony of audit.colonies) {
    const records=audit.observations.filter(note=>note.colonyId===colony.id);
    const dates=records.length?`${records[0].date} to ${records.at(-1)!.date}`:'No observations yet';
    lines.push(`| [${escape(colony.id)}](${link(colony.path)}) | ${escape(colony.species)} | ${records.length} | ${dates} |`);
  }
  if(!audit.observations.length)lines.push('','No observations have been recorded.');
  const months=[...new Set(audit.observations.map(note=>note.date.slice(0,7)))].sort().reverse();
  for(const month of months) {
    const records=audit.observations.filter(note=>note.date.startsWith(month));
    lines.push('',`## ${month}`,'','### Calendar','','| Monday | Tuesday | Wednesday | Thursday | Friday | Saturday | Sunday |','| --- | --- | --- | --- | --- | --- | --- |');
    const [year,monthNumber]=month.split('-').map(Number);
    const firstDay=new Date(`${month}-01T00:00:00Z`);
    const nextMonth=new Date(firstDay);nextMonth.setUTCMonth(nextMonth.getUTCMonth()+1);
    const days=(nextMonth.getTime()-firstDay.getTime())/86400000;
    const offset=(firstDay.getUTCDay()+6)%7;
    for(let start=0;start<offset+days;start+=7) {
      const cells=Array.from({length:7},(_,i)=>{
        const day=start+i-offset+1;
        if(day<1||day>days)return '';
        const date=`${year.toString().padStart(4,'0')}-${monthNumber.toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}`;
        const notes=records.filter(note=>note.date===date);
        return String(day)+notes.map(note=>`<br>[${escape(note.colonyId)}](${link(note.path)})`).join('');
      });
      lines.push('| '+cells.join(' | ')+' |');
    }
    lines.push('','### Entries','','| Date | Colony | Workers | Eggs | Larvae | Pupae | Interval worker deaths | Condition |','| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |');
    for(const note of [...records].sort((a,b)=>b.date.localeCompare(a.date)||a.colonyId.localeCompare(b.colonyId))) {
      lines.push(`| [${note.date}](${link(note.path)}) | [${escape(note.colonyId)}](Colonies/${note.colonyId}.md) | ${display(note.values.workers)} | ${display(note.values.eggs)} | ${display(note.values.larvae)} | ${display(note.values.pupae)} | ${display(note.values.worker_deaths)} | ${escape(String(note.data.condition))} |`);
    }
  }
  lines.push('','## About this index','','Generated from the real colony cards and observation files. Photographs are embedded in the individual entries. For interactive charts, date filters, validation, and typed editing controls, open this folder in Obsidian and follow [Setup](Docs/Setup.md).','','Refresh after editing observations: run `pnpm run archive:render` from the sibling `ant-journal-plugin` folder. This only rewrites Archive.md; it does not change observations, images, or Git state.','');
  return lines.join('\n');
}

export async function refreshArchive(root:string):Promise<Audit> {
  const sources:Source[]=[];
  async function walk(path:string) {
    let entries;try {entries=await readdir(path,{withFileTypes:true});}catch(error) {if((error as NodeJS.ErrnoException).code==='ENOENT')return;throw error;}
    for(const entry of entries) {
      const target=resolve(path,entry.name);
      if(entry.isSymbolicLink())throw Error('Archive source symlinks require manual review.');
      if(entry.isDirectory())await walk(target);
      else if(entry.isFile()&&entry.name.endsWith('.md'))sources.push({path:relative(root,target).replaceAll('\\','/'),text:await readFile(target,'utf8')});
    }
  }
  await walk(resolve(root,'Colonies'));await walk(resolve(root,'Journal'));
  const audit=auditVault(sources),markdown=renderArchive(audit);
  await mkdir(root,{recursive:true});await writeFile(resolve(root,'Archive.md'),markdown);
  return audit;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../AntJournal');
  const audit=await refreshArchive(root);
  console.log(`Public archive index refreshed: ${audit.colonies.length} colonies, ${audit.observations.length} observations. Source notes, photos, and Git state were not changed.`);
}
