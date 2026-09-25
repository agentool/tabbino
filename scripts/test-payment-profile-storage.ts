// Isolated synthetic profiles only. Uses the configured private Blob store.
import assert from 'node:assert/strict';
import { emptyPaymentProfile } from '../lib/payment-profile';
import { readPaymentProfile, savePaymentProfile } from '../lib/payment-profile-storage';
import { readAccount, saveAccountContacts } from '../lib/accounts';
async function main(){
 const uid=`TEST-profile-${crypto.randomUUID()}`,details={wallets:{base:'0x0000000000000000000000000000000000000001',stellar:'',solana:''},paypal:'test@example.com'};
 assert.deepEqual(await readPaymentProfile(uid),emptyPaymentProfile());
 const profile=await savePaymentProfile(uid,details,0);assert.equal(profile.version,1);
 await assert.rejects(savePaymentProfile(uid,details,0),/changed on another device/);
 await assert.rejects(savePaymentProfile(uid,{...details,wallets:{...details.wallets,base:'not-an-address'}},1),/valid Base/);
 await Promise.all([savePaymentProfile(uid,{...details,paypal:''},1),saveAccountContacts(uid,[{name:'Test',email:'test@example.com'}])]);
 assert.equal((await readPaymentProfile(uid)).version,2);assert.equal((await readAccount(uid)).contacts.length,1);
 assert.deepEqual(await readPaymentProfile(uid+'-other'),emptyPaymentProfile());
 const cleared=await savePaymentProfile(uid,emptyPaymentProfile(),2);assert.equal(cleared.paypal,'');assert.equal(cleared.wallets.base,'');
 console.log(JSON.stringify({profilePersistence:'pass',staleSaveRejected:'pass',invalidAddressRejected:'pass',accountIsolation:'pass',independentAccountWrites:'pass',clearDefaults:'pass'}));
}
main().catch(()=>{console.error('Payment profile storage checks failed.');process.exitCode=1;});
