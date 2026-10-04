import {sourceInfo} from "@/lib/cinema/service";
import {cinemaEnv} from "@/lib/cinema/runtime";
export async function GET(){return Response.json(sourceInfo(cinemaEnv()),{headers:{"Cache-Control":"no-store"}});}
