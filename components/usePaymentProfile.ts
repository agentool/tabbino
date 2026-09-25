 'use client';
import { useEffect, useRef, useState } from 'react';
import { useSession } from './AuthProvider';
import type { PaymentDetails, PaymentProfile } from '@/lib/payment-profile';
export function usePaymentProfile(){
 const session=useSession(),uid=session.user?.uid;
 const currentUid=useRef(uid);currentUid.current=uid;
 const sequence=useRef(0),savingLock=useRef(false);
 const [state,setState]=useState<{uid?:string;profile:PaymentProfile|null;error:string}>({profile:null,error:''});
 const [saving,setSaving]=useState(false);
 async function reload(){
  const request=++sequence.current;if(!uid){setState({profile:null,error:''});return;}
  setState({uid,profile:null,error:''});
  try{const response=await fetch('/api/profile',{headers:await session.headers(),cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not load payment details.');if(currentUid.current===uid&&sequence.current===request)setState({uid,profile:data,error:''});}
  catch(error){if(currentUid.current===uid&&sequence.current===request)setState({uid,profile:null,error:error instanceof Error?error.message:'Could not load payment details.'});}
 }
 useEffect(()=>{void reload();return()=>{sequence.current++;};},[uid]);
 async function save(details:PaymentDetails){
  if(!uid||state.uid!==uid||!state.profile)throw new Error('Sign in and load your payment details first.');
  if(savingLock.current)throw new Error('Your payment details are still saving.');
  savingLock.current=true;setSaving(true);
  try{const response=await fetch('/api/profile',{method:'PUT',headers:{...await session.headers(),'Content-Type':'application/json'},body:JSON.stringify({...details,baseVersion:state.profile.version})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not save payment details.');if(currentUid.current===uid)setState({uid,profile:data,error:''});}
  finally{savingLock.current=false;setSaving(false);}
 }
 return {profile:state.uid===uid?state.profile:null,error:state.uid===uid?state.error:'',saving,reload,save};
}
