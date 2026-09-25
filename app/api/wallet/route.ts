import { z } from 'zod';
import { Asset, BASE_FEE, Horizon, Memo, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import { shares, USDC, paymentReference } from '@/lib/bill';
import { fail, guard, jsonBody, validAddress } from '@/lib/server';
import { loadBill } from '@/lib/rooms';
export const maxDuration=30;
export async function POST(req:Request){try{
  guard(req,'wallet',30);
  const {token,personId,network,sender,expectedAmount}=z.object({token:z.string().max(16000),personId:z.string().max(50),network:z.enum(['stellar','solana']),sender:z.string().max(60),expectedAmount:z.number().int().positive()}).parse(await jsonBody(req));
  const bill=await loadBill(token),part=shares(bill).find(p=>p.id===personId);
  if(!part||part.id===bill.payerId||part.usdc<=0) throw new Error('Select a friend with an outstanding share.');
  if(part.usdc!==expectedAmount)throw new Error('Your share changed. Refresh the bill before paying.');
  const destination=bill.wallets[network];
  if(!destination||!validAddress(network,sender))throw new Error('A valid sender and receiving address are required.');
  const memo=paymentReference(bill,personId);
  if(network==='stellar'){
    const server=new Horizon.Server('https://horizon.stellar.org');
    const [account,recipient]=await Promise.all([server.loadAccount(sender),server.loadAccount(destination)]);
    const trustline=recipient.balances.find(b=>'asset_code' in b && b.asset_code==='USDC' && b.asset_issuer===USDC.stellar);
    if(!trustline || ('is_authorized' in trustline && !trustline.is_authorized))throw new Error('The receiving Stellar wallet needs an authorized Circle USDC trustline.');
    const tx=new TransactionBuilder(account,{fee:BASE_FEE,networkPassphrase:Networks.PUBLIC})
      .addOperation(Operation.payment({destination,asset:new Asset('USDC',USDC.stellar),amount:(part.usdc/100).toFixed(2)}))
      .addMemo(Memo.text(memo)).setTimeout(300).build();
    return Response.json({xdr:tx.toXDR(),networkPassphrase:Networks.PUBLIC});
  }
  const connection=new Connection(process.env.SOLANA_RPC_URL||'https://api.mainnet-beta.solana.com','confirmed');
  const owner=new PublicKey(sender),recipient=new PublicKey(destination),mint=new PublicKey(USDC.solana);
  const [from,to]=await Promise.all([getAssociatedTokenAddress(mint,owner),getAssociatedTokenAddress(mint,recipient)]);
  const {blockhash,lastValidBlockHeight}=await connection.getLatestBlockhash();
  const tx=new Transaction({feePayer:owner,blockhash,lastValidBlockHeight}).add(
    createAssociatedTokenAccountIdempotentInstruction(owner,to,recipient,mint),
    new TransactionInstruction({programId:new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),keys:[],data:Buffer.from(memo)}),
    createTransferCheckedInstruction(from,mint,to,owner,BigInt(part.usdc)*10000n,6)
  );
  return Response.json({transaction:tx.serialize({requireAllSignatures:false,verifySignatures:false}).toString('base64')});
}catch(e){
  const message=e instanceof Error?e.message:'';
  if(/fetch|429|403|timeout|not found|Network|ECONN/i.test(message))return fail(new Error('The network could not prepare a payment. Check that the wallet is funded, or use the QR code in your wallet.'),502);
  return fail(e);
}}
