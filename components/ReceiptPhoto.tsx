'use client';
import { useState } from 'react';
export function ReceiptPhoto({src}:{src:string}){
 const [expanded,setExpanded]=useState(false);if(!src)return null;
 return <section className={`panel receipt-photo ${expanded?'photo-expanded':'photo-compact'}`}><img src={src} alt="Uploaded receipt photo"/><div><h2>Your receipt</h2><p>Check the original while splitting.</p><button className="text-button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'Collapse photo':'Enlarge receipt'}</button></div></section>;
}
