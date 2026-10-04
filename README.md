# 家映 · 家庭搜剧

可运行的家庭影视搜索与播放首版。前端和后端已实现；当前片库只有两部 Blender 公开授权预告，**不是全平台影视解析服务**。

## 已实现

- 按剧名、演员、类型搜索配置的片库；JSON 片库和 MacCMS 格式接口适配。
- 最多 6 个服务端片源并发检索；单来源故障隔离、60 秒成功结果缓存、来源状态。
- 合并同名同年份影片的播放线路；选集、手动换线、倍速和重试。
- 原生 MP4/WebM 播放和按需加载的 HLS 播放；其他页面地址打开来源网站。
- 观看进度、继续观看、收藏与本地 JSON 片库导入，保存在当前浏览器。
- AI 服务接入代码：兼容 chat/completions 和 JSON 输出，先生成检索词，再查实际片库。未配置服务时明确显示未接入。
- 中文界面、手机布局、键盘操作与私有 Sites 部署配置。

## 本地启动

依赖已安装时，双击 `start-local.cmd`，访问 http://127.0.0.1:5173 。

```powershell
npm run install:ci
npm run dev
```

Node.js 要求 22.13+。本项目保留 npm 和 package-lock.json。
这台电脑的 npm 包装脚本存在路径问题时，可直接使用：

```powershell
node D:\Node\data\node_modules\npm\bin\npm-cli.js run install:ci
node scripts\run-framework.mjs dev
```

服务默认只监听本机回环地址，不能直接作为全家跨设备访问地址。
生产构建：`node scripts/run-framework.mjs build`。产物为 Cloudflare Workers 兼容的 `dist/server/index.js` 和客户端静态资源。
Sites 当前按私有访问部署；家庭成员访问需要另行配置指定成员权限，不能直接把私有网址视为公开分享链接。

## 片源接入

最容易试用：打开“片源设置”，下载格式示例，导入自己的 JSON 片库。
或者在 `.env`（本地）/ Sites 运行时环境变量（线上）设置：

```dotenv
CINEMA_SOURCES=[{"id":"family","name":"家庭片库","type":"catalog","url":"https://your-authorized-source.example/catalog.json"}]
AI_BASE_URL=
AI_MODEL=
AI_API_KEY=
```

示例域名必须替换为实际片源。`.env.example` 只列字段，不包含凭证。
本地改环境变量后需重启；线上改环境变量后需重新部署已有版本。
片源需要密钥时，配置项可加入 `headers` 对象。CINEMA_SOURCES 含凭证时也应标记为 secret。
服务端片源要求公网 HTTPS 域名，不接受 IP、内网域名、用户名密码 URL 或自动跳转。单响应限制 2 MB，最多 1000 条 JSON 片库记录，搜索最多返回 100 部。

### JSON 片库

返回影片数组或 `{"movies":[...]}`。完整示例见 `public/catalog-example.json`。

```json
{"movies":[{"id":"my-film","title":"自有影片","description":"影片简介","tags":["纪录片"],"lines":[{"id":"main","name":"主线路","episodes":[{"id":"1","title":"第1集","url":"https://your-media.example/episode1.m3u8","kind":"hls"}]}]}]}
```

`kind` 支持 `mp4`、`hls`、`external`。未提供时根据扩展名推断，平台页面不会被当作直链视频播放。
同一影片不同线路的剧集名称应一致，换线时优先匹配剧集名称。
第三方视频仍需满足浏览器跨域、有效期和播放授权要求；当前不代理视频流。

### MacCMS 格式采集接口

片源配置 `type: "maccms"`，`url` 是你有权接入的接口地址。
搜索使用 `ac=detail&wd=关键词`，详情使用 `ac=detail&ids=影片编号`。
识别 `vod_id`、`vod_name`、`vod_pic`、`vod_year`、`vod_actor`、`vod_content`、`vod_play_from`、`vod_play_url`。
已通过模拟接口验证适配逻辑，尚未接入用户实际接口。

## AI 接入

设置 `AI_BASE_URL`、`AI_MODEL`、`AI_API_KEY` 后启用。基础地址包含 API 版本路径；后端在此地址下请求 `chat/completions`。
服务需支持 `response_format: {type: "json_object"}`。
密钥只放在服务器，绝不写入客户端 `NEXT_PUBLIC_*` 或片库文件。
AI 输出最多 3 个检索词；播放地址始终来自真实片源，不使用模型编造的链接。
**当前没有密钥，未调用或验证真实大模型服务。** AI 协议与异常处理使用模拟响应测试。

## 验证

```powershell
node node_modules\typescript\bin\tsc --noEmit --incremental false
node --test tests\service.test.mjs
node scripts\run-framework.mjs build
```

服务测试覆盖来源故障隔离、采集参数、缓存、线路合并、危险 URL、未配置 AI 和 AI 检索数据来源。
`tests/browser-catalog.json` 是浏览器 HLS/换线验证夹具，不是生产影片库。

## 仍需接入或开发

- 实际影视数据源、实际 AI 服务密钥和指定平台的专用适配器。
- 定时抓取与后台采集队列、用户账户和跨设备同步。
- 平台授权登录与官方播放集成。不能保证任意平台链接或会员视频都能解析。
- 自动线路健康检测和切换，目前为用户手动换线。

接口返回 HTTP 200 只说明连接成功；播放器收到可播放数据后才显示就绪。
项目不包含绕过会员、DRM、验证码或访问限制的代码。

## 演示素材署名

- Big Buck Bunny：© 2008 Blender Foundation，CC BY 3.0，https://peach.blender.org/about/
- Sintel：© 2010 Blender Foundation，CC BY 3.0，https://durian.blender.org/sharing/
- 预告和封面使用 W3C 公共媒体镜像 https://media.w3.org/2010/05/ 。

影片和图像仍需保留相应署名；演示预告不会被标成完整剧集。
