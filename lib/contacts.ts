import { z } from 'zod';
export const contactSchema=z.object({name:z.string().trim().min(1).max(40),email:z.union([z.email(),z.literal('')]).default(''),lastUsed:z.number().optional()});
export type Contact=z.infer<typeof contactSchema>;
export function mergeContacts(existing:Contact[],incoming:Contact[]){
  const merged=new Map<string,Contact>();
  for(const contact of [...existing,...incoming]){
    const parsed=contactSchema.safeParse(contact);if(!parsed.success)continue;
    const c=parsed.data,key=(c.email||c.name).toLocaleLowerCase();
    const old=merged.get(key);if(!old||(c.lastUsed||0)>=(old.lastUsed||0))merged.set(key,c);
  }
  return [...merged.values()].sort((a,b)=>(b.lastUsed||0)-(a.lastUsed||0)||a.name.localeCompare(b.name)).slice(0,300);
}
export function contactFromText(text:string):Contact{
  const value=text.trim();
  if(value.includes('@')){const parsed=z.email().safeParse(value.toLowerCase());if(!parsed.success)throw new Error('Enter a complete email address, such as sam@example.com.');const email=parsed.data;return {name:email.split('@')[0].replace(/[._-]+/g,' ').slice(0,40),email,lastUsed:Date.now()};}
  if(!value||value.length>40)throw new Error('Enter a name between 1 and 40 characters.');return {name:value,email:'',lastUsed:Date.now()};
}
