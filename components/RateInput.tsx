'use client';

import { useState } from 'react';

export function RateInput({value,onChange}:{value:number;onChange:(value:number)=>void}) {
  const [draft,setDraft]=useState<{value:number;text:string}|null>(null);

  return <input
    type="text"
    inputMode="decimal"
    aria-label="USDC conversion rate"
    value={draft?.value===value?draft.text:value||''}
    onChange={event=>{
      const text=event.target.value;
      if(!/^\d*(?:[.,]\d*)?$/.test(text))return;
      const number=Number(text.replace(',','.'))||0;
      if(!Number.isFinite(number))return;
      // Preserve incomplete decimals such as "0." while calculations use a number.
      setDraft({value:number,text});
      onChange(number);
    }}
  />;
}
