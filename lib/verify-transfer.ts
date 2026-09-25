import { createPublicClient, http, decodeEventLog, erc20Abi } from 'viem';
import { base } from 'viem/chains';
import { Connection } from '@solana/web3.js';
import { shares, USDC, explorer, paymentReference } from '@/lib/bill';
import { Bill, Network } from './bill';
export async function verifyTransfer(bill:Bill,personId:string,network:Network,hash:string){
  const part=shares(bill).find(p=>p.id===personId),destination=bill.wallets[network];
  if(!part||part.id===bill.payerId||part.usdc<=0||!destination)throw new Error('Choose a valid payment request.');
  if(network==='solana'?!/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(hash):network==='base'?!/^0x[0-9a-fA-F]{64}$/.test(hash):!/^[0-9a-fA-F]{64}$/.test(hash))throw new Error('Enter a valid transaction hash for this network.');
  let matched=false,when=0;
  if(network==='base'){
    const client=createPublicClient({chain:base,transport:http(process.env.BASE_RPC_URL||'https://mainnet.base.org',{timeout:12000,retryCount:1})});
    const receipt=await client.getTransactionReceipt({hash:hash as `0x${string}`});
    if(receipt.status!=='success')throw new Error('This transaction did not succeed.');
    const [block,tip]=await Promise.all([client.getBlock({blockNumber:receipt.blockNumber}),client.getBlockNumber()]);
    if(tip<receipt.blockNumber+2n)throw new Error('Waiting for network confirmations. Try again shortly.');
    when=Number(block.timestamp)*1000;
    matched=receipt.logs.some(log=>{
      if(log.address.toLowerCase()!==USDC.base.toLowerCase())return false;
      try{const event=decodeEventLog({abi:erc20Abi,eventName:'Transfer',data:log.data,topics:log.topics});return event.args.to.toLowerCase()===destination.toLowerCase()&&event.args.value===BigInt(part.usdc)*10000n;}catch{return false;}
    });
  }else if(network==='stellar'){
    const [txRes,opsRes]=await Promise.all([fetch(`https://horizon.stellar.org/transactions/${hash}`,{signal:AbortSignal.timeout(12000)}),fetch(`https://horizon.stellar.org/transactions/${hash}/operations?limit=200`,{signal:AbortSignal.timeout(12000)})]);
    if(!txRes.ok||!opsRes.ok)throw new Error('Transaction not found yet. Try again after it confirms.');
    const tx=await txRes.json(),ops=await opsRes.json();
    if(!tx.successful)throw new Error('This transaction did not succeed.');
    when=Date.parse(tx.created_at);
    matched=tx.memo===paymentReference(bill,personId)&&ops._embedded.records.some((op:Record<string,string>)=>op.type==='payment'&&op.to===destination&&op.asset_code==='USDC'&&op.asset_issuer===USDC.stellar&&Math.round(Number(op.amount)*1e7)===part.usdc*100000);
  }else{
    const connection=new Connection(process.env.SOLANA_RPC_URL||'https://api.mainnet-beta.solana.com','finalized');
    const tx=await connection.getParsedTransaction(hash,{maxSupportedTransactionVersion:0,commitment:'finalized'});
    if(!tx)throw new Error('Transaction not finalized yet. Try again shortly.');
    if(!tx.meta||tx.meta.err)throw new Error('This transaction did not succeed.');
    when=(tx.blockTime||0)*1000;
    const memoOk=tx.transaction.message.instructions.some(i=>'parsed' in i && i.program==='spl-memo' && i.parsed===paymentReference(bill,personId));
    const before=tx.meta.preTokenBalances||[];
    matched=memoOk&&(tx.meta.postTokenBalances||[]).some(after=>{
      if(after.mint!==USDC.solana||after.owner!==destination)return false;
      const previous=before.find(b=>b.accountIndex===after.accountIndex);
      return BigInt(after.uiTokenAmount.amount)-BigInt(previous?.uiTokenAmount.amount||'0')===BigInt(part.usdc)*10000n;
    });
  }
  if(!matched)throw new Error('This transaction does not match the requested USDC amount, recipient, or payment memo.');
  if(when<bill.createdAt-120000)throw new Error('This transfer predates this payment request.');
  return {verified:true,url:explorer(network,hash)};
}
