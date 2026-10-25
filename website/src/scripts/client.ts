import {chartSvg,metrics,calendarHtml,monthLabel,shiftMonth,type CalendarEntry,type Point} from '../lib/visuals';
import {escape} from '../lib/text';
import {feeding} from '../../../ant-journal-plugin/src/journal';
import type {Observation} from '../../../ant-journal-plugin/src/model';
// Client-safe helpers are bundled separately; no vault paths or YAML parser enter this module.
const query=()=>new URLSearchParams(location.search);
function updateQuery(values:Record<string,string>) {const params=query();for(const [key,value]of Object.entries(values)){if(value)params.set(key,value);else params.delete(key);}history.replaceState(null,'',location.pathname+(params.size?'?'+params:'')+location.hash);}
const input=(root:ParentNode,selector:string)=>root.querySelector<HTMLInputElement|HTMLSelectElement>(selector)!;
const themeButton=document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
themeButton?.addEventListener('click',()=>{const dark=document.documentElement.dataset.theme?document.documentElement.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;const theme=dark?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('ant-journal-theme',theme);}catch{}});

const archive=document.querySelector<HTMLElement>('[data-archive-list]');
if(archive) {
  const records=[...archive.querySelectorAll<HTMLElement>('[data-record]')],search=input(document,'[data-search-input]'),colony=input(document,'[data-colony-filter]'),from=input(document,'[data-archive-from]'),to=input(document,'[data-archive-to]');
  let page=1;const pageSize=12;
  const normalize=(s:string)=>s.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase();
  function apply() {
    const term=normalize(search.value),matches=records.filter(r=>(!colony.value||r.dataset.colony===colony.value)&&(!from.value||r.dataset.date!>=from.value)&&(!to.value||r.dataset.date!<=to.value)&&normalize(r.dataset.search??'').includes(term));
    const pages=Math.max(1,Math.ceil(matches.length/pageSize));page=Math.max(1,Math.min(page,pages));
    records.forEach(r=>r.hidden=true);matches.slice((page-1)*pageSize,page*pageSize).forEach(r=>r.hidden=false);
    document.querySelector('[data-results]')!.textContent=`${matches.length} observation${matches.length===1?'':'s'}`;
    (document.querySelector('[data-no-results]')as HTMLElement).hidden=matches.length>0;
    (document.querySelector('[data-pagination]')as HTMLElement).hidden=pages<=1;
    document.querySelector('[data-page-label]')!.textContent=`${page} / ${pages}`;
    (document.querySelector('[data-prev-page]')as HTMLButtonElement).disabled=page<=1;(document.querySelector('[data-next-page]')as HTMLButtonElement).disabled=page>=pages;
    updateQuery({q:search.value,colony:colony.value,from:from.value,to:to.value,page:page>1?String(page):''});
  }
  function restore(){const params=query();search.value=params.get('q')??'';colony.value=params.get('colony')??'';from.value=params.get('from')??'';to.value=params.get('to')??'';page=Number(params.get('page'))||1;apply();}
  [search,colony,from,to].forEach(el=>el.addEventListener('input',()=>{page=1;apply();}));
  document.querySelector('[data-reset]')?.addEventListener('click',()=>{search.value=colony.value=from.value=to.value='';page=1;apply();});
  document.querySelector('[data-prev-page]')?.addEventListener('click',()=>{page--;apply();});document.querySelector('[data-next-page]')?.addEventListener('click',()=>{page++;apply();});
  addEventListener('popstate',restore);restore();
}
for(const root of document.querySelectorAll<HTMLElement>('[data-chart]')) {
  const datasets=JSON.parse(root.querySelector('[data-chart-data]')!.textContent!)as Record<string,Point[]>;
  const metric=input(root,'[data-metric]'),from=input(root,'[data-from]'),to=input(root,'[data-to]');
  const params=query();metric.value=params.get('metric')&&datasets[params.get('metric')!]?params.get('metric')!:'workers';if(params.get('from'))from.value=params.get('from')!;if(params.get('to'))to.value=params.get('to')!;
  const apply=()=>{
    const points=datasets[metric.value].filter(p=>(!from.value||p.date>=from.value)&&(!to.value||p.date<=to.value)),label=metrics.find(([key])=>key===metric.value)![1];
    root.querySelector('[data-plot]')!.innerHTML=chartSvg(points,label);root.querySelector('[data-value-label]')!.textContent=label;
    root.querySelector('[data-chart-table]')!.innerHTML=points.map(p=>`<tr><td><a href="${escape(p.href)}">${p.date}</a></td><td>${p.value===null?'?':`${p.approximate?'~':''}${p.value}`}</td></tr>`).join('');
    const feed=document.querySelector<HTMLElement>('[data-feeding]');
    if(feed){
      const observations=JSON.parse(feed.querySelector('[data-feeding-data]')!.textContent!)as Observation[],summary=feeding(observations,from.value||'0001-01-01',to.value||'9999-12-31'),labels={feed_syrup:'Syrup',feed_protein:'Protein',feed_seeds:'Seeds'};
      feed.querySelector('[data-feeding-summary]')!.innerHTML=summary.map(s=>`<span><strong>${s.count}</strong> ${labels[s.field]} events<small> · ${s.count}/${s.known} observed records</small></span>`).join('');
      feed.querySelector('[data-feeding-dates]')!.innerHTML=summary.map(s=>`<p><strong>${labels[s.field]}:</strong> ${s.dates.length?s.dates.map(date=>`<a href="${document.body.dataset.base}journal/${feed.dataset.colony}/${date}/">${date}</a>`).join(', '):'No recorded feeding events.'}</p>`).join('');
    }
    updateQuery({metric:metric.value==='workers'?'':metric.value,from:from.value,to:to.value});
  };
  [metric,from,to].forEach(el=>el.addEventListener('change',apply));apply();
}
const calendar=document.querySelector<HTMLElement>('[data-calendars]');
if(calendar) {
  const entries=JSON.parse(document.querySelector('[data-calendar-data]')!.textContent!)as CalendarEntry[];
  const month=input(document,'[data-month]'),colony=input(document,'[data-calendar-colony]');
  if(!month.value)month.value=new Date().toISOString().slice(0,7);
  const params=query();if(/^\d{4}-(?:0[1-9]|1[0-2])$/.test(params.get('month')??''))month.value=params.get('month')!;colony.value=params.get('colony')??'';
  const apply=()=>{if(!month.value)return;calendar.innerHTML=`<section class="calendar-panel"><h2>${monthLabel(month.value)}</h2>${calendarHtml(month.value,entries.filter(e=>!colony.value||e.colonyId===colony.value))}</section>`;updateQuery({month:month.value,colony:colony.value});};
  (document.querySelector('[data-calendar-navigation]')as HTMLElement).hidden=false;
  document.querySelector('[data-prev-month]')?.addEventListener('click',()=>{month.value=shiftMonth(month.value,-1);apply();});document.querySelector('[data-next-month]')?.addEventListener('click',()=>{month.value=shiftMonth(month.value,1);apply();});
  month.addEventListener('change',apply);colony.addEventListener('change',apply);apply();
}
const dialog=document.querySelector<HTMLDialogElement>('[data-lightbox]');
if(dialog) {
  const images=[...document.querySelectorAll<HTMLAnchorElement>('[data-gallery]')];let index=0;
  const show=()=>{const link=images[index],image=dialog.querySelector('img')!;image.src=link.href;image.alt=link.querySelector('img')?.alt??'';dialog.querySelector('figcaption')!.textContent=image.alt;};
  images.forEach((link,i)=>link.addEventListener('click',event=>{event.preventDefault();index=i;show();dialog.showModal();}));
  dialog.querySelector('[data-close]')!.addEventListener('click',()=>dialog.close());
  const step=(direction:number)=>{if(!images.length)return;index=(index+direction+images.length)%images.length;show();};
  dialog.querySelector('[data-previous-image]')!.addEventListener('click',()=>step(-1));dialog.querySelector('[data-next-image]')!.addEventListener('click',()=>step(1));
  dialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft')step(-1);if(event.key==='ArrowRight')step(1);});
}
setInterval(async()=>{
  if(document.hidden)return;
  try{const response=await fetch((document.body.dataset.base??'/')+'version.json?t='+Date.now(),{cache:'no-store'});if(response.ok&&(await response.json()).version!==document.body.dataset.version)(document.querySelector('[data-update]')as HTMLElement).hidden=false;}catch{}
},60000);
