import type { Episode, Movie, MovieLine } from "./types";

export function mediaUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 4096) return;
  try { const url = new URL(value); if (url.protocol === "https:" && !url.username && !url.password) return url.href; } catch { /* invalid source field */ }
}
export function inferKind(url: string): Episode["kind"] {
  const path = new URL(url).pathname.toLowerCase();
  return path.endsWith(".m3u8") ? "hls" : /\.(mp4|m4v|webm|ogv)$/.test(path) ? "mp4" : "external";
}
const text = (value: unknown, max = 300): string => typeof value === "string" || typeof value === "number" ? String(value).slice(0, max) : "";
export function normalizeMovie(raw: unknown, sourceId: string, sourceName: string): Movie | undefined {
  if (!raw || typeof raw !== "object") return;
  const item = raw as Record<string, unknown>;
  const title = text(item.title ?? item.vod_name).trim();
  const id = text(item.id ?? item.vod_id, 120);
  if (!title || !id) return;
  let lines: MovieLine[] = [];
  if (Array.isArray(item.lines)) {
    lines = item.lines.slice(0, 20).flatMap((value, lineIndex) => {
      if (!value || typeof value !== "object") return [];
      const line = value as Record<string, unknown>;
      if (!Array.isArray(line.episodes)) return [];
      const episodes = line.episodes.slice(0, 1000).flatMap((value, episodeIndex) => {
        if (!value || typeof value !== "object") return [];
        const episode = value as Record<string, unknown>;
        const url = mediaUrl(episode.url);
        if (!url) return [];
        const kind = ["mp4", "hls", "external"].includes(String(episode.kind)) ? episode.kind as Episode["kind"] : inferKind(url);
        return [{ id: text(episode.id) || String(episodeIndex), title: text(episode.title) || `第 ${episodeIndex + 1} 集`, url, kind }];
      });
      return episodes.length ? [{ id: `${sourceId}:${text(line.id) || lineIndex}`, name: text(line.name) || sourceName, episodes }] : [];
    });
  } else if (typeof item.vod_play_url === "string") {
    const names = text(item.vod_play_from, 2000).split("$$$");
    lines = item.vod_play_url.split("$$$").slice(0, 20).flatMap((group, index) => {
      const episodes = group.split("#").slice(0, 1000).flatMap((entry, episodeIndex) => {
        const split = entry.indexOf("$");
        const url = mediaUrl(split >= 0 ? entry.slice(split + 1) : entry);
        return url ? [{ id: String(episodeIndex), title: split >= 0 ? entry.slice(0, split).slice(0, 100) : `第 ${episodeIndex + 1} 集`, url, kind: inferKind(url) }] : [];
      });
      return episodes.length ? [{ id: `${sourceId}:${index}`, name: `${sourceName} · ${names[index] || `线路 ${index + 1}`}`, episodes }] : [];
    });
  }
  const tags = Array.isArray(item.tags) ? item.tags.slice(0, 12).map(value => text(value, 40)) : text(item.vod_class ?? item.type_name).split(/[,，\/]/).filter(Boolean);
  const cast = Array.isArray(item.cast) ? item.cast.slice(0,30).map(value=>text(value,80)) : text(item.vod_actor,2000).split(/[,，\/]/).filter(Boolean);
  return { id: `${sourceId}:${id}`, title, originalTitle: text(item.originalTitle ?? item.vod_en), year: text(item.year ?? item.vod_year, 12), poster: mediaUrl(item.poster ?? item.vod_pic), description: text(item.description ?? item.vod_content, 2500).replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " "), tags, cast, source: sourceName, lines, attribution: text(item.attribution, 500), attributionUrl: mediaUrl(item.attributionUrl) };
}
export function parseCatalog(raw: unknown, sourceId: string, sourceName: string): Movie[] {
  const entries = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? (raw as { movies?: unknown }).movies : undefined;
  if (!Array.isArray(entries)) throw new Error("片库格式错误：需要影片数组或包含 movies 数组的对象");
  if (entries.length > 1000) throw new Error("一次最多导入 1000 部影片");
  return entries.map(entry => normalizeMovie(entry, sourceId, sourceName)).filter((entry): entry is Movie => Boolean(entry));
}
export function matches(movie: Movie, query: string) {
  return `${movie.title} ${movie.originalTitle ?? ""} ${movie.tags.join(" ")} ${movie.cast?.join(" ") ?? ""} ${movie.description}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}
export function mergeMovies(movies: Movie[]): Movie[] {
  const groups = new Map<string, Movie>();
  for (const movie of movies) {
    const key = `${movie.title.trim().toLocaleLowerCase()}|${movie.year ?? ""}`;
    const existing = groups.get(key);
    if (existing) {
      const lineIds = new Set(existing.lines.map(line => line.id));
      existing.lines.push(...movie.lines.filter(line => !lineIds.has(line.id)));
      existing.source = Array.from(new Set([...existing.source.split(" / "), movie.source])).join(" / ");
    } else groups.set(key, { ...movie, lines: [...movie.lines] });
  }
  return [...groups.values()];
}
