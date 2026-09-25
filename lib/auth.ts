import { createRemoteJWKSet, jwtVerify } from 'jose';

const keys=createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
export type Identity={uid:string;email:string;name:string};
export class AccessError extends Error {constructor(message:string,public status=401){super(message);}}
export async function getIdentity(req:Request,required=false):Promise<Identity|null>{
  const header=req.headers.get('authorization');
  if(!header){if(required)throw new AccessError('Sign in with Google to open your saved bills.');return null;}
  const projectId=process.env.FIREBASE_PROJECT_ID;
  if(!projectId)throw new AccessError('Google sign-in is not configured yet.',503);
  try{
    if(!header.startsWith('Bearer '))throw new Error('Missing token');
    const {payload}=await jwtVerify(header.slice(7),keys,{issuer:`https://securetoken.google.com/${projectId}`,audience:projectId,algorithms:['RS256']});
    if(!payload.sub||payload.sub.length>128||payload.email_verified!==true)throw new Error('Unverified account');
    return {uid:payload.sub,email:typeof payload.email==='string'?payload.email:'',name:typeof payload.name==='string'?payload.name:''};
  }catch{throw new AccessError('Your sign-in expired. Please sign in again.');}
}
