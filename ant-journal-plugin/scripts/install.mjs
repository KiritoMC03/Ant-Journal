import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { project, vault } from './init-vault.mjs';
export async function install(root = vault) {
  const target=resolve(root,'.obsidian/plugins/ant-journal-core');
  await mkdir(target,{recursive:true});
  for (const file of ['main.js','manifest.json','styles.css','LICENSE','AI_POLICY.md']) await copyFile(resolve(project,'dist',file),resolve(target,file));
}
if (!process.env.ANT_JOURNAL_IMPORT_ONLY) { await install(process.argv[2] ? resolve(process.argv[2]) : vault); console.log('Built plugin installed.'); }
