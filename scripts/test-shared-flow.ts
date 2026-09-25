// Explicit integration smoke test: creates clearly named test bills in the configured Blob store.
// Run: node --import tsx scripts/test-shared-flow.ts <base-url>
import {sampleBill,shares,total} from '../lib/bill';
import assert from 'node:assert/strict';
const base=process.argv[2]||'http://localhost:3034';
async function post(path:string,body:unknown){const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data;}
async function main(){
const bill=sampleBill();bill.paypal='recipient@example.com';bill.title='TEST — shared contributions';bill.reviewed=true;bill.mode='items';
const created=await post('/api/share',{bill});const {token}=created;
assert.ok(token.startsWith('live.'));
const people=[{id:crypto.randomUUID(),name:'Test Sam'},{id:crypto.randomUUID(),name:'Test Bea'}];
await Promise.all(people.map(person=>post('/api/group',{token,action:'join',person})));
await Promise.all(people.map(person=>post('/api/group',{token,action:'items',personId:person.id,itemIds:['gyoza','tea']})));
let current=await post('/api/share',{token});
assert.equal(current.bill.people.length,5);
for(const person of people)assert.ok(current.bill.items.find((i:any)=>i.id==='gyoza').people.includes(person.id));
assert.equal(shares(current.bill).reduce((n,p)=>n+p.amount,0),total(current.bill));
const amount=shares(current.bill).find(p=>p.id===people[0].id)!.usdc;
const payPal=await post('/api/proof',{token,id:crypto.randomUUID(),personId:people[0].id,expectedAmount:amount,method:'paypal',reference:'https://www.paypal.com/receipt/TEST-NOT-A-PAYMENT',verify:true});
assert.equal(payPal.proof.status,'failed');assert.match(payPal.proof.message,/Proof saved/);
const raw=await post('/api/proof',{token,id:crypto.randomUUID(),personId:people[1].id,expectedAmount:amount,method:'base',reference:'TEST-UNVERIFIED-HASH',verify:false});assert.equal(raw.proof.status,'unverified');
const failed=await post('/api/proof',{token,id:crypto.randomUUID(),personId:people[1].id,expectedAmount:amount,method:'base',reference:'TEST-INVALID-HASH',verify:true});assert.equal(failed.proof.status,'failed');
const changed=await post('/api/proof',{token,id:crypto.randomUUID(),personId:people[1].id,expectedAmount:amount+1,method:'base',reference:'TEST-OLD-AMOUNT-HASH',verify:true});assert.equal(changed.proof.status,'failed');assert.equal(changed.proof.amount,amount+1);assert.match(changed.proof.message,/share changed/);
current=await post('/api/share',{token});assert.equal(current.group.proofs.length,4);
const bad=await fetch(base+'/api/share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:token.slice(0,-1)+(token.endsWith('a')?'b':'a')})});assert.equal(bad.status,400);
console.log(JSON.stringify({concurrentJoins:'pass',concurrentSelections:'pass',totalConservation:'pass',paypalFailureStillSaved:'pass',unverifiedHashSaved:'pass',failedHashSaved:'pass',changedAmountSaved:'pass',readAfterReload:'pass',tamperedLinkRejected:'pass',proofCount:current.group.proofs.length}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
