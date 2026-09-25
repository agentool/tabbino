import { createHash } from 'node:crypto';
import { AccessError } from './auth';
import { readPrivateJson, updatePrivateJson } from './private-storage';
import { emptyPaymentProfile, paymentProfileSchema, type PaymentDetails, type PaymentProfile } from './payment-profile';
import { networks, networkNames } from './bill';
import { validAddress } from './server';
const path=(uid:string)=>`accounts/${createHash('sha256').update(uid).digest('hex')}/payment-profile.json`;
export async function readPaymentProfile(uid:string):Promise<PaymentProfile>{return (await readPrivateJson<PaymentProfile>(path(uid)))?.data??emptyPaymentProfile();}
export async function savePaymentProfile(uid:string,input:PaymentDetails,baseVersion:number){
 const details=paymentProfileSchema.parse(input);
 for(const network of networks)if(details.wallets[network]&&!validAddress(network,details.wallets[network]))throw new Error(`Enter a valid ${networkNames[network]} receiving address.`);
 return updatePrivateJson<PaymentProfile>(path(uid),emptyPaymentProfile(),current=>{
  if(current.version!==baseVersion)throw new AccessError('Your payment details changed on another device. Reload them before saving again.',409);
  return {...details,version:baseVersion+1};
 });
}
