import { createHash, timingSafeEqual } from 'node:crypto';
import { Bill } from './bill';
import { AccessError } from './auth';
import type { Room } from './rooms';
export const secretDigest=(value:string)=>createHash('sha256').update(value).digest('hex');
export function canEditRoom(room:Room,uid?:string,editToken?:string){
 if(uid&&room.ownerUid===uid)return true;
 return !!(editToken&&/^[a-f0-9]{64}$/.test(editToken)&&room.editorHash&&timingSafeEqual(Buffer.from(secretDigest(editToken),'hex'),Buffer.from(room.editorHash,'hex')));
}
export function editRoom(room:Room,bill:Bill,version:number,uid?:string,editToken?:string,photoPath?:string):Room{
 if(!canEditRoom(room,uid,editToken))throw new AccessError('Only the organizer can edit the receipt or receiving details.',403);
 if(room.version!==version)throw new AccessError('Friends changed this bill while you were editing. Reload the shared version before editing again. Your draft is still on this device.',409);
 if(bill.id!==room.bill.id)throw new Error('The bill identity cannot change.');
 if(room.proofs.some(p=>!bill.people.some(person=>person.id===p.personId)))throw new Error('Keep friends who have saved payment proof on this bill.');
 return {...room,bill:{...bill,createdAt:room.bill.createdAt},photoPath:photoPath??room.photoPath,hasPhoto:!!(photoPath??room.photoPath),proofs:room.proofs.map(p=>p.status==='verified'?{...p,status:'unverified',message:'The bill was edited after verification. Review the saved payment and current share.'}:p)};
}
