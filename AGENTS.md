# AGENTS.md — tube-fetch

Chrome / Edge / Firefox 浏览器扩展（Manifest V3），从 YouTube 获取视频流并下载；高画质可用 ffmpeg.wasm 合并。

## 加载调试

```bash
# Chrome: chrome://extensions/ → 加载已解压 → 选仓库根目录（manifest.json）
# Firefox: npm run build:firefox → about:debugging → 载入 dist/firefox
```

## 常用命令

```bash
npm install          # 会 postinstall vendor ffmpeg
npm run vendor       # 复制 ffmpeg.wasm 到 vendor/
npm run build        # dist/chrome + dist/firefox + zip
npm run build:chrome
npm run build:firefox
```

## 架构

| 文件 | 职责 |
|------|------|
| `src/lib/parser.js` | 解析播放器数据，生成 merge/combo/单流选项 |
| `src/content.js` | 页面浮动按钮 |
| `src/background.js` | 下载调度；Chrome offscreen / Firefox 合并页 |
| `src/merge/merge.js` | ffmpeg.wasm 拉取双流并合并 |
| `manifest.firefox.json` | Firefox：无 offscreen，background.scripts |

## 修改注意

- YouTube 变更播放器结构时优先改 `parser.js`
- 合并引擎依赖 `vendor/ffmpeg/`（约 31MB wasm），勿删
- 上架说明见 `docs/STORE.md`
- 不要提交含用户数据的 storage 导出
