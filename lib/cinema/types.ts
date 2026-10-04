export type Episode = { id: string; title: string; url: string; kind: "mp4" | "hls" | "external" };
export type MovieLine = { id: string; name: string; episodes: Episode[] };
export type Movie = { id: string; title: string; originalTitle?: string; year?: string; poster?: string; description: string; tags: string[]; cast?: string[]; source: string; attribution?: string; attributionUrl?: string; lines: MovieLine[] };
export type SourceStatus = { id: string; name: string; state: "ok" | "error" | "idle"; count?: number; message?: string; elapsedMs?: number };
export type SearchResult = { movies: Movie[]; sources: SourceStatus[]; cached?: boolean };
export type WatchRecord = { movie: Movie; lineId: string; episodeId: string; seconds: number; duration: number; updatedAt: number };
