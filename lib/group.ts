import { Bill, shares } from './bill';

export type Proof = {id:string;personId:string;method:'base'|'stellar'|'solana'|'paypal';reference:string;amount:number;createdAt:number;status:'unverified'|'verified'|'failed';message:string};
export type Group = {version:number;proofs:Proof[];hasPhoto:boolean};
export function joinBill(bill:Bill,person:{id:string;name:string}):Bill {
  if(bill.people.some(p=>p.id===person.id)) return bill;
  if(bill.people.length>=20) throw new Error('This table already has 20 people.');
  if(bill.people.some(p=>p.name.toLowerCase()===person.name.toLowerCase())) throw new Error('That name is already listed. Choose it from the list instead.');
  return {...bill,people:[...bill.people,person]};
}
export function chooseItems(bill:Bill,personId:string,itemIds:string[]):Bill {
  if(bill.mode!=='items') throw new Error('This bill is split equally. Ask the organizer for an item split if you prefer.');
  if(!bill.people.some(p=>p.id===personId)) throw new Error('Join the table first.');
  if(itemIds.some(id=>!bill.items.some(i=>i.id===id))) throw new Error('An item has changed. Refresh the bill and try again.');
  const items=bill.items.map(item=>({...item,people:itemIds.includes(item.id)?Array.from(new Set([...item.people,personId])):item.people.filter(id=>id!==personId)}));
  if(items.some(i=>!i.people.length)) throw new Error('Every item needs someone to cover it. Ask another friend to select it before removing yourself.');
  return {...bill,items};
}
export function proofAmountChanged(proof:Proof,bill:Bill) {return shares(bill).find(p=>p.id===proof.personId)?.usdc!==proof.amount;}
export function proofHash(method:Proof['method'],reference:string):string|null {
  if(!/^https?:\/\//i.test(reference)) return reference;
  let url:URL;try{url=new URL(reference);}catch{return null;}
  const host=method==='base'?'basescan.org':method==='solana'?'solscan.io':method==='stellar'?'stellar.expert':'';
  if(url.hostname!==host) return null;
  const path=url.pathname.split('/').filter(Boolean),index=path.indexOf('tx');
  return index>=0?path[index+1]||null:null;
}
