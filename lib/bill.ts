import { z } from 'zod';
import { currencyDigits, decimalToUnits } from './currencies';

export const networks = ['base', 'stellar', 'solana'] as const;
export type Network = typeof networks[number];
export const networkNames: Record<Network, string> = {base:'Base', stellar:'Stellar', solana:'Solana'};
export const USDC = {
  base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  stellar: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
  solana: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
} as const;
const cents = z.number().int().min(0).max(100_000_000);
export const billSchema = z.object({
  id: z.string().uuid(), title: z.string().trim().max(100),
  merchant: z.string().max(100), date: z.string().max(32), currency: z.string().regex(/^[A-Z]{3}$/),
  items: z.array(z.object({id:z.string().max(50), name:z.string().trim().max(120), quantity:z.number().positive().max(10000), amount:cents, people:z.array(z.string().max(50)).max(20)})).max(100),
  tax:cents, tip:cents, fees:cents, discount:cents, receiptTotal:cents.nullable(),
  people:z.array(z.object({id:z.string().max(50),name:z.string().trim().max(40),email:z.union([z.email(),z.literal('')]).optional()})).min(1).max(20),
  payerId:z.string().max(50), mode:z.enum(['equal','items']),
  wallets:z.object({base:z.string().max(60),stellar:z.string().max(60),solana:z.string().max(60)}),
  paypal:z.union([z.email(),z.literal('')]).default(''),
  rate:z.number().min(0).max(10000), rateDate:z.string().max(50),
  rateSource:z.string().max(50).optional(), precision:z.number().int().min(0).max(4).default(2),
  notes:z.array(z.string().max(400)).max(20), reviewed:z.boolean(), createdAt:z.number().int().nonnegative(),
});
export type Bill = z.infer<typeof billSchema>;
export const money = (amount:number, currency='USD', precision=2) => new Intl.NumberFormat('en', {style:'currency',currency,minimumFractionDigits:precision,maximumFractionDigits:precision}).format(amount / 10**precision);
export const decimalToCents = (value:string|number) => Math.round((Number(value)||0)*100);
export const total = (bill:Bill) => bill.items.reduce((s,i)=>s+i.amount,0)+bill.tax+bill.tip+bill.fees-bill.discount;
export const subtotal = (bill:Bill) => bill.items.reduce((s,i)=>s+i.amount,0);

