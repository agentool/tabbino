import type { Bill } from './bill';

type Profile = {displayName:string|null;email:string|null};
// Fill only the untouched initial participant. Never replace manually entered people.
export function populateProfile(bill:Bill,profile:Profile):Bill {
  const initial=bill.people.find(person=>person.id==='you');
  if(!initial||initial.name!=='You'||initial.email)return bill;
  const email=profile.email?.trim()||'';
  const name=(profile.displayName?.trim()||email.split('@')[0]||'').slice(0,40);
  if(!name)return bill;
  return {...bill,people:bill.people.map(person=>person===initial?{...person,name,email}:person)};
}
export function removeParticipant(bill:Bill,id:string):Bill {
  if(bill.people.length===1||!bill.people.some(person=>person.id===id))return bill;
  const people=bill.people.filter(person=>person.id!==id),payerRemoved=bill.payerId===id;
  return {...bill,people,payerId:payerRemoved?people[0].id:bill.payerId,
    wallets:payerRemoved?{base:'',stellar:'',solana:''}:bill.wallets,paypal:payerRemoved?'':bill.paypal,
    items:bill.items.map(item=>({...item,people:item.people.filter(personId=>personId!==id)}))};
}
