# TubeFetch

从 YouTube 页面解析并下载视频的浏览器插件（Chrome / Edge / Firefox，Manifest V3）。

## 功能

- YouTube 观看页 / Shorts 浮动「下载」按钮
- 弹窗列出可用清晰度（合并流 / 分离流）
- **ffmpeg.wasm 浏览器内合并**：高画质一键导出单个 MP4
- 也可选择「分开下载」两个文件
- 下载历史记录
- Chrome 使用 Offscreen Document；Firefox 使用后台合并页

## 安装（开发者模式）

### Chrome / Edge

1. `chrome://extensions/` 或 `edge://extensions/`
2. 开启 **开发者模式**
3. **加载已解压的扩展程序** → 选择本仓库根目录

### Firefox

1. `npm run build:firefox`
2. `about:debugging#/runtime/this-firefox`
3. **临时载入附加组件** → 选择 `dist/firefox/manifest.json`

或将 `manifest.firefox.json` 临时复制为 `manifest.json` 后加载源码目录。

## 使用

1. 打开任意 YouTube 视频
2. 点击右下角 **下载**，或工具栏 TubeFetch 图标
3. 推荐选择 **最佳画质 · 合并为一个文件**
4. 文件保存到下载目录 `TubeFetch/`

## 打包上架

```bash
npm install
npm run build
```

详见 [docs/STORE.md](docs/STORE.md)。

## 项目结构

```
tube-fetch/
├── manifest.json              # Chrome / Edge
├── manifest.firefox.json      # Firefox
├── vendor/ffmpeg/             # ffmpeg.wasm（npm run vendor）
├── src/
│   ├── background.js          # 下载 / 合并调度
│   ├── content.js             # 页面 UI
│   ├── merge/                 # ffmpeg 合并宿主页
│   ├── lib/                   # parser / utils / browser shim
│   └── popup/
├── scripts/
│   ├── package.js             # 打 zip
│   └── vendor-ffmpeg.js
└── docs/STORE.md
```

## 技术说明

- 解析 `ytInitialPlayerResponse` 与 `/youtubei/v1/player`
- 高画质 DASH：拉视频流 + 音频流 → ffmpeg.wasm `-c copy` 合并
- `chrome.downloads` 保存结果

## 限制与合规

- 受加密、会员、地区版权限制的视频可能无法获取
- **仅供个人学习与研究**，请遵守 YouTube 服务条款与版权法规
- Chrome Web Store 对此类扩展审核严格，见上架文档说明

## 更新日志

### v1.1.0

- Firefox MV3 适配（`manifest.firefox.json`）
- ffmpeg.wasm 浏览器内合并为一个 MP4
- `npm run build` 打包 Chrome / Firefox zip
- 上架文档 `docs/STORE.md`

### v1.0.0

- 初始版本：解析、多格式下载、浮动面板与弹窗
