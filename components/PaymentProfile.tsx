 'use client';
import { useState } from 'react';
import { networks, networkNames } from '@/lib/bill';
import type { PaymentDetails, PaymentProfile as Profile } from '@/lib/payment-profile';
export function PaymentProfile({profile,saving,onSave,onReload,onBack}:{profile:Profile;saving:boolean;onSave:(details:PaymentDetails)=>Promise<void>;onReload:()=>void;onBack:()=>void}){
 const [details,setDetails]=useState<PaymentDetails>({wallets:{...profile.wallets},paypal:profile.paypal});
 const [message,setMessage]=useState(''),[error,setError]=useState('');
 return <form className="panel wallet-setup" onSubmit={async event=>{event.preventDefault();setError('');setMessage('');try{await onSave(details);setMessage('Payment details saved.');}catch(e){setError(e instanceof Error?e.message:'Could not save payment details.');}}}>
 <button type="button" className="text-button" onClick={onBack}>Back to bill</button><h1>Payment details</h1><p>Used for new bills when you are the payer. Existing bills keep their saved addresses. Your details are shared with friends only when you include them in a bill link.</p>
 <fieldset disabled={saving} style={{border:0,padding:0,margin:0,minWidth:0}}>
 {networks.map(network=><label className="wallet-field" key={network}><span>{networkNames[network]} receiving address <span className="network-currency">USDC · mainnet</span></span><input autoComplete="off" spellCheck={false} value={details.wallets[network]} onChange={event=>setDetails({...details,wallets:{...details.wallets,[network]:event.target.value.trim()}})} placeholder={network==='base'?'0x…':network==='stellar'?'G…':'Solana wallet address'}/></label>)}
 <label className="wallet-field"><span>PayPal receiving email</span><input type="email" value={details.paypal} placeholder="name@example.com" onChange={event=>setDetails({...details,paypal:event.target.value.trim()})}/></label>
 <p className="subtle">Public receiving addresses only. Never enter a private key.</p>
 {error&&<p className="field-error" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 <div className="saved-actions"><button type="submit" className="button primary">{saving?'Saving…':'Save payment details'}</button><button type="button" className="button" onClick={onReload}>Reload saved details</button></div>
 </fieldset></form>;
}
