import { TrellisVcsEngine } from '../src/engine.ts';

const root = process.cwd();

const t0 = performance.now();
const e1 = new TrellisVcsEngine({ rootPath: root });
const r1 = e1.open();
const t1 = performance.now();
const stats1 = e1.getMaterializationStats();

const t2 = performance.now();
const e2 = new TrellisVcsEngine({ rootPath: root });
const r2 = e2.open();
const t3 = performance.now();
const stats2 = e2.getMaterializationStats();

console.log('firstOpenMs:', (t1 - t0).toFixed(2));
console.log('secondOpenMs:', (t3 - t2).toFixed(2));
console.log('first opsReplayed:', r1.opsReplayed);
console.log('second opsReplayed:', r2.opsReplayed);
console.log('first stats:', stats1);
console.log('second stats:', stats2);
