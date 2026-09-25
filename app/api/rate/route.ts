import { fail, guard } from '@/lib/server';
import { isCurrency } from '@/lib/currencies';
export async function GET(req:Request){try{
  guard(req,'rate',120);
  const currency=new URL(req.url).searchParams.get('currency');
  if(!currency||!isCurrency(currency))throw new Error('Choose a supported currency.');
  if(currency==='USD')return Response.json({rate:1,date:new Date().toISOString().slice(0,10),source:'USD'});
  // Cache one USD table for all currencies, rather than making a request per bill.
  const response=await fetch('https://open.er-api.com/v6/latest/USD',{signal:AbortSignal.timeout(8000),next:{revalidate:3600}});
  if(!response.ok)throw new Error('Reference rates are unavailable. Enter an agreed rate or try again.');
  const data=await response.json(),perDollar=data.rates?.[currency];
  if(data.result!=='success'||!Number.isFinite(perDollar)||perDollar<=0)throw new Error(`No automatic rate is available for ${currency}. Enter an agreed rate manually.`);
  const date=new Date(data.time_last_update_unix*1000).toISOString().slice(0,10);
  return Response.json({rate:Number((1/perDollar).toPrecision(12)),date,source:'ExchangeRate-API'});
}catch(e){return fail(e);}}
