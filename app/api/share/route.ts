import { billSchema } from '@/lib/bill';
import { decodeBill, fail, guard, jsonBody, validateReady } from '@/lib/server';
import { createRoom, publicRoom, readRoom, updateRoom } from '@/lib/rooms';
import { getIdentity } from '@/lib/auth';
import { canEditRoom, editRoom } from '@/lib/edit-room';
import { savePrivatePhoto } from '@/lib/private-storage';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(req:Request){try {
 const body=await jsonBody(req,4_000_000),identity=await getIdentity(req);
 if(typeof body.token==='string'){
  guard(req,'share-read',1200);
  if(!body.token.startsWith('live.'))return Response.json({bill:decodeBill(body.token),group:null,canEdit:false});
  if(body.action==='update'){
   guard(req,'share-edit',120);const bill=billSchema.parse(body.bill);validateReady(bill,true);
   const initial=(await readRoom(body.token)).room;
   editRoom(initial,bill,body.version,identity?.uid,body.editToken);
   const photoPath=body.photo?await savePrivatePhoto('photos',body.photo):undefined;
   const room=await updateRoom(body.token,r=>editRoom(r,bill,body.version,identity?.uid,body.editToken,photoPath));
   return Response.json({token:body.token,canEdit:true,...publicRoom(room)},{headers:{'Cache-Control':'no-store'}});
  }
  const {room}=await readRoom(body.token);
  return Response.json({...publicRoom(room),canEdit:canEditRoom(room,identity?.uid,body.editToken)},{headers:{'Cache-Control':'no-store'}});
 }
 guard(req,'share-create');
 const bill=billSchema.parse(body.bill);validateReady(bill,true);bill.createdAt=Date.now();
 if(body.photo!==undefined&&typeof body.photo!=='string')throw new Error('Invalid receipt photo.');
 return Response.json(await createRoom(bill,body.photo,identity?.uid),{headers:{'Cache-Control':'no-store'}});
}catch(e){return fail(e);}}
