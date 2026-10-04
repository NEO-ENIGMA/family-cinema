import {movieDetail} from "@/lib/cinema/service";
import {cinemaEnv,apiError} from "@/lib/cinema/runtime";
export async function GET(request:Request){
  const id=new URL(request.url).searchParams.get("id")??"";
  if(!id||id.length>180)return Response.json({error:"影片 ID 无效"},{status:400});
  try{const movie=await movieDetail(cinemaEnv(),id);return movie?Response.json(movie,{headers:{"Cache-Control":"no-store"}}):Response.json({error:"没有找到该影片"},{status:404});}catch(error){return apiError(error);}
}
