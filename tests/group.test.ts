import { test } from 'node:test';
import assert from 'node:assert/strict';
import { billProblems, sampleBill, shares, total } from '../lib/bill';
import { chooseItems, joinBill, proofAmountChanged, proofHash, Proof } from '../lib/group';

test('friends join and select items without removing another friend’s selections',()=>{
  let b=sampleBill();b.mode='items';b.reviewed=true;
  b=joinBill(b,{id:'sam',name:'Sam'});b=chooseItems(b,'sam',['ramen','tea']);
  assert.deepEqual(b.items.find(i=>i.id==='ramen')!.people,['you','leo','sam']);
  assert.deepEqual(b.items.find(i=>i.id==='miso')!.people,['mia']);
  const portions=shares(b);assert.equal(portions.reduce((n,p)=>n+p.amount,0),total(b));
  assert.ok(portions.find(p=>p.id==='sam')!.usdc>0);
  b=chooseItems(b,'sam',['tea']);assert.deepEqual(b.items[0].people,['you','leo']);
});
test('joining is idempotent, names do not silently impersonate existing friends, and an item cannot lose its last payer',()=>{
  const b=sampleBill();b.mode='items';
  assert.equal(joinBill(b,{id:b.people[0].id,name:'You'}),b);
  assert.throws(()=>joinBill(b,{id:'another',name:'MIA'}),/already listed/);
  assert.throws(()=>chooseItems(b,'mia',[]),/Every item needs/);
  assert.throws(()=>chooseItems(b,'unknown',['miso']),/Join/);
});
test('organizers can publish before friends join, but receipt review still applies',()=>{
  const b=sampleBill();b.people=[b.people[0]];b.items.forEach(i=>i.people=['you']);b.reviewed=true;
  assert.ok(billProblems(b).some(p=>p.includes('two friends')));
  assert.deepEqual(billProblems(b,true),[]);b.reviewed=false;
  assert.ok(billProblems(b,true).some(p=>p.includes('checked')));
});
test('external receipt links are never fetched for verification; amount changes remain visible',()=>{
  const hash='0x'+'a'.repeat(64);
  assert.equal(proofHash('base',`https://basescan.org/tx/${hash}`),hash);
  assert.equal(proofHash('base','https://basescan.org.evil.example/tx/x'),null);
  assert.equal(proofHash('paypal','https://www.paypal.com/receipt/example'),null);
  assert.equal(proofHash('base','https:// invalid receipt'),null);
  const b=sampleBill(),p=shares(b)[1];
  const proof:Proof={id:'test',personId:p.id,method:'paypal',reference:'receipt-123',amount:p.usdc,createdAt:Date.now(),status:'unverified',message:'Saved'};
  assert.equal(proofAmountChanged(proof,b),false);b.tip+=100;assert.equal(proofAmountChanged(proof,b),true);
});
