import {chartLinePath} from '../../../ant-journal-plugin/src/chart';
import {escape} from './text';
export interface Point {date:string;value:number|null;approximate:boolean;path:string;href?:string}
export const metrics=[['workers','Workers'],['eggs','Eggs'],['larvae','Larvae'],['pupae','Pupae'],['worker_deaths','Interval worker deaths'],['living','All living stages'],['cumulativeDeaths','Cumulative worker deaths'],['produced','Produced workers'],['temperature_c','Temperature · °C'],['humidity_pct','Humidity · %']] as const;
export function dateLabel(date:string,short=false) {return new Intl.DateTimeFormat('en',{month:'short',day:'numeric',...(!short?{year:'numeric'}:{}),timeZone:'UTC'}).format(new Date(date+'T00:00:00Z'));}
export function chartSvg(points:Point[],label:string):string {
  const valid=points.filter(p=>p.value!==null);
  if(!valid.length)return '<p class="empty-chart">No known values in this period. Unknown measurements are not zero.</p>';
  const W=880,H=290,L=52,R=20,T=24,B=48;
  const times=points.map(p=>Date.parse(p.date+'T00:00:00Z')),minX=Math.min(...times),maxX=Math.max(...times);
  const minY=Math.min(0,...valid.map(p=>p.value!)),rawMax=Math.max(0,...valid.map(p=>p.value!)),maxY=rawMax===minY?minY+1:rawMax+(rawMax-minY)*.12;
  const x=(date:string)=>L+(maxX===minX?.5:(Date.parse(date+'T00:00:00Z')-minX)/(maxX-minX))*(W-L-R),y=(value:number)=>H-B-(value-minY)/(maxY-minY)*(H-T-B);
  const ticks=Array.from({length:5},(_,i)=>minY+(maxY-minY)*i/4);
  const dates=[points[0].date,...(points.length>2?[points[Math.floor(points.length/2)].date]:[]),...(points.length>1?[points.at(-1)!.date]:[])];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escape(label)} over observed dates"><title>${escape(label)} over observed dates</title>${ticks.map(v=>`<line class="grid-line" x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${L-12}" y="${y(v)+4}" text-anchor="end">${Number(v.toFixed(1))}</text>`).join('')}${dates.map(d=>`<text class="axis" x="${x(d)}" y="${H-16}" text-anchor="middle">${dateLabel(d,true)}</text>`).join('')}<path class="series-line" d="${chartLinePath(points,x,y)}"/>${valid.map(p=>`<a href="${escape(p.href??'#')}"><circle class="series-point ${p.approximate?'approximate':''}" cx="${x(p.date)}" cy="${y(p.value!)}" r="5" tabindex="0" aria-label="${escape(`${p.date}: ${p.approximate?'~':''}${p.value}`)}"><title>${escape(`${dateLabel(p.date)} · ${p.approximate?'~':''}${p.value}`)}</title></circle></a>`).join('')}</svg>`;
}
export interface CalendarEntry {date:string;colonyId:string;href:string;name:string}
export function monthLabel(month:string) {return new Intl.DateTimeFormat('en',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T00:00:00Z'));}
export function shiftMonth(month:string,offset:number) {const date=new Date(month+'-01T00:00:00Z');date.setUTCMonth(date.getUTCMonth()+offset);return date.toISOString().slice(0,7);}
export function calendarHtml(month:string,entries:CalendarEntry[]) {
  const first=new Date(month+'-01T00:00:00Z'),offset=(first.getUTCDay()+6)%7,last=new Date(first);last.setUTCMonth(last.getUTCMonth()+1);
  const days=Math.round((last.getTime()-first.getTime())/86400000);
  const cells=Array.from({length:Math.ceil((offset+days)/7)*7},(_,i)=>{
    const day=i-offset+1;if(day<1||day>days)return '<div class="calendar-day outside" aria-hidden="true"></div>';
    const date=month+'-'+String(day).padStart(2,'0'),notes=entries.filter(e=>e.date===date);
    return `<div class="calendar-day ${notes.length?'observed':''}"><time datetime="${date}">${day}</time>${notes.map(e=>`<a class="calendar-note colony-${escape(e.colonyId)}" href="${escape(e.href)}" title="${escape(e.name+' · '+date)}">${escape(e.name)}<span>${escape(e.colonyId)}</span></a>`).join('')}</div>`;
  });
  return `<div class="calendar-weekdays" aria-hidden="true">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<span>${d}</span>`).join('')}</div><div class="calendar-grid">${cells.join('')}</div>`;
}
