import { Bill, Network, shares, USDC } from './bill';
import type { EIP1193Provider } from 'viem';

export async function payWithWallet(network:Network,bill:Bill,personId:string,token:string,onStatus:(s:string)=>void):Promise<string>{
  const amount=shares(bill).find(p=>p.id===personId)?.usdc;
  if(!amount||personId===bill.payerId)throw new Error('Choose a friend who owes a share.');
  const destination=bill.wallets[network];
  if(!destination)throw new Error('The organizer has not added a wallet on this network.');
  onStatus('Waiting for wallet connection…');
  if(network==='base'){
    const ethereum=(window as unknown as {ethereum?:EIP1193Provider}).ethereum;
    if(!ethereum)throw new Error('Open this link in your Ethereum wallet’s browser, or scan the QR code with a wallet that supports Base.');
    const {createWalletClient,custom,erc20Abi}=await import('viem');const {base}=await import('viem/chains');
    const wallet=createWalletClient({chain:base,transport:custom(ethereum)});
    const [account]=await wallet.requestAddresses();
    onStatus('Switching wallet to Base…');
    try{await wallet.switchChain({id:base.id});}catch(e){if((e as {code?:number}).code===4902)await wallet.addChain({chain:base});else throw e;}
    onStatus(`Approve ${(amount/100).toFixed(2)} USDC in your wallet…`);
    return await wallet.writeContract({account,address:USDC.base,abi:erc20Abi,functionName:'transfer',args:[destination as `0x${string}`,BigInt(amount)*10000n]});
  }
  if(network==='stellar'){
    const freighter=await import('@stellar/freighter-api');
    const connected=await freighter.isConnected();
    if(!connected.isConnected)throw new Error('Use the Freighter extension, or open the payment link in a Stellar wallet that supports payment requests.');
    const access=await freighter.requestAccess();
    if(access.error||!access.address)throw new Error('Wallet connection was declined.');
    onStatus('Preparing Stellar USDC payment…');
    const response=await fetch('/api/wallet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({network,sender:access.address,token,personId,expectedAmount:amount})});
    const data=await response.json();if(!response.ok)throw new Error(data.error);
    onStatus(`Approve ${(amount/100).toFixed(2)} USDC in Freighter…`);
    const signed=await freighter.signTransaction(data.xdr,{networkPassphrase:data.networkPassphrase,address:access.address});
    if(signed.error||!signed.signedTxXdr)throw new Error('The payment was not signed.');
    onStatus('Submitting payment to Stellar…');
    const result=await fetch('https://horizon.stellar.org/transactions',{method:'POST',body:new URLSearchParams({tx:signed.signedTxXdr})});
    const submission=await result.json();if(!result.ok)throw new Error('Stellar rejected the payment. Check your USDC balance and XLM for fees.');
    return submission.hash;
  }
  type SolWallet={connect:()=>Promise<{publicKey:{toString:()=>string}}>,signAndSendTransaction:(tx:unknown)=>Promise<{signature:string}>};
  const provider=(window as unknown as {phantom?:{solana?:SolWallet},solana?:SolWallet});
  const solana=provider.phantom?.solana||provider.solana;
  if(!solana)throw new Error('Open this link in Phantom’s browser, or scan the Solana Pay QR code with a compatible wallet.');
  const {publicKey}=await solana.connect();onStatus('Preparing Solana USDC payment…');
  const response=await fetch('/api/wallet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({network,sender:publicKey.toString(),token,personId,expectedAmount:amount})});
  const data=await response.json();if(!response.ok)throw new Error(data.error);
  const {Transaction}=await import('@solana/web3.js');
  const bytes=Uint8Array.from(atob(data.transaction),c=>c.charCodeAt(0));
  const transaction=Transaction.from(bytes);
  onStatus(`Approve ${(amount/100).toFixed(2)} USDC in your Solana wallet…`);
  const {signature}=await solana.signAndSendTransaction(transaction);return signature;
}
