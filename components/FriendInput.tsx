'use client';
import { useState } from 'react';
import { Contact, contactFromText } from '@/lib/contacts';
import { Autocomplete } from './Autocomplete';
export function FriendInput({contacts,onAdd,autoFocus=false,disabled=false}:{contacts:Contact[];onAdd:(c:Contact)=>void;autoFocus?:boolean;disabled?:boolean}){
 const [text,setText]=useState(''),[error,setError]=useState('');
 const options=contacts.filter(c=>`${c.name} ${c.email}`.toLowerCase().includes(text.toLowerCase())).slice(0,8);
 function add(contact?:Contact){try{if(disabled)return;onAdd(contact??contactFromText(text));setText('');setError('');}catch(e){setError(e instanceof Error?e.message:'Enter a name or email.');}}
 return <><form className="add-friend" onSubmit={e=>{e.preventDefault();add();}}><Autocomplete label="Friend name or email" value={text} onChange={setText} placeholder="Name or email address" autoFocus={autoFocus} onSubmit={()=>add()} options={options.map((c,i)=>({value:String(i),label:c.name,detail:c.email}))} onSelect={i=>add(options[Number(i)])}/><button className="button dark" disabled={!text.trim()||disabled}>Add friend</button></form>{error&&<p role="alert" className="field-error">{error}</p>}</>;
}
