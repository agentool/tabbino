'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { Auth, User, getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
type Session={user:User|null;ready:boolean;configured:boolean;signIn:()=>Promise<void>;logOut:()=>Promise<void>;headers:()=>Promise<Record<string,string>>};
const Context=createContext<Session>(null!);
export const useSession=()=>useContext(Context);
export function AuthProvider({children}:{children:React.ReactNode}){
 const [auth,setAuth]=useState<Auth|null>(null),[user,setUser]=useState<User|null>(null),[ready,setReady]=useState(false);
 useEffect(()=>{let stop=()=>{},active=true;fetch('/api/auth/config').then(r=>r.json()).then(config=>{if(!active)return;if(!config.configured){setReady(true);return;}const a=getAuth(getApps()[0]||initializeApp(config.config));setAuth(a);stop=onAuthStateChanged(a,u=>{setUser(u);setReady(true);});}).catch(()=>setReady(true));return()=>{active=false;stop();};},[]);
 return <Context.Provider value={{user,ready,configured:!!auth,signIn:async()=>{if(!auth)throw new Error('Google sign-in is awaiting Firebase account setup. Your bills still save on this device.');await signInWithPopup(auth,new GoogleAuthProvider());},logOut:async()=>{if(auth)await signOut(auth);},headers:async():Promise<Record<string,string>>=>user?{Authorization:`Bearer ${await user.getIdToken()}`}:{}}}>{children}</Context.Provider>;
}
