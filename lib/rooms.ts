import { get, put, BlobPreconditionFailedError } from '@vercel/blob';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Bill, billSchema } from './bill';
import { isStorageConflict } from './private-storage';
import { secretDigest } from './edit-room';
import { Group } from './group';
import { decodeBill } from './server';

export type Room = Group & {bill:Bill;accessHash:string;photoPath?:string;ownerUid?:string;editorHash?:string};
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
function tokenParts(token:string){const match=/^live\.([a-f0-9]{32})\.([a-f0-9]{64})$/.exec(token);if(!match)throw new Error('Invalid live split link.');return {path:`bills/${match[1]}.json`,secret:match[2]};}
export const publicRoom=(room:Room)=>({bill:billSchema.parse(room.bill),group:{version:room.version,proofs:room.proofs,hasPhoto:room.hasPhoto}});
export async function readRoom(token:string){
  const {path,secret}=tokenParts(token);
  // Compression can weaken ETags; request the original representation for conditional writes.
  const result=await get(path,{access:'private',useCache:false,headers:{'Accept-Encoding':'identity'}});
  if(!result?.stream) throw new Error('This split could not be found. Ask your friend to share it again.');
  const room=await new Response(result.stream).json() as Room;
  if(!timingSafeEqual(Buffer.from(digest(secret),'hex'),Buffer.from(room.accessHash,'hex')))throw new Error('Invalid split link.');
  return {room,etag:result.blob.etag,path};
}
export async function createRoom(bill:Bill,photo?:string,ownerUid?:string){
  if(!process.env.BLOB_READ_WRITE_TOKEN)throw new Error('Shared bill storage is not configured yet.');
  const id=randomBytes(16).toString('hex'),secret=randomBytes(32).toString('hex'),editToken=randomBytes(32).toString('hex');
  const room:Room={bill,version:1,proofs:[],hasPhoto:!!photo,accessHash:digest(secret),ownerUid,editorHash:secretDigest(editToken)};
  if(photo){
    if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(photo)||photo.length>3_700_000)throw new Error('Choose a valid receipt photo under 2.8 MB.');
    const bytes=Buffer.from(photo.split(',')[1],'base64');
    if(bytes[0]!==255||bytes[1]!==216)throw new Error('Invalid receipt image.');
    room.photoPath=`photos/${id}.jpg`;
    await put(room.photoPath,bytes,{access:'private',addRandomSuffix:false,contentType:'image/jpeg'});
  }
  await put(`bills/${id}.json`,JSON.stringify(room),{access:'private',addRandomSuffix:false,contentType:'application/json'});
  return {token:`live.${id}.${secret}`,editToken,canEdit:true,...publicRoom(room)};
}
export async function updateRoom(token:string,update:(room:Room)=>Room){
  for(let attempt=0;attempt<5;attempt++){
    const {room,etag,path}=await readRoom(token),next=update(room);
    next.version=room.version+1;
    try{await put(path,JSON.stringify(next),{access:'private',addRandomSuffix:false,allowOverwrite:true,ifMatch:etag,contentType:'application/json'});return next;}
    catch(e){if(!isStorageConflict(e))throw e;await new Promise(resolve=>setTimeout(resolve,150*(attempt+1)));}
  }
  throw new Error('Your friends are updating this bill. Please try once more.');
}
export async function loadBill(token:string):Promise<Bill>{return token.startsWith('live.')?(await readRoom(token)).room.bill:decodeBill(token);}
export async function receiptPhoto(token:string){const {room}=await readRoom(token);if(!room.photoPath)throw new Error('No receipt photo was shared.');return get(room.photoPath,{access:'private'});}
