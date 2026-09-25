import { AccessError } from './auth';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { isAddress } from 'viem';
import { PublicKey } from '@solana/web3.js';
import { StrKey } from '@stellar/stellar-sdk';
import { Bill, billSchema, billProblems, networks, Network } from './bill';

function key() { if(!process.env.SHARE_SECRET) throw new Error('Sharing is not configured.'); return createHash('sha256').update(process.env.SHARE_SECRET).digest(); }
export function encodeBill(bill:Bill) {
  const iv=randomBytes(12), cipher=createCipheriv('aes-256-gcm',key(),iv);
  const ciphertext=Buffer.concat([cipher.update(deflateRawSync(JSON.stringify(bill))),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),ciphertext]).toString('base64url');
}
export function decodeBill(token:string):Bill {
  if(token.length>16000||!/^[A-Za-z0-9_-]+$/.test(token)) throw new Error('Invalid split link.');
  try {
    const data=Buffer.from(token,'base64url'), decipher=createDecipheriv('aes-256-gcm',key(),data.subarray(0,12));
    decipher.setAuthTag(data.subarray(12,28));
    const raw=Buffer.concat([decipher.update(data.subarray(28)),decipher.final()]);
    return billSchema.parse(JSON.parse(inflateRawSync(raw,{maxOutputLength:100000}).toString()));
  } catch { throw new Error('This split link is incomplete or no longer valid. Ask your friend to share it again.'); }
}
export function validAddress(network:Network,address:string) {
  if(network==='base') return isAddress(address)&&!/^0x0{40}$/i.test(address);
  if(network==='stellar') return StrKey.isValidEd25519PublicKey(address);
  try { return PublicKey.isOnCurve(new PublicKey(address).toBytes()); } catch { return false; }
}
export function validateReady(bill:Bill,allowJoining=false) {
  const issues=billProblems(bill,allowJoining);
  if(!bill.paypal&&!networks.some(n=>bill.wallets[n])) issues.push('Add a receiving wallet address or PayPal email.');
  for(const n of networks) if(bill.wallets[n]&&!validAddress(n,bill.wallets[n])) issues.push(`Enter a valid ${n} receiving address.`);
  if(issues.length) throw new Error(issues[0]);
}
const buckets=new Map<string,{used:number,until:number}>();
// Per-instance guard; a Vercel Firewall rule is recommended for high-volume public use.
export function guard(request:Request,scope:string,limit=40) {
  const origin=request.headers.get('origin');
  if(origin && new URL(origin).host!==new URL(request.url).host) throw new Error('Please use this app directly.');
  const ip=request.headers.get('x-vercel-forwarded-for')?.split(',')[0]||request.headers.get('x-forwarded-for')?.split(',')[0]||'local';
  const now=Date.now(),key=`${scope}:${ip}`;
  if(buckets.size>5000) for(const [k,v] of buckets) if(v.until<now) buckets.delete(k);
  const bucket=buckets.get(key);
  if(bucket&&bucket.until>now) { if(bucket.used>=limit) throw new Error('Too many requests. Please try again in a few minutes.'); bucket.used++; }
  else buckets.set(key,{used:1,until:now+10*60*1000});
}
export async function jsonBody(request:Request,max=100000) {
  if(Number(request.headers.get('content-length'))>max) throw new Error('This request is too large.');
  const reader=request.body?.getReader();
  if(!reader) throw new Error('A request body is required.');
  const chunks:Uint8Array[]=[]; let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new Error('This request is too large.');}chunks.push(value);}
  return JSON.parse(Buffer.concat(chunks).toString());
}
export const fail=(error:unknown,status=400)=>Response.json({error:error instanceof Error?error.message:'Something went wrong. Please try again.'},{status:error instanceof AccessError?error.status:status,headers:{'Cache-Control':'no-store'}});
