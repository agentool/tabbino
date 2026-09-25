import { z } from 'zod';
import { getIdentity } from '@/lib/auth';
import { fail, guard, jsonBody } from '@/lib/server';
import { paymentProfileSchema } from '@/lib/payment-profile';
import { readPaymentProfile, savePaymentProfile } from '@/lib/payment-profile-storage';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store'};
export async function GET(req:Request){try{
 guard(req,'profile-read',240);const user=(await getIdentity(req,true))!;
 return Response.json(await readPaymentProfile(user.uid),{headers});
}catch(error){return fail(error);}}
export async function PUT(req:Request){try{
 guard(req,'profile-save',60);const user=(await getIdentity(req,true))!;
 const data=paymentProfileSchema.extend({baseVersion:z.number().int().min(0)}).parse(await jsonBody(req,4000));
 return Response.json(await savePaymentProfile(user.uid,data,data.baseVersion),{headers});
}catch(error){return fail(error);}}
