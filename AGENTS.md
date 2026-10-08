# tube-fetch

TubeFetch 从 YouTube 页面解析并下载视频的浏览器插件（Chrome / Edge / Firefox，Manifest V3）。 功能 - YouTube 观看页 / Shorts 浮动「下载」按钮 - 弹窗列出可用清晰度（合并流 / 分离流） - **ffmpeg.wasm 浏览器内合并**：高画质一键导出单个 MP4 - 也可选择「分开下载」两个文件 - 下载历史记录 - Chrome 使用 Offscreen Document；Firefox 使用后台合并页

## 用途与 Target 判定

开发者工具（已归档）；一般不做穿戴双 Target

- 移动端：不适用
- 智能硬件：不适用

## 目标平台

不按消费级「手机+智能硬件」双 Target 强求。

## 技术栈信号

- 检测到：extension, node

## 命令

```bash
# 浏览器加载已解压扩展（选本目录）
```

## 状态

已归档。默认只做必要修复与知识库同步，不新开大范围需求。

## 助手约束

- Loop：先定可验证 Done 与停止条件；每切片过验证环；失败回灌；详见 docs/LOOP_ENGINEERING.md
- Harness：遵循根 AGENTS「Harness Engineering」；Guide=本文件，Sensor=测试/CI；同类失误二次须沉淀规则或测试（棘轮）。详见 docs/HARNESS_ENGINEERING.md
- 遵循仓库根 `/Users/skat/AGENTS.md` 与本文件的用途判定
- 可选 Target 可搁置；不适用形态不要硬加
- 改动聚焦；公共逻辑抽离复用
