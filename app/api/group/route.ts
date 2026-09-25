import { z } from 'zod';
import { fail, guard, jsonBody } from '@/lib/server';
import { publicRoom, updateRoom } from '@/lib/rooms';
import { chooseItems, joinBill } from '@/lib/group';
export const runtime='nodejs';
export async function POST(req:Request){try{
  guard(req,'group',120);
  const data=z.discriminatedUnion('action',[
    z.object({token:z.string().max(16000),action:z.literal('join'),person:z.object({id:z.string().uuid(),name:z.string().trim().min(1).max(40)})}),
    z.object({token:z.string().max(16000),action:z.literal('items'),personId:z.string().max(50),itemIds:z.array(z.string().max(50)).max(100)}),
  ]).parse(await jsonBody(req));
  const room=await updateRoom(data.token,r=>({...r,bill:data.action==='join'?joinBill(r.bill,data.person):chooseItems(r.bill,data.personId,data.itemIds)}));
  return Response.json(publicRoom(room),{headers:{'Cache-Control':'no-store'}});
}catch(e){return fail(e);}}
