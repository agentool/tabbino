export async function GET(){
  const raw=process.env.FIREBASE_WEB_CONFIG;
  if(!raw)return Response.json({configured:false});
  const {apiKey,authDomain,projectId,appId}=JSON.parse(raw);
  return Response.json({configured:true,config:{apiKey,authDomain,projectId,appId}},{headers:{'Cache-Control':'public, max-age=300'}});
}
