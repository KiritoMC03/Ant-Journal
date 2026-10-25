import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chartLinePath} from '../src/chart';
import {auditVault,series,statistics} from '../src/journal';
import {base,card,note} from './helpers';

const points=(values:(number|string)[])=>{
  const audit=auditVault([card(),...values.map((workers,index)=>note({...base,date:`2026-10-${String(index+1).padStart(2,'0')}`,workers}))]);
  return series(statistics(audit.observations,audit.colonies[0].baseline),'workers');
};
const x=(date:string)=>Number(date.slice(-2)),y=(value:number)=>value;

test('chart lines include zero and approximate observations at their actual dates without extra points',()=>{
  const input=points([0,'~14',30]);input[2].date='2026-10-09';
  assert.equal(chartLinePath(input,x,y),'M 1 0 L 2 14 L 9 30');
  assert.equal(input[1].approximate,true);
  assert.deepEqual(input.map(point=>point.value),[0,14,30]);
});
test('chart lines break at unknown measurements and resume only with consecutive known measurements',()=>{
  assert.equal(chartLinePath(points([1,2,'?',4,5,'?',7]),x,y),'M 1 1 L 2 2 M 4 4 L 5 5');
  assert.equal(chartLinePath(points([1,'?',3]),x,y),'');
});
test('empty, unknown, and single-point charts have no connecting line',()=>{
  for(const input of [[],points(['?']),points([0]),points(['~14']),points(['?',3,'?'])])assert.equal(chartLinePath(input,x,y),'');
});
test('calculated series with an unknown baseline or death interval cannot gain a fabricated line',()=>{
  const audit=auditVault([card('cn-01',null),note({...base,date:'2026-10-01',worker_deaths:0}),note({...base,date:'2026-10-02',worker_deaths:'?'}),note({...base,date:'2026-10-03',worker_deaths:2})]);
  const rows=statistics(audit.observations,audit.colonies[0].baseline);
  assert.equal(chartLinePath(series(rows,'produced'),x,y),'');
  assert.equal(chartLinePath(series(rows,'cumulativeDeaths'),x,y),'');
});
