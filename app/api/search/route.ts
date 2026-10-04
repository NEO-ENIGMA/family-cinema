import {searchMovies} from "@/lib/cinema/service";
import {cinemaEnv,apiError} from "@/lib/cinema/runtime";
export async function GET(request:Request) {
  const query=new URL(request.url).searchParams.get("q") ?? "";
  if(query.length>100)return Response.json({error:"搜索词最多 100 个字符"},{status:400});
  try{return Response.json(await searchMovies(cinemaEnv(),query),{headers:{"Cache-Control":"no-store"}});}catch(error){return apiError(error);}
}
