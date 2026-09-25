import data from './currencies.json';

// Current ISO 4217 currencies and funds, from SIX (the ISO maintenance agency).
export const currencies=data;
const byCode=new Map(data.map(currency=>[currency.code,currency]));
const names=new Intl.DisplayNames(['en'],{type:'currency'});
export const currencyDigits=(code:string)=>byCode.get(code)?.digits??2;
export function currencyLabel(code:string){return `${code} · ${names.of(code)||byCode.get(code)?.name||code}`;}
export function findCurrencies(query:string){
  const search=query.trim().toLocaleLowerCase();
  return currencies.filter(currency=>`${currency.code} ${currency.name} ${names.of(currency.code)} ${currency.countries.join(' ')} ${currency.code==='KZT'?'₸ теңге тенге Kazakhstan':''}`.toLocaleLowerCase().includes(search));
}
export const isCurrency=(code:string)=>byCode.has(code);
export const decimalToUnits=(value:string|number,digits=2)=>Math.round((Number(typeof value==='string'?value.replace(',','.'):value)||0)*10**digits);
