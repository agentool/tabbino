import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allocate,billProblems,emptyBill,paymentUri,sampleBill,shares,total } from '../lib/bill';
import { decodeBill,encodeBill,validAddress,validateReady } from '../lib/server';
import { Keypair as SolanaKeypair } from '@solana/web3.js';
import { Keypair as StellarKeypair } from '@stellar/stellar-sdk';
test('new and example bills require organizer-supplied payment details',()=>{
  for(const b of [emptyBill(),sampleBill()]){
    assert.deepEqual(b.wallets,{base:'',stellar:'',solana:''});assert.equal(b.paypal,'');
  }
  const b=sampleBill();b.reviewed=true;
  assert.throws(()=>validateReady(b),/Add a receiving wallet address or PayPal email/);
  b.paypal='recipient@example.com';assert.doesNotThrow(()=>validateReady(b));
});
test('spare cents are conserved across equal splits',()=>{
  for(let amount=1;amount<10000;amount+=37)for(let people=1;people<20;people++){
    const result=allocate(amount,Array(people).fill(1));assert.equal(result.reduce((a,b)=>a+b,0),amount);assert.ok(Math.max(...result)-Math.min(...result)<=1);
  }
});
test('item assignment, extras and conversion preserve totals',()=>{
  const b=sampleBill();b.mode='items';b.discount=319;b.receiptTotal=null;b.rate=1.0875;
  const result=shares(b);assert.equal(result.reduce((s,p)=>s+p.amount,0),total(b));assert.equal(result.reduce((s,p)=>s+p.usdc,0),Math.round(total(b)*b.rate));assert.ok(result.every(p=>p.amount>=0));
});
test('missing assignments and mismatched receipts block sharing',()=>{
  const b=sampleBill();b.reviewed=true;b.mode='items';b.items[0].people=[];
  assert.ok(billProblems(b).some(p=>p.includes('Assign every')));b.receiptTotal=123;
  assert.ok(billProblems(b).some(p=>p.includes('match the receipt')));
});
test('share links round trip and reject tampering',()=>{
  process.env.SHARE_SECRET='test-only-secret';const b=sampleBill();b.reviewed=true;b.paypal='recipient@example.com';validateReady(b);
  const token=encodeBill(b);assert.deepEqual(decodeBill(token),b);
  const bytes=Buffer.from(token,'base64url');bytes[30]^=1;assert.throws(()=>decodeBill(bytes.toString('base64url')));
});
test('synthetic receiving addresses validate and native requests encode the right assets',()=>{
  const b=sampleBill();b.wallets={base:'0x0000000000000000000000000000000000000001',stellar:StellarKeypair.random().publicKey(),solana:SolanaKeypair.generate().publicKey.toBase58()};
  for(const n of ['base','stellar','solana'] as const)assert.ok(validAddress(n,b.wallets[n]));
  assert.ok(paymentUri('base',b.wallets.base,1234,'test').endsWith('uint256=12340000'));
  assert.ok(paymentUri('stellar',b.wallets.stellar,1234,'test').includes('asset_code=USDC'));
  assert.ok(paymentUri('solana',b.wallets.solana,1234,'test').includes('amount=12.34'));
});
