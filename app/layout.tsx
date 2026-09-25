import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
export const metadata:Metadata={title:'Tabbino — Split bills with friends',description:'Snap the receipt, split with friends, and settle in USDC on Base, Stellar, or Solana.',robots:{index:false,follow:false},applicationName:'Tabbino',icons:{icon:'/icon.svg'},appleWebApp:{capable:true,title:'Tabbino',statusBarStyle:'default'}};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#f7f8fa'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body><AuthProvider>{children}</AuthProvider></body></html>;}
