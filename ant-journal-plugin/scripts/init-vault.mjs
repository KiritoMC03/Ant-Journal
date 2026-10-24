import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupMetadataMenu } from './metadata-menu.mjs';

export const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const repository = resolve(project, '..');
export const vault = resolve(repository, 'AntJournal');
export const colonies = [
  ['cn-01', 'Camponotus nicobarensis'],
  ['cj-01', 'Camponotus japonicus'],
  ['ag-01', 'Acanthomyrmex glabfemoralis'],
];
export async function put(root, path, content) {
  const target=resolve(root,path), local=relative(resolve(root),target);
  if(isAbsolute(local)||local==='..'||local.startsWith('..'+sep)||resolve(root)===target) throw Error('Path escapes the vault');
  await mkdir(dirname(target),{recursive:true});
  try {await writeFile(target,content,{encoding:'utf8',flag:'wx'});}
  catch(error) {if(error.code!=='EEXIST') throw error;}
}
export function tracker(id, targets, names, title, axis='Individuals') {
  const colors=['#83b5a1','#d9ad65','#86a7cf','#c49acb'].slice(0,targets.length).join(', ');
  return '```tracker\n'+[
    'searchType: frontmatter','searchTarget: '+targets.map(key=>'_metric_'+key).join(', '),
    'datasetName: '+names.join(', '),'folder: Journal/'+id,'dateFormat: YYYY-MM-DD',
    'ignoreZeroValue: false','fitPanelWidth: true','line:','  title: '+title,
    '  yAxisLabel: '+JSON.stringify(axis),'  lineColor: '+JSON.stringify(colors),'  pointColor: '+JSON.stringify(colors),
    '  showLegend: true','  showPoint: true','  showLine: false','  fillGap: false',
  ].join('\n')+'\n```\n';
}
export const observationTemplate=`---
date:
colony_id:
workers:
queens:
eggs:
larvae:
pupae:
worker_deaths:
feed_syrup:
feed_protein:
feed_seeds:
watered:
condition:
temperature_c:
humidity_pct:
feed_notes:
water_notes:
notes:
---

## Observations

<!-- Required: date = YYYY-MM-DD filename; colony_id = colony folder.
workers, queens, eggs, larvae, pupae, worker_deaths: integer N, "~N", or "?".
worker_deaths: deaths since the previous observation; first record starts the observation period.
feed_syrup, feed_protein, feed_seeds, watered: explicit unquoted true or false.
condition: normal / attention / critical.
Optional: temperature_c, humidity_pct: N, N.N, "~N.N", or "?".
Never fill unobserved values with 0 or false. Empty fields are intentional.
Metadata Menu provides Date, Select, Boolean, and Input controls; see Docs/Fields. -->

## Feeding and water

## Photos

<!-- For public readers, use a relative embed from Journal/<id>/YYYY-MM-DD.md:\n![Colony photograph](../../Attachments/unique-filename.jpg). Keep original media bytes. -->
`;
export async function init(root=vault) {
  for(const folder of ['Colonies','Journal','Dashboards','Templates','Attachments','Docs','.obsidian']) await mkdir(resolve(root,folder),{recursive:true});
  for(const [id,species] of colonies) {
    await mkdir(resolve(root,'Journal',id),{recursive:true});
    await put(root,`Colonies/${id}.md`,`---\nid: ${id}\nspecies: ${species}\nname:\nfounded_on:\nacquired_on:\norigin:\nformicarium:\ninitial_workers:\n---\n\n# ${species} - ${id}\n\n[Charts and statistics](../Dashboards/${id}.md) | [Home](../Home.md)\n\nColony facts and the initial baseline are blank until known. Set initial_workers only when the population at the start of observations is known.\n\n## Permanent information\n`);
    const block='```ant-journal\nview: colony\ncolony: '+id+'\n```\n';
    await put(root,`Dashboards/${id}.md`,`# ${species} - ${id}\n\n[Colony card](../Colonies/${id}.md) | [Home](../Home.md)\n\n## Statistics and calculated series\n\n${block}\n## Workers and brood - Tracker\n\n${tracker(id,['workers','eggs','larvae','pupae'],['Workers','Eggs','Larvae','Pupae'],'Workers and brood')}\n## Deaths by interval - Tracker\n\n${tracker(id,['worker_deaths'],['Worker deaths'],'Deaths since the previous observation')}\n## Environment - Tracker\n\n${tracker(id,['temperature_c'],['Temperature'],'Temperature','C')}\n${tracker(id,['humidity_pct'],['Humidity'],'Humidity','%')}\n## Legend\n\nPoints use observation filename dates. Missing days are not zeros. Lines and interpolation are disabled. Tracker uses numeric projections; the table and source fields retain ~approximation. ? creates no point. An empty journal can produce Tracker's "No valid date" message; the core block explains the empty state.\n`);
  }
  await put(root,'Home.md','# Ant Journal\n\nPublic observations | original photos | plain Markdown\n\n'+colonies.map(([id,species])=>`- [${species} - ${id}](Colonies/${id}.md) - [charts](Dashboards/${id}.md)`).join('\n')+'\n\n[Compare colonies](Dashboards/Overview.md) | [Create an observation](Docs/Usage.md) | [Typed field controls](Docs/Fields.md) | [Validation](Docs/Validation.md) | [iPhone reminders](Docs/Notifications.md)\n\nOpen **Calendar Hub: Open calendar view** from the command palette.\n\n## Latest three observations\n\n```ant-journal\nview: recent\n```\n\nReal observations and original media in AntJournal are intended for public readers. Refresh the static [observation archive](Archive.md) with pnpm run archive:render after editing records. Keep secrets and local runtime state excluded; see [Publication policy](Docs/Privacy.md).\n');
  await put(root,'Dashboards/Overview.md','# Compare colonies\n\n[Home](../Home.md)\n\n```ant-journal\nview: overview\n```\n\nEach latest known value has its own measurement date. Missing values are not zero. Approximate values retain ~. The colony filter discovers valid colony cards automatically.\n');
  await put(root,'Templates/Observation.md',observationTemplate);
  await put(root,'Archive.md','# Observation archive\n\nNo observations have been indexed in this starter. For the real AntJournal vault, run pnpm run archive:render from the sibling ant-journal-plugin folder to generate the public calendar and entry links from existing records.\n');
  await put(root,'.obsidian/app.json',JSON.stringify({attachmentFolderPath:'Attachments',newFileLocation:'current',alwaysUpdateLinks:true,defaultViewMode:'preview',propertiesInDocument:'source'},null,2)+'\n');
  await put(root,'.obsidian/core-plugins.json',JSON.stringify(['file-explorer','global-search','switcher','backlink','outgoing-link','page-preview','tag-pane','properties','daily-notes','templates','note-composer','command-palette','editor-status','bookmarks','outline'],null,2)+'\n');
  await put(root,'.obsidian/templates.json',JSON.stringify({folder:'Templates',dateFormat:'YYYY-MM-DD',timeFormat:'HH:mm'},null,2)+'\n');
  await put(root,'.obsidian/daily-notes.json',JSON.stringify({folder:'Journal',format:'YYYY-MM-DD',autorun:false},null,2)+'\n');
  await put(root,'.obsidian/community-plugins.json',JSON.stringify(['ant-journal-core','calendar-hub','obsidian-tracker'],null,2)+'\n');
  await put(root,'.obsidian/plugins/calendar-hub/data.json',JSON.stringify({shouldConfirmBeforeCreate:true,shouldIndexDailyNotesInAllFolders:true,dailyNoteIncludedFolders:'Journal',shouldIndexDailyNotesFromFrontmatter:false,dailyNoteFrontmatterDateFields:'date',dailyNoteFilenameDateFormat:'YYYY-MM-DD',shouldIndexDailyNotesFromCreationDate:false,showWeeklyNote:false,weekStart:'monday',localeOverride:'en',sidebarViewMode:'calendar'},null,2)+'\n');
  await setupMetadataMenu(root);
  for(const name of await readdir(resolve(repository,'docs'))) if(name.endsWith('.md')) await put(root,'Docs/'+name,(await readFile(resolve(repository,'docs',name),'utf8')).replaceAll('../AntJournal/','../'));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  await init(process.argv[2]?resolve(process.argv[2]):vault);
  console.log('Journal vault initialized; existing files were preserved.');
}
