'use client';
import { useEffect, useRef, useState } from 'react';
import type { CloudBill, Account } from '@/lib/accounts';
import type { Bill } from '@/lib/bill';
import { Contact, mergeContacts } from '@/lib/contacts';
import { useSession } from './AuthProvider';
export function useAccount(){
 const session=useSession(),[bills,setBills]=useState<CloudBill[]>([]),[contacts,setContacts]=useState<Contact[]>([]),[status,setStatus]=useState(''),[saving,setSaving]=useState(false);
 const currentUid=useRef(session.user?.uid);currentUid.current=session.user?.uid;
 const versions=useRef<Record<string,number>>({}),loaded=useRef(false),lock=useRef(false);
 useEffect(()=>{let active=true;loaded.current=false;versions.current={};setBills([]);setContacts([]);setStatus('');const key=`tabby-contacts:${session.user?.uid||'guest'}`;try{setContacts(JSON.parse(localStorage.getItem(key)||'[]'));}catch{}if(!session.user)return;
 setStatus('Loading your saved bills…');session.headers().then(headers=>fetch('/api/account',{headers})).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error);return data as Account;}).then(data=>{if(active){loaded.current=true;setBills(data.bills);setContacts(c=>mergeContacts(c,data.contacts));setStatus('');}}).catch(e=>{if(active)setStatus(e.message);});return()=>{active=false;};},[session.user?.uid]);
 function remember(contact:Contact){setContacts(old=>{const next=mergeContacts(old,[contact]);try{localStorage.setItem(`tabby-contacts:${session.user?.uid||'guest'}`,JSON.stringify(next));}catch{}return next;});if(session.user)void session.headers().then(headers=>fetch('/api/account',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({action:'contacts',contacts:[contact]})})).catch(()=>{});}
 async function save(bill:Bill,token:string,editToken:string,dirty:boolean,photo:string,roomVersion:number){
 if(!session.user)throw new Error('Sign in with Google to save across devices. This draft is already on your device.');
 if(!loaded.current)throw new Error('Wait for your saved bills to load.');
 if(lock.current)throw new Error('Your previous save is still finishing.');
 if(versions.current[bill.id]===undefined&&bills.some(e=>e.bill.id===bill.id))throw new Error('Open the account copy from Saved bills before saving over it. Your local draft is still available.');
 const savingUid=session.user.uid;lock.current=true;setSaving(true);setStatus('Saving bill and receipt photo…');
 try{const response=await fetch('/api/account',{method:'POST',headers:{...await session.headers(),'Content-Type':'application/json'},body:JSON.stringify({action:'save',bill,baseVersion:versions.current[bill.id]??0,token,editToken,dirty,roomVersion,photo:photo.startsWith('data:')?photo:undefined})});const data=await response.json();if(!response.ok)throw new Error(data.error);if(currentUid.current!==savingUid)return;setBills(data.bills);setContacts(c=>mergeContacts(c,data.contacts));versions.current[bill.id]=data.bills.find((e:CloudBill)=>e.bill.id===bill.id).version;setStatus('Saved to your account.');}catch(e){setStatus('Account save failed. Your draft remains on this device.');throw e;}finally{lock.current=false;setSaving(false);}
 }
 function open(entry:CloudBill){versions.current[entry.bill.id]=entry.version;}
 return {bills,contacts,status,saving,save,open,remember};
}
