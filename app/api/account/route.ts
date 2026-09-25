import { z } from 'zod';
import { getIdentity } from '@/lib/auth';
import { fail, guard, jsonBody } from '@/lib/server';
import { billSchema } from '@/lib/bill';
import { contactSchema } from '@/lib/contacts';
import { publicAccount, readAccount, saveAccountBill, saveAccountContacts } from '@/lib/accounts';
export const runtime='nodejs';
export const maxDuration=60;
const headers={'Cache-Control':'private, no-store'};
export async function GET(req:Request){try{guard(req,'account-read',240);const user=(await getIdentity(req,true))!;return Response.json(publicAccount(await readAccount(user.uid)),{headers});}catch(e){return fail(e);}}
export async function POST(req:Request){try{
  guard(req,'account-save',180);const user=(await getIdentity(req,true))!;
  const body=await jsonBody(req,4_000_000);
  const data=z.discriminatedUnion('action',[
    z.object({action:z.literal('save'),bill:billSchema,baseVersion:z.number().int().min(0),token:z.string().max(16000).optional(),editToken:z.string().max(200).optional(),dirty:z.boolean().optional(),roomVersion:z.number().int().min(0).optional(),photo:z.string().max(3_700_000).optional()}),
    z.object({action:z.literal('contacts'),contacts:z.array(contactSchema).max(300)}),
  ]).parse(body);
  const account=data.action==='save'?await saveAccountBill(user.uid,data):await saveAccountContacts(user.uid,data.contacts);
  return Response.json(publicAccount(account),{headers});
}catch(e){return fail(e);}}
