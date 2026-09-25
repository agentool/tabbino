import { z } from 'zod';
import { get } from '@vercel/blob';
import { fail, guard, jsonBody } from '@/lib/server';
import { receiptPhoto } from '@/lib/rooms';
import { getIdentity } from '@/lib/auth';
import { readAccount } from '@/lib/accounts';
export const runtime='nodejs';
export async function POST(req:Request){try{
 guard(req,'photo',240);const body=z.object({token:z.string().max(16000).optional(),billId:z.string().uuid().optional()}).parse(await jsonBody(req));
 let image;
 if(body.token)image=await receiptPhoto(body.token);
 else {const user=await getIdentity(req,true);const entry=(await readAccount(user!.uid)).bills.find(e=>e.bill.id===body.billId);if(entry?.photoPath)image=await get(entry.photoPath,{access:'private'});}
 if(!image?.stream)throw new Error('The receipt photo is unavailable.');
 return new Response(image.stream,{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}catch(e){return fail(e);}}
