import { z } from 'zod';
import { fail, guard, jsonBody } from '@/lib/server';
import { publicRoom, readRoom, updateRoom } from '@/lib/rooms';
import { shares } from '@/lib/bill';
import { Proof, proofHash } from '@/lib/group';
import { verifyTransfer } from '@/lib/verify-transfer';
export const maxDuration=60;
export async function POST(req:Request){try{
  guard(req,'proof',90);
  const data=z.object({token:z.string().max(16000),id:z.string().uuid(),personId:z.string().max(50),method:z.enum(['base','stellar','solana','paypal']),reference:z.string().trim().min(1).max(2000),expectedAmount:z.number().int().positive().max(100_000_000),verify:z.boolean().default(false)}).parse(await jsonBody(req));
  let room=await updateRoom(data.token,r=>{
    const existing=r.proofs.find(p=>p.id===data.id);if(existing){if(existing.personId!==data.personId||existing.method!==data.method||existing.reference!==data.reference)throw new Error('This proof ID is already in use.');return r;}
    const part=shares(r.bill).find(p=>p.id===data.personId);
    if(!part||part.id===r.bill.payerId)throw new Error('Choose a friend with a share to settle.');
    if(r.proofs.length>=200)throw new Error('This bill has reached its proof limit.');
    const proof:Proof={id:data.id,personId:data.personId,method:data.method,reference:data.reference,amount:data.expectedAmount,createdAt:Date.now(),status:'unverified',message:data.verify?'Saved. Verification has not completed yet.':'Saved without verification. The recipient can check it.'};
    return {...r,proofs:[...r.proofs,proof]};
  });
  if(data.verify){
    let status:Proof['status']='verified',message='Matching USDC transfer verified.';
    try{
      if(room.proofs.find(p=>p.id===data.id)?.amount!==shares(room.bill).find(p=>p.id===data.personId)?.usdc)throw new Error('The share changed after this proof was saved. Ask the recipient to review it.');
      if(data.method==='paypal')throw new Error('PayPal receipts cannot be automatically verified. Ask the recipient to confirm.');
      const hash=proofHash(data.method,data.reference);
      if(!hash)throw new Error('This receipt link cannot be automatically verified. Ask the recipient to check it.');
      await verifyTransfer(room.bill,data.personId,data.method,hash);
    }catch(e){status='failed';message=`Proof saved. Verification failed: ${e instanceof Error&&!/HTTP|fetch|429|403|timed out|timeout|ECONN|request failed/i.test(e.message)?e.message:'The verification service could not be reached. Try again later.'}`;}
    try{
      room=await updateRoom(data.token,r=>{
        const hash=proofHash(data.method,data.reference);
        if(status==='verified'&&r.proofs.some(p=>p.id!==data.id&&p.status==='verified'&&p.method===data.method&&proofHash(p.method,p.reference)===hash)){status='failed';message='Proof saved. This transaction is already attached to another verified proof.';}
        return {...r,proofs:r.proofs.map(p=>p.id===data.id?{...p,status,message}:p)};
      });
    }catch{room=(await readRoom(data.token)).room;}
  }
  return Response.json({...publicRoom(room),proof:room.proofs.find(p=>p.id===data.id)},{headers:{'Cache-Control':'no-store'}});
}catch(e){return fail(e);}}
