import { createHash } from 'node:crypto';
import { Bill, billSchema } from './bill';
import { Contact, mergeContacts } from './contacts';
import { readPrivateJson, savePrivatePhoto, updatePrivateJson } from './private-storage';
import { AccessError } from './auth';
export type CloudBill={bill:Bill;updated:number;version:number;token?:string;editToken?:string;dirty?:boolean;roomVersion?:number;photoPath?:string;hasPhoto?:boolean};
export type Account={bills:CloudBill[];contacts:Contact[]};
const accountPath=(uid:string)=>`accounts/${createHash('sha256').update(uid).digest('hex')}`;
export async function readAccount(uid:string){return (await readPrivateJson<Account>(`${accountPath(uid)}/index.json`))?.data??{bills:[],contacts:[]};}
export function publicAccount(account:Account){return {...account,bills:account.bills.map(({photoPath,...entry})=>({...entry,bill:billSchema.parse(entry.bill),hasPhoto:!!photoPath}))};}
export async function saveAccountBill(uid:string,input:{bill:Bill;baseVersion:number;token?:string;editToken?:string;dirty?:boolean;roomVersion?:number;photo?:string}){
  let photoPath:string|undefined;
  // Check the bill revision before uploading a new photo.
  const old=(await readAccount(uid)).bills.find(entry=>entry.bill.id===input.bill.id);
  if((old?.version??0)!==input.baseVersion)throw new AccessError('This bill changed on another device. Open its latest saved version before saving again.',409);
  if(input.photo)photoPath=await savePrivatePhoto(`${accountPath(uid)}/photos`,input.photo);
  return updatePrivateJson<Account>(`${accountPath(uid)}/index.json`,{bills:[],contacts:[]},account=>{
    const previous=account.bills.find(entry=>entry.bill.id===input.bill.id);
    if((previous?.version??0)!==input.baseVersion)throw new AccessError('This bill changed on another device. Your local edits are still available.',409);
    const entry:CloudBill={bill:input.bill,updated:Date.now(),version:input.baseVersion+1,token:input.token,editToken:input.editToken,dirty:input.dirty,roomVersion:input.roomVersion,photoPath:photoPath??previous?.photoPath};
    return {bills:[entry,...account.bills.filter(e=>e.bill.id!==input.bill.id)].slice(0,50),contacts:mergeContacts(account.contacts,input.bill.people.map(p=>({name:p.name,email:p.email||'',lastUsed:Date.now()})))};
  });
}
export async function saveAccountContacts(uid:string,contacts:Contact[]){return updatePrivateJson<Account>(`${accountPath(uid)}/index.json`,{bills:[],contacts:[]},account=>({...account,contacts:mergeContacts(account.contacts,contacts)}));}
