import { env } from "cloudflare:workers";
import type { CinemaEnv } from "./service";
export function cinemaEnv(): CinemaEnv { return env as unknown as CinemaEnv; }
export function apiError(error: unknown) {
  return Response.json({error:error instanceof Error && /^(搜索词|请用|片库|AI |接口)/.test(error.message) ? error.message : "服务暂时不可用，请稍后重试"},{status:502,headers:{"Cache-Control":"no-store"}});
}
