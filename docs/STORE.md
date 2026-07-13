# 商店上架指南

## 打包

```bash
npm install
npm run build          # 生成 dist/chrome 与 dist/firefox，并打 zip
# 或
npm run build:chrome
npm run build:firefox
```

产物：

- `dist/tubefetch-chrome-vX.Y.Z.zip`
- `dist/tubefetch-firefox-vX.Y.Z.zip`

## Chrome Web Store

1. 注册 [Chrome 开发者账号](https://chrome.google.com/webstore/devconsole)（一次性注册费）
2. 新建项目 → 上传 `tubefetch-chrome-*.zip`
3. 填写商店信息：
   - 名称：TubeFetch
   - 简述：从 YouTube 页面获取视频与音频
   - 类别：生产力工具
   - 隐私政策 URL（必填）：说明仅在 youtube.com 读取播放器数据、使用 downloads 权限保存文件、不上传用户数据
4. 权限说明（审核常见问题）：
   - `downloads`：保存所选视频文件
   - `storage`：本地下载历史
   - `tabs` / `activeTab`：识别当前 YouTube 标签页
   - `offscreen`：后台运行 ffmpeg.wasm 合并音视频
   - host：`youtube.com`、`googlevideo.com` 用于解析与拉取媒体流
5. 提交审核

> 注意：Chrome Web Store 对「下载 YouTube 视频」类扩展审核极严，可能因违反 YouTube ToS 被拒。建议定位为「个人学习工具 / 本地媒体导出」，并在描述中强调合规与版权责任。

## Firefox Add-ons (AMO)

1. 注册 [AMO 开发者账号](https://addons.mozilla.org/developers/)
2. 提交新扩展 → 上传 `tubefetch-firefox-*.zip`
3. `manifest.firefox.json` 中的 `browser_specific_settings.gecko.id` 需改为你的正式扩展 ID
4. 填写隐私政策与权限理由（与 Chrome 类似）
5. Firefox 无 `offscreen`：合并任务会在后台打开 `merge.html` 标签页完成

本地临时加载：

1. `about:debugging#/runtime/this-firefox`
2. 「临时载入附加组件」→ 选择 `dist/firefox/manifest.json` 或源码根目录的 `manifest.firefox.json`（需先复制为 manifest.json，或直接加载 `dist/firefox`）

## Edge Add-ons

可直接复用 Chrome 包，在 [Partner Center](https://partner.microsoft.com/dashboard) 上传。

## 版本号

同步修改：

- `package.json` → `version`
- `manifest.json` / `manifest.firefox.json` → `version`
