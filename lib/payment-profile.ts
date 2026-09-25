import { z } from 'zod';
import type { Bill } from './bill';
export const paymentProfileSchema=z.object({
 wallets:z.object({base:z.string().trim().max(60),stellar:z.string().trim().max(60),solana:z.string().trim().max(60)}),
 paypal:z.union([z.email(),z.literal('')]),
});
export type PaymentDetails=z.infer<typeof paymentProfileSchema>;
export type PaymentProfile=PaymentDetails&{version:number};
export const emptyPaymentProfile=():PaymentProfile=>({wallets:{base:'',stellar:'',solana:''},paypal:'',version:0});
export function isProfilePayer(bill:Bill,email:string|null|undefined){
 const payer=bill.people.find(p=>p.id===bill.payerId);
 return !!email&&payer?.id==='you'&&payer.email?.toLowerCase()===email.toLowerCase();
}
// Only initialize a fresh, empty bill. Existing destinations remain bill snapshots.
export function populatePaymentDetails(bill:Bill,profile:PaymentDetails,email:string|null|undefined):Bill{
 if(!isProfilePayer(bill,email)||bill.items.length||bill.paypal||Object.values(bill.wallets).some(Boolean))return bill;
 return {...bill,wallets:{...profile.wallets},paypal:profile.paypal};
}
