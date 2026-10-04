"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type Hls from "hls.js";
import { ExternalLink, RotateCw, Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { Movie, WatchRecord } from "@/lib/cinema/types";

export function MoviePlayer({movie,record,favorite,onClose,onFavorite,onProgress}:{movie:Movie;record?:WatchRecord;favorite:boolean;onClose:()=>void;onFavorite:()=>void;onProgress:(record:WatchRecord)=>void}) {
  const [lineId,setLineId] = useState(record && movie.lines.some(line=>line.id===record.lineId) ? record.lineId : movie.lines[0]?.id ?? "");
  const [episodeId,setEpisodeId] = useState(record?.episodeId ?? movie.lines[0]?.episodes[0]?.id ?? "");
  const [error,setError] = useState("");
  const [ready,setReady] = useState(false);
  const [retry,setRetry] = useState(0);
  const [speed,setSpeed] = useState("1");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoElement,setVideoElement] = useState<HTMLVideoElement|null>(null);
  const attachVideo = useCallback((node:HTMLVideoElement|null)=>{videoRef.current=node;setVideoElement(node);},[]);
  const progressRef = useRef(onProgress); progressRef.current = onProgress;
  const resumeRef = useRef(record); resumeRef.current = record;
  const switchPosition = useRef(0);
  const line = movie.lines.find(line=>line.id===lineId) ?? movie.lines[0];
  const episode = line?.episodes.find(episode=>episode.id===episodeId) ?? line?.episodes[0];

  useEffect(()=>{
    const video = videoRef.current;
    if(!video || !episode || episode.kind === "external") return;
    let disposed=false; let hls:Hls|undefined; let lastSave=0;
    const previous=resumeRef.current;
    const resumeTarget=switchPosition.current || (previous?.episodeId===episode.id ? previous.seconds : 0);
    switchPosition.current=0;
    let restorePending=resumeTarget>0;
    const restore=()=>{
      if(!restorePending||!Number.isFinite(video.duration)||video.duration<=0)return;
      if(resumeTarget<video.duration-3)video.currentTime=resumeTarget;
      restorePending=false;
    };
    setError("");setReady(false);
    const save=()=>{
      if(restorePending||!Number.isFinite(video.currentTime)||video.currentTime<=0)return;
      progressRef.current({movie,lineId:line.id,episodeId:episode.id,seconds:video.currentTime,duration:Number.isFinite(video.duration)?video.duration:0,updatedAt:Date.now()});
    };
    const tick=()=>{if(Date.now()-lastSave>=5000){lastSave=Date.now();save();}};
    const loaded=()=>{
      restore();
      video.playbackRate=Number(speed);
    };
    const canPlay=()=>{restore();setReady(true);};
    const failed=()=>setError("视频没有加载成功。可以重试、切换线路，或到来源页面观看。");
    video.addEventListener("loadedmetadata",loaded);video.addEventListener("durationchange",restore);video.addEventListener("canplay",canPlay);video.addEventListener("error",failed);video.addEventListener("timeupdate",tick);video.addEventListener("pause",save);video.addEventListener("ended",save);
    (async()=>{
      try{
        if(episode.kind==="hls" && !video.canPlayType("application/vnd.apple.mpegurl")){
          const {default:Hls}=await import("hls.js");
          if(disposed)return;
          if(!Hls.isSupported()){setError("当前浏览器不支持此 HLS 线路，请更换浏览器或线路。");return;}
          hls=new Hls({maxBufferLength:30,maxMaxBufferLength:60});
          hls.on(Hls.Events.ERROR,(_event,data)=>{if(data.fatal)failed();});hls.loadSource(episode.url);hls.attachMedia(video);
        }else {video.src=episode.url;video.load();}
      }catch{if(!disposed)failed();}
    })();
    return()=>{disposed=true;save();video.removeEventListener("loadedmetadata",loaded);video.removeEventListener("durationchange",restore);video.removeEventListener("canplay",canPlay);video.removeEventListener("error",failed);video.removeEventListener("timeupdate",tick);video.removeEventListener("pause",save);video.removeEventListener("ended",save);hls?.destroy();video.pause();video.removeAttribute("src");video.load();};
    // A progress update must not reload the active stream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[videoElement,movie.id,line?.id,episode?.id,episode?.url,retry]);

  function changeLine(id:string){switchPosition.current=videoRef.current?.currentTime ?? 0;const next=movie.lines.find(line=>line.id===id);const title=episode?.title;setLineId(id);setEpisodeId(next?.episodes.find(item=>item.title===title)?.id ?? next?.episodes[0]?.id ?? "");}
  function changeEpisode(id:string){switchPosition.current=0;resumeRef.current=undefined;setEpisodeId(id);}
  return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="player-dialog" aria-describedby="player-description"><div className="player-title"><div><DialogTitle>{movie.title}</DialogTitle><DialogDescription id="player-description">{episode?.title ?? "暂无可用剧集"} · {movie.source}</DialogDescription></div><Button variant="ghost" onClick={onFavorite} aria-label={favorite?"取消收藏":"收藏影片"}>{favorite?<BookmarkCheck/>:<Bookmark/>}</Button></div>
    <div className="video-container">{episode?.kind==="external"?<div className="external-player"><ExternalLink size={32}/><p>此线路需要在来源网站播放</p><Button asChild><a href={episode.url} target="_blank" rel="noopener noreferrer">打开来源页面</a></Button></div>:episode?<><video ref={attachVideo} poster={movie.poster} controls playsInline preload="metadata" aria-label={`${movie.title}播放器`}/><div className={`video-status ${ready&&!error?"ready":""}`} role="status">{error|| (ready?"视频已就绪":"正在加载视频…")}</div></>:<div className="external-player"><p>该来源暂未提供播放地址</p></div>}</div>
    <div className="player-toolbar"><div className="line-picker"><span>播放线路</span><Select value={line?.id} onValueChange={changeLine}><SelectTrigger aria-label="播放线路"><SelectValue/></SelectTrigger><SelectContent>{movie.lines.map(line=><SelectItem key={line.id} value={line.id}>{line.name}</SelectItem>)}</SelectContent></Select></div><div className="player-actions"><Select value={speed} onValueChange={value=>{setSpeed(value);if(videoRef.current)videoRef.current.playbackRate=Number(value);}}><SelectTrigger aria-label="播放速度"><SelectValue/></SelectTrigger><SelectContent>{["0.75","1","1.25","1.5","2"].map(speed=><SelectItem key={speed} value={speed}>{speed} 倍速</SelectItem>)}</SelectContent></Select><Button variant="ghost" onClick={()=>{switchPosition.current=videoRef.current?.currentTime??0;setRetry(value=>value+1);}} disabled={!episode||episode.kind==="external"}><RotateCw/>重试</Button></div></div>
    <div className="episode-list" aria-label="选择剧集">{line?.episodes.map(item=><Button key={item.id} variant={item.id===episode?.id?"default":"secondary"} onClick={()=>changeEpisode(item.id)}>{item.title}</Button>)}</div>
    {error&&episode&&<a className="source-link" href={episode.url} target="_blank" rel="noopener noreferrer">在新窗口打开当前播放地址 <ExternalLink size={14}/></a>}
    <p className="movie-description">{movie.description}</p>{movie.attribution&&<p className="attribution">{movie.attributionUrl?<a href={movie.attributionUrl} target="_blank" rel="noopener noreferrer">{movie.attribution}</a>:movie.attribution}</p>}
  </DialogContent></Dialog>;
}
