import type { Movie } from "./types";

export const demoMovies: Movie[] = [
  { id: "demo:bunny", title: "大雄兔", originalTitle: "Big Buck Bunny", year: "2008", poster: "https://media.w3.org/2010/05/bunny/poster.png", description: "一只温柔的大兔子，和三个爱捣乱的小家伙。先用这段公开预告试试播放。", tags: ["动画", "喜剧", "动物", "轻松", "预告"], source: "公开授权预告", attribution: "© 2008 Blender Foundation · CC BY 3.0 · W3C 媒体镜像", attributionUrl: "https://peach.blender.org/about/", lines: [{ id: "w3c-mp4", name: "W3C · MP4", episodes: [{ id: "trailer", title: "官方预告", url: "https://media.w3.org/2010/05/bunny/trailer.mp4", kind: "mp4" }] }] },
  { id: "demo:sintel", title: "辛特尔", originalTitle: "Sintel", year: "2010", poster: "https://media.w3.org/2010/05/sintel/poster.png", description: "一位少女为了寻找失散的小龙，踏上一段奇幻旅程。此处提供公开预告。", tags: ["动画", "奇幻", "冒险", "龙", "预告"], source: "公开授权预告", attribution: "© 2010 Blender Foundation · CC BY 3.0 · W3C 媒体镜像", attributionUrl: "https://durian.blender.org/sharing/", lines: [{ id: "w3c-mp4", name: "W3C · MP4", episodes: [{ id: "trailer", title: "官方预告", url: "https://media.w3.org/2010/05/sintel/trailer.mp4", kind: "mp4" }] }] },
];
