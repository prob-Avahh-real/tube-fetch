# TubeFetch

从 YouTube 页面解析并下载视频的浏览器插件（Chrome / Edge Manifest V3）。

## 功能

- 在 YouTube 观看页 / Shorts 页面浮动「下载」按钮
- 插件弹窗列出可用清晰度（含音视频合并流、分离流）
- 支持「最佳画质」组合下载（视频 + 音频两个文件）
- 下载历史记录
- 自动监听 YouTube 播放器 API 响应，提高 URL 解析成功率

## 安装（开发者模式）

1. 打开 `chrome://extensions/` 或 `edge://extensions/`
2. 开启 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择本项目根目录 `tube-fetch/`

## 使用

1. 打开任意 YouTube 视频页面
2. 点击右下角红色 **下载** 按钮，或点击浏览器工具栏中的 TubeFetch 图标
3. 选择目标格式后开始下载
4. 文件默认保存到下载目录下的 `TubeFetch/` 文件夹

### 关于高画质下载

YouTube 高画质通常分为 **视频流** 和 **音频流**：

| 选项 | 说明 |
|------|------|
| 720p/360p 等「音视频」 | 单文件，可直接播放 |
| 1080p+「仅视频」+「仅音频」 | 两个文件，需用 ffmpeg 合并 |

合并示例：

```bash
ffmpeg -i "标题 [1080p].mp4" -i "标题 [audio].m4a" -c copy "标题-完整.mp4"
```

## 项目结构

```
tube-fetch/
├── manifest.json          # 扩展清单 (MV3)
├── icons/                 # 扩展图标
├── src/
│   ├── background.js      # 下载调度
│   ├── content.js         # 页面注入与 UI
│   ├── content.css
│   ├── lib/
│   │   ├── parser.js      # 解析 ytInitialPlayerResponse
│   │   └── utils.js
│   └── popup/             # 弹窗界面
└── README.md
```

## 技术说明

- 从页面内 `ytInitialPlayerResponse` 及 `/youtubei/v1/player` 响应提取 `streamingData`
- 优先使用带 `url` 的格式；部分加密格式尝试解析 `signatureCipher`
- 使用 `chrome.downloads` API 触发浏览器下载

## 限制与合规

- 受 YouTube 加密、会员、地区版权限制的视频可能无法获取
- **仅供个人学习与研究**，请遵守 YouTube 服务条款与当地版权法规
- 请勿用于批量爬取或商业用途

## 开发

重新生成图标（可选）：

```bash
npm run icons   # 需要 sharp；或使用 scripts/generate-icons.js
```

## 更新日志

### v1.0.0

- 初始版本：YouTube 视频解析、多格式下载、浮动面板与弹窗 UI
