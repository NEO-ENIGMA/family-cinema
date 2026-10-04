import {aiSearch} from "@/lib/cinema/service";
import {cinemaEnv,apiError} from "@/lib/cinema/runtime";
export async function POST(request:Request){
  if(request.headers.get("origin")!==new URL(request.url).origin)return Response.json({error:"请求来源无效"},{status:403});
  if(Number(request.headers.get("content-length"))>4096)return Response.json({error:"请求过大"},{status:413});
  let body:unknown;try{const raw=await request.text();if(raw.length>4096)return Response.json({error:"请求过大"},{status:413});body=JSON.parse(raw);}catch{return Response.json({error:"请求格式无效"},{status:400});}
  const query=(body as {query?:unknown})?.query;
  if(typeof query!=="string"||!query.trim()||query.length>500)return Response.json({error:"请用 1–500 个字符描述想看的内容"},{status:400});
  try{return Response.json(await aiSearch(cinemaEnv(),query),{headers:{"Cache-Control":"no-store"}});}catch(error){return apiError(error);}
}
