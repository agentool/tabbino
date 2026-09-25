import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyBill, sampleBill, billProblems } from '../lib/bill';
import { populateProfile, removeParticipant } from '../lib/profile';
const profile={displayName:'Test Organizer',email:'organizer@example.com'};
test('signed-in initial participants use the runtime profile without receiving defaults',()=>{
 for(const bill of [emptyBill(),sampleBill()]){const result=populateProfile(bill,profile);assert.equal(result.people[0].name,profile.displayName);assert.equal(result.people[0].email,profile.email);assert.equal(result.payerId,'you');assert.deepEqual(result.wallets,{base:'',stellar:'',solana:''});assert.equal(result.paypal,'');assert.equal(populateProfile(result,{displayName:'Other',email:'other@example.com'}),result);}
});
test('profile autofill preserves edited people and supports missing display names',()=>{
 const bill=emptyBill();bill.people[0].name='Custom name';assert.equal(populateProfile(bill,profile),bill);
 const withEmail=emptyBill();withEmail.people[0].email='custom@example.com';assert.equal(populateProfile(withEmail,profile),withEmail);
 assert.equal(populateProfile(emptyBill(),{displayName:null,email:'sam@example.com'}).people[0].name,'sam');
 assert.equal(populateProfile(emptyBill(),{displayName:'N'.repeat(80),email:null}).people[0].name.length,40);
});
test('removing a payer cannot redirect their replacement to the previous recipient',()=>{
 const bill=sampleBill();bill.paypal='previous@example.com';bill.wallets.base='0x0000000000000000000000000000000000000001';
 const result=removeParticipant(bill,'you');assert.equal(result.payerId,'mia');assert.equal(result.paypal,'');assert.deepEqual(result.wallets,{base:'',stellar:'',solana:''});assert.ok(result.items.every(item=>!item.people.includes('you')));
 const other=removeParticipant(bill,'leo');assert.equal(other.paypal,bill.paypal);assert.deepEqual(other.wallets,bill.wallets);
 const single=emptyBill();assert.equal(removeParticipant(single,'you'),single);
});
test('invalid optional friend emails produce a readable correction before sharing',()=>{
 const bill=sampleBill();bill.people[1].email='not-an-email';assert.ok(billProblems(bill,true).some(message=>message.includes('valid email for Mia')));
});

import { populatePaymentDetails, isProfilePayer, emptyPaymentProfile } from '../lib/payment-profile';
const payments={wallets:{base:'0x0000000000000000000000000000000000000001',stellar:'',solana:''},paypal:'receiver@example.com'};
test('payment defaults apply only to the signed-in payer on an empty new bill',()=>{
 const bill=populateProfile(emptyBill(),profile);
 const result=populatePaymentDetails(bill,payments,profile.email);
 assert.deepEqual(result.wallets,payments.wallets);assert.equal(result.paypal,payments.paypal);
 assert.equal(populatePaymentDetails(bill,payments,'someone-else@example.com'),bill);
 assert.equal(populatePaymentDetails(bill,payments,null),bill);
 assert.equal(populatePaymentDetails(emptyBill(),payments,profile.email).paypal,'');
 const other={...bill,people:[...bill.people,{id:'friend',name:'Friend',email:profile.email}],payerId:'friend'};
 assert.equal(isProfilePayer(other,profile.email),false);assert.equal(populatePaymentDetails(other,payments,profile.email),other);
});
test('profile defaults cannot overwrite existing receipts or payment destinations',()=>{
 const existing=populateProfile(sampleBill(),profile);assert.equal(populatePaymentDetails(existing,payments,profile.email),existing);
 const custom=populateProfile(emptyBill(),profile);custom.paypal='custom@example.com';assert.equal(populatePaymentDetails(custom,payments,profile.email),custom);
 const wallet=populateProfile(emptyBill(),profile);wallet.wallets.base=payments.wallets.base;assert.equal(populatePaymentDetails(wallet,emptyPaymentProfile(),profile.email),wallet);
});
