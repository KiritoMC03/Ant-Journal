import { stringify } from 'yaml';
import type { Data, Source } from '../src/model';
export const base: Data = {date:'2026-10-24',colony_id:'cn-01',workers:14,queens:1,eggs:'~25',larvae:12,pupae:8,worker_deaths:3,feed_syrup:true,feed_protein:false,feed_seeds:false,watered:true,condition:'normal',temperature_c:'~24.5',humidity_pct:'~60'};
export function note(data: Data = base, path=`Journal/${data.colony_id}/${data.date}.md`): Source { return {path,text:'---\n'+stringify(data)+'---\n\n## Observations\nSYNTHETIC TEST DATA. Never copy into a personal journal.\n![[test-photo.png]]\n'}; }
export function card(id='cn-01', baseline: unknown = 10, species='Camponotus nicobarensis'): Source {return {path:`Colonies/${id}.md`,text:'---\n'+stringify({id,species,initial_workers:baseline})+'---\n'};}
