'use client';
import { useState } from 'react';
import { currencyLabel, findCurrencies } from '@/lib/currencies';
import { Autocomplete } from './Autocomplete';
export function CurrencyPicker({value,onChange}:{value:string;onChange:(v:string)=>void}){
 const [query,setQuery]=useState<string|null>(null);
 const matches=findCurrencies(query??'');
 return <div className="currency-field"><span>Currency</span><Autocomplete label="Currency" value={query??currencyLabel(value)} onChange={setQuery} onClose={()=>setQuery(null)} options={matches.map(c=>({value:c.code,label:currencyLabel(c.code)}))} onSelect={c=>{onChange(c);setQuery(null);}} placeholder="Search currency or country"/><small>Selected: {currencyLabel(value)}. The receipt scan selects this automatically.</small></div>;
}
