import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMeasurement, validDate } from '../src/model';
for (const raw of [42,'42','~100',0,'0','~0']) test(`count ${JSON.stringify(raw)}`,()=> {
  assert.deepEqual(parseMeasurement(raw), {kind:'known',value:Number(String(raw).replace('~','')),approximate:String(raw).startsWith('~')});
});
for (const raw of [24.5,'24.5','~24.5','~24','0.0']) test(`decimal ${JSON.stringify(raw)}`,()=>assert.equal(parseMeasurement(raw,true).kind,'known'));
for (const raw of [-1,'-1','NaN',NaN,Infinity,'Infinity','two',1.5,'1.5','~1.5','~ 100',' 42','42 ','1e2',true,{},[],Number.MAX_SAFE_INTEGER+1]) test(`invalid count ${String(raw)}`,()=>assert.equal(parseMeasurement(raw).kind,'invalid'));
test('explicit unknown differs from missing',()=> {assert.equal(parseMeasurement('?').kind,'unknown'); for(const raw of [null,undefined,'']) assert.equal(parseMeasurement(raw).kind,'missing');});
test('humidity range 0..100 and decimal point',()=> {for(const raw of [0,100,'~60.5']) assert.equal(parseMeasurement(raw,true,100).kind,'known'); for(const raw of [150,'~100.1','60,5','~ 24.5']) assert.equal(parseMeasurement(raw,true,100).kind,'invalid');});
test('real calendar dates without timezone shifts',()=> {for(const date of ['2026-10-24','2024-02-29']) assert.ok(validDate(date)); for(const date of ['2026-02-29','2026-13-01','2026-02-30','0000-01-01',new Date(),'2026-1-01']) assert.ok(!validDate(date));});
