export function normalizeBase(value='') {return '/'+value.split('/').filter(Boolean).join('/')+(value.split('/').filter(Boolean).length?'/':'');}
export const slug=(text:string)=>text.normalize('NFKC').toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'');
export const escape=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
