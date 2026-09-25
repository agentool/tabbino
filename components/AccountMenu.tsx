'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { FileText, LoaderCircle, LogOut, UserRound } from 'lucide-react';
import { useSession } from './AuthProvider';

export function AccountMenu({onSavedBills,onError}:{onSavedBills:()=>void;onError:(error:unknown)=>void}){
  const session=useSession(),menuId=useId();
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[failedPhoto,setFailedPhoto]=useState('');
  const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null);
  const initialItem=useRef<'first'|'last'>('first');
  const items=()=>Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')||[]);
  function close(restoreFocus=false){setOpen(false);if(restoreFocus)trigger.current?.focus();}
  useEffect(()=>{
    if(!open)return;
    const options=items();options[initialItem.current==='last'?options.length-1:0]?.focus();
    const dismiss=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
    document.addEventListener('pointerdown',dismiss);
    return()=>document.removeEventListener('pointerdown',dismiss);
  },[open]);
  useEffect(()=>setOpen(false),[session.user?.uid]);
  async function authenticate(){setBusy(true);try{await session.signIn();}catch(error){onError(error);}finally{setBusy(false);}}
  async function logOut(){setBusy(true);try{await session.logOut();close();}catch(error){onError(error);}finally{setBusy(false);}}
  const name=session.user?.displayName||session.user?.email||'Account';
  const photo=session.user?.photoURL;
  return <div className="account-menu" ref={root} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setOpen(false);}}>
    {!session.user?<button className="button small-button account-sign-in" disabled={!session.ready||!session.configured||busy} title={session.ready&&!session.configured?'Google sign-in is not configured':undefined} onClick={authenticate}>{busy?<LoaderCircle size={16} className="spin"/>:<UserRound size={16}/>}Sign in with Google</button>:<>
      <button className="account-avatar" ref={trigger} aria-label={`Account menu for ${name}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open?menuId:undefined} onClick={()=>{initialItem.current='first';setOpen(value=>!value);}} onKeyDown={event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();initialItem.current=event.key==='ArrowUp'?'last':'first';setOpen(true);}else if(event.key==='Escape')close();}}>
        {photo&&photo!==failedPhoto?<img src={photo} alt="" referrerPolicy="no-referrer" onError={()=>setFailedPhoto(photo)}/>:<span aria-hidden="true">{name.slice(0,1).toUpperCase()}</span>}
      </button>
      {open&&<div className="account-dropdown" id={menuId}>
        <div className="account-identity"><strong>{name}</strong>{session.user.email&&<span>{session.user.email}</span>}</div>
        <div ref={menu} role="menu" aria-label="Account" onKeyDown={event=>{
          const options=items(),index=options.indexOf(document.activeElement as HTMLButtonElement);
          if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);}
          else if(event.key==='Tab')close(true);
          else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
            event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?options.length-1:(index+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;options[next]?.focus();
          }
        }}>
          <button role="menuitem" tabIndex={-1} onClick={()=>{close(true);onSavedBills();}}><FileText size={17}/>Saved bills</button>
          <button role="menuitem" tabIndex={-1} disabled={busy} onClick={logOut}>{busy?<LoaderCircle size={17} className="spin"/>:<LogOut size={17}/>}Sign out</button>
        </div>
      </div>}
    </>}
  </div>;
}