// Largest remainders keep each cent accounted for, with deterministic ties.
export function allocate(amount:number, weights:number[]):number[] {
  if (!Number.isSafeInteger(amount) || amount < 0 || weights.some(w=>!Number.isFinite(w)||w<0)) throw new Error('Invalid allocation');
  const sum = weights.reduce((a,b)=>a+b,0);
  if (!sum) return weights.map(()=>0);
  const exact = weights.map(w=>amount*w/sum), result=exact.map(Math.floor);
  const order=exact.map((v,i)=>({i,remainder:v-result[i]})).sort((a,b)=>b.remainder-a.remainder||a.i-b.i);
  for(let left=amount-result.reduce((a,b)=>a+b,0),i=0;left>0;left--,i++) result[order[i%order.length].i]++;
  return result;
}
export function shares(bill:Bill) {
  const bases=bill.people.map(()=>0);
  if(bill.mode==='equal') allocate(subtotal(bill),bill.people.map(()=>1)).forEach((v,i)=>bases[i]=v);
  else for(const item of bill.items) {
    const parts=allocate(item.amount,bill.people.map(p=>item.people.includes(p.id)?1:0));
    parts.forEach((v,i)=>bases[i]+=v);
  }
  const extras=bill.tax+bill.tip+bill.fees;
  const weights=bases.some(Boolean)?bases:bill.people.map(()=>1);
  const extraShares=allocate(extras,weights), discounts=allocate(Math.min(bill.discount,subtotal(bill)),weights);
  const amounts=bases.map((b,i)=>b+extraShares[i]-discounts[i]);
  const usdcTotal=Math.round(Math.max(0,total(bill))*bill.rate*100/10**(bill.precision??2));
  const usdc=allocate(usdcTotal,amounts.map(v=>Math.max(0,v)));
  return bill.people.map((p,i)=>({...p,base:bases[i],extras:extraShares[i]-discounts[i],amount:amounts[i],usdc:usdc[i]}));
}
export function billProblems(bill:Bill,allowJoining=false):string[] {
  const problems:string[]=[];
  if(!bill.title.trim()||bill.items.some(i=>!i.name.trim())||bill.people.some(p=>!p.name.trim()))problems.push('Give the bill, each item, and each friend a name.');
  if(!bill.items.length || total(bill)<=0) problems.push('Add at least one item with an amount.');
  if(!allowJoining&&bill.people.length<2) problems.push('Add at least two friends, including the person who paid.');
  if(new Set(bill.people.map(p=>p.id)).size!==bill.people.length || new Set(bill.items.map(p=>p.id)).size!==bill.items.length) problems.push('Duplicate item or friend IDs.');
  if(!bill.people.some(p=>p.id===bill.payerId)) problems.push('Choose who paid the original bill.');
  if(bill.discount>subtotal(bill)) problems.push('Discount cannot be more than the items subtotal.');
  if(bill.mode==='items' && bill.items.some(i=>!i.people.length||new Set(i.people).size!==i.people.length||i.people.some(id=>!bill.people.some(p=>p.id===id)))) problems.push('Assign every item to at least one friend.');
  if(bill.receiptTotal!==null && total(bill)!==bill.receiptTotal) problems.push('The calculated total must match the receipt total. Correct the amounts or the receipt total.');
  if(!bill.reviewed) problems.push('Confirm that you have checked the receipt.');
  if(bill.rate<=0) problems.push('Set a USDC conversion rate.');
  if(bill.currency==='USD' && bill.rate!==1) problems.push('USD bills settle at 1 USDC per dollar.');
  return problems;
}
export function emptyBill():Bill {
  return {id:crypto.randomUUID(), title:'Dinner with friends', merchant:'',date:new Date().toISOString().slice(0,10),currency:'USD',precision:2,items:[],tax:0,tip:0,fees:0,discount:0,receiptTotal:null,people:[{id:'you',name:'You'}],payerId:'you',mode:'items',wallets:{base:'',stellar:'',solana:''},paypal:'',rate:1,rateDate:'',notes:[],reviewed:false,createdAt:Date.now()};
}
export function sampleBill():Bill {
  const b=emptyBill();
  return {...b,title:'Friday ramen',merchant:'Kumo Ramen',people:[{id:'you',name:'You'},{id:'mia',name:'Mia'},{id:'leo',name:'Leo'}],items:[
    {id:'ramen',name:'Tonkotsu ramen',quantity:2,amount:3600,people:['you','leo']},
    {id:'miso',name:'Spicy miso ramen',quantity:1,amount:1800,people:['mia']},
    {id:'gyoza',name:'Gyoza to share',quantity:1,amount:900,people:['you','mia','leo']},
    {id:'tea',name:'Iced green tea',quantity:3,amount:1200,people:['you','mia','leo']},
  ],tax:600,tip:1500,receiptTotal:9600,notes:['Example receipt. Replace it with your own before requesting payment.']};
}
export function paymentUri(network:Network,address:string,cents:number,reference:string):string {
  const amount=(cents/100).toFixed(2);
  if(network==='base') return `ethereum:${USDC.base}@8453/transfer?address=${encodeURIComponent(address)}&uint256=${BigInt(cents)*10000n}`;
  if(network==='solana') return `solana:${address}?${new URLSearchParams({amount,'spl-token':USDC.solana,label:'Tabby',memo:reference})}`;
  return `web+stellar:pay?${new URLSearchParams({destination:address,amount,asset_code:'USDC',asset_issuer:USDC.stellar,memo:reference,memo_type:'MEMO_TEXT',msg:'Tabby bill split'})}`;
}
export const paymentReference=(bill:Bill,personId:string)=>`tb-${bill.id.slice(0,8)}-${bill.people.findIndex(p=>p.id===personId)}`;
export const explorer=(network:Network,hash:string)=>network==='base'?`https://basescan.org/tx/${hash}`:network==='solana'?`https://solscan.io/tx/${hash}`:`https://stellar.expert/explorer/public/tx/${hash}`;

export function changeCurrency(bill:Bill,currency:string):Partial<Bill>{
  const precision=currencyDigits(currency),convert=(n:number)=>decimalToUnits(n/10**(bill.precision??2),precision);
  return {currency,precision,rate:currency==='USD'?1:0,rateDate:'',rateSource:'',reviewed:false,items:bill.items.map(item=>({...item,amount:convert(item.amount)})),tax:convert(bill.tax),tip:convert(bill.tip),fees:convert(bill.fees),discount:convert(bill.discount),receiptTotal:bill.receiptTotal===null?null:convert(bill.receiptTotal)};
}
