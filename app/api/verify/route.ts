import { z } from 'zod';
import { fail, guard, jsonBody } from '@/lib/server';
import { loadBill } from '@/lib/rooms';
import { verifyTransfer } from '@/lib/verify-transfer';
export const maxDuration=30;
export async function POST(req:Request){try{
 guard(req,'verify',60);const {token,personId,network,hash}=z.object({token:z.string().max(16000),personId:z.string().max(50),network:z.enum(['base','stellar','solana']),hash:z.string().max(100)}).parse(await jsonBody(req));
 return Response.json(await verifyTransfer(await loadBill(token),personId,network,hash),{headers:{'Cache-Control':'no-store'}});
}catch(e){if(e instanceof Error&&/HTTP|fetch|429|403|timed out|timeout|ECONN/i.test(e.message))return fail(new Error('The verification service could not be reached. Try again later.'),502);return fail(e);}}
