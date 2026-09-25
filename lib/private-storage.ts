import { get, put, BlobPreconditionFailedError } from '@vercel/blob';
import { randomUUID } from 'node:crypto';
export const isStorageConflict=(error:unknown)=>error instanceof BlobPreconditionFailedError||(error instanceof Error&&/conditional request.*conflicting operation|already exists/i.test(error.message));
export async function readPrivateJson<T>(path:string):Promise<{data:T;etag:string}|null>{
  const blob=await get(path,{access:'private',useCache:false,headers:{'Accept-Encoding':'identity'}});
  if(!blob?.stream)return null;
  return {data:await new Response(blob.stream).json() as T,etag:blob.blob.etag};
}
export async function updatePrivateJson<T>(path:string,initial:T,mutate:(data:T)=>T){
  for(let attempt=0;attempt<5;attempt++){
    const current=await readPrivateJson<T>(path),data=mutate(current?.data??initial);
    try{await put(path,JSON.stringify(data),{access:'private',addRandomSuffix:false,contentType:'application/json',...(current?{allowOverwrite:true,ifMatch:current.etag}:{allowOverwrite:false})});return data;}
    catch(error){if(!isStorageConflict(error))throw error;await new Promise(resolve=>setTimeout(resolve,150*(attempt+1)));}
  }
  throw new Error('Another device is saving. Please try again.');
}
export async function savePrivatePhoto(prefix:string,photo:string){
  if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(photo)||photo.length>3_700_000)throw new Error('Choose a valid receipt photo under 2.8 MB.');
  const bytes=Buffer.from(photo.split(',')[1],'base64');
  if(bytes[0]!==255||bytes[1]!==216)throw new Error('Invalid receipt image.');
  const path=`${prefix}/${randomUUID()}.jpg`;
  await put(path,bytes,{access:'private',addRandomSuffix:false,contentType:'image/jpeg'});
  return path;
}
