# AGENTS.md — tube-fetch

Chrome/Edge 浏览器扩展（Manifest V3），用于从 YouTube 页面获取视频流并下载。

## 加载调试

```bash
# Chrome: chrome://extensions/ → 开发者模式 → 加载已解压的扩展程序
# 选择 tube-fetch/ 根目录
```

## 架构

| 文件 | 职责 |
|------|------|
| `src/lib/parser.js` | 解析 `ytInitialPlayerResponse`、构建下载选项 |
| `src/content.js` | 页面浮动按钮、与 popup/background 通信 |
| `src/background.js` | `chrome.downloads` 下载与历史 |
| `src/popup/` | 扩展弹窗 UI |

## 修改注意

- YouTube 经常变更播放器数据结构；解析失败时优先检查 `parser.js`
- 高画质多为 DASH 分离流，需分别下载后 ffmpeg 合并
- 不要提交含用户数据的 storage 导出

## 图标

```bash
python3 scripts/generate-icons.py   # 或 npm run icons
```
