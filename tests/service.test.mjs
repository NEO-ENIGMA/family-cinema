import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
await mkdir('.sites-runtime/tests',{recursive:true});
await build({entryPoints:['lib/cinema/service.ts'],bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/tests/service.mjs'});
await build({entryPoints:['lib/cinema/normalize.ts'],bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/tests/normalize.mjs'});
const {searchMovies,aiSearch,publicEndpoint,movieDetail}=await import('../.sites-runtime/tests/service.mjs');
const {parseCatalog,normalizeMovie,mergeMovies}=await import('../.sites-runtime/tests/normalize.mjs');
const originalFetch=globalThis.fetch;
const film={id:'film1',title:'测试影片',year:'2024',description:'测试用例',tags:['奇幻'],lines:[{id:'main',name:'主线路',episodes:[{id:'ep1',title:'第1集',url:'https://media.example.org/one.mp4'}]}]};

test('禁止危险地址，合法 HTTPS 页面只作为外链处理',()=>{
  const movie=normalizeMovie({...film,lines:[{episodes:[{url:'javascript:alert(1)'},{url:'file:///secret'},{url:'https://video.example.org/watch/1'}]}]},'custom','自有片库');
  assert.equal(movie.lines[0].episodes.length,1);assert.equal(movie.lines[0].episodes[0].kind,'external');
  for(const url of ['http://example.org/api','https://127.0.0.1/api','https://[::1]/','https://user:password@example.org','https://example.local/api','https://2130706433/'])assert.throws(()=>publicEndpoint(url));
});
test('导入无效片库时明确失败，MacCMS 多线路与分集正确保留',()=>{
  assert.throws(()=>parseCatalog({list:[]},'local','本地'));
  const movie=normalizeMovie({vod_id:18,vod_name:'采集测试',vod_play_from:'主线$$$备线',vod_play_url:'第1集$https://a.example.org/a.m3u8#第2集$https://a.example.org/b.mp4$$$第1集$https://b.example.org/a.mp4'},'mac','测试采集');
  assert.equal(movie.lines.length,2);assert.equal(movie.lines[0].episodes.length,2);assert.equal(movie.lines[0].episodes[0].kind,'hls');
});
test('同名同年份影片合并线路，不同年份仍然区分',()=>{
  const a=normalizeMovie(film,'a','A');const b=normalizeMovie(film,'b','B');const c=normalizeMovie({...film,year:'2025'},'c','C');
  const merged=mergeMovies([a,b,c]);assert.equal(merged.length,2);assert.equal(merged[0].lines.length,2);assert.equal(a.lines.length,1);
});
test('真实搜索逻辑隔离故障片源，缓存不会吞掉故障状态',async()=>{
  const calls=[];globalThis.fetch=async(url,init)=>{calls.push([String(url),init.redirect]);if(String(url).includes('bad.example.org'))return new Response('broken',{status:503});return Response.json({movies:[film]});};
  try{
    const env={CINEMA_SOURCES:JSON.stringify([{id:'good',name:'有效片源',type:'catalog',url:'https://good.example.org/catalog.json'},{id:'bad',name:'故障片源',type:'catalog',url:'https://bad.example.org/catalog.json'}])};
    const result=await searchMovies(env,'测试影片');assert.equal(result.movies.length,1);assert.equal(result.sources.find(s=>s.id==='bad').state,'error');assert.equal(result.sources.find(s=>s.id==='good').count,1);assert.ok(calls.every(call=>call[1]==='error'));
    await searchMovies(env,'测试影片');assert.equal(calls.length,4);
  }finally{globalThis.fetch=originalFetch;}
});
test('采集接口使用正确检索与详情参数',async()=>{
  const calls=[];globalThis.fetch=async url=>{calls.push(new URL(url));return Response.json({list:[{vod_id:7,vod_name:'测试影片',vod_play_url:'第1集$https://a.example.org/a.mp4'}]});};
  try{
    const env={CINEMA_SOURCES:JSON.stringify([{id:'mac',name:'测试接口',type:'maccms',url:'https://mac.example.org/api.php/provide/vod/'}])};
    await searchMovies(env,'测试影片');await movieDetail(env,'mac:7');assert.equal(calls[0].searchParams.get('ac'),'detail');assert.equal(calls[0].searchParams.get('wd'),'测试影片');assert.equal(calls[1].searchParams.get('ids'),'7');
  }finally{globalThis.fetch=originalFetch;}
});
test('没有 AI 配置时明确返回未配置，绝不调用服务',async()=>{
  globalThis.fetch=()=>{throw new Error('不应发生网络调用');};try{const result=await aiSearch({},'轻松的动画');assert.equal(result.configured,false);assert.deepEqual(result.movies,[]);}finally{globalThis.fetch=originalFetch;}
});
test('AI 建议只触发实际片库检索，不接受 AI 编造的播放地址',async()=>{
  let target;globalThis.fetch=async(url,init)=>{target=String(url);const body=JSON.parse(init.body);assert.equal(body.model,'test-model');return Response.json({choices:[{message:{content:JSON.stringify({message:'按动画检索',keywords:['动画'],url:'https://fake.example.org/video.mp4'})}}]});};
  try{const result=await aiSearch({AI_API_KEY:'mock-key',AI_BASE_URL:'https://ai.example.org/v1',AI_MODEL:'test-model'},'轻松的动画');assert.equal(target,'https://ai.example.org/v1/chat/completions');assert.equal(result.configured,true);assert.equal(result.movies.length,2);assert.ok(result.movies.every(movie=>movie.id.startsWith('demo:')));}finally{globalThis.fetch=originalFetch;}
});
