/* global FFmpegWASM, FFmpegUtil, chrome */
(function () {
  'use strict';

  const statusEl = document.getElementById('status');
  const fillEl = document.getElementById('fill');
  let ffmpeg = null;
  let busy = false;

  function setStatus(text, progress) {
    statusEl.textContent = text;
    if (typeof progress === 'number') {
      fillEl.style.width = `${Math.max(0, Math.min(100, progress * 100))}%`;
    }
    chrome.runtime.sendMessage({
      type: 'MERGE_PROGRESS',
      text,
      progress: typeof progress === 'number' ? progress : null,
    }).catch(() => {});
  }

  async function getFFmpeg() {
    if (ffmpeg?.loaded) return ffmpeg;

    const { FFmpeg } = FFmpegWASM;
    const { toBlobURL } = FFmpegUtil;
    const base = chrome.runtime.getURL('vendor/ffmpeg');

    ffmpeg = new FFmpeg();
    ffmpeg.on('progress', ({ progress }) => {
      setStatus(`正在合并… ${Math.round(progress * 100)}%`, 0.55 + progress * 0.4);
    });

    setStatus('加载 ffmpeg.wasm…', 0.05);
    await ffmpeg.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
      classWorkerURL: chrome.runtime.getURL('vendor/ffmpeg/814.ffmpeg.js'),
    });

    return ffmpeg;
  }

  async function fetchAsUint8(url, label, startProgress, endProgress) {
    setStatus(`下载${label}…`, startProgress);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${label}下载失败 (${response.status})`);
    }

    const total = Number(response.headers.get('Content-Length')) || 0;
    const reader = response.body?.getReader();
    if (!reader) {
      const buf = new Uint8Array(await response.arrayBuffer());
      setStatus(`${label}下载完成`, endProgress);
      return buf;
    }

    const chunks = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (total > 0) {
        const ratio = received / total;
        setStatus(`下载${label}… ${Math.round(ratio * 100)}%`, startProgress + (endProgress - startProgress) * ratio);
      }
    }

    const out = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    setStatus(`${label}下载完成`, endProgress);
    return out;
  }

  async function mergeStreams({ videoUrl, audioUrl, videoExt, audioExt, filename }) {
    if (busy) throw new Error('已有合并任务进行中');
    busy = true;

    try {
      const ff = await getFFmpeg();
      const vExt = videoExt || 'mp4';
      const aExt = audioExt || 'm4a';
      const videoName = `input_v.${vExt}`;
      const audioName = `input_a.${aExt}`;
      const outputName = 'output.mp4';

      const videoData = await fetchAsUint8(videoUrl, '视频', 0.08, 0.3);
      const audioData = await fetchAsUint8(audioUrl, '音频', 0.3, 0.55);

      await ff.writeFile(videoName, videoData);
      await ff.writeFile(audioName, audioData);

      setStatus('正在合并音视频…', 0.55);
      await ff.exec([
        '-i', videoName,
        '-i', audioName,
        '-c', 'copy',
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-shortest',
        outputName,
      ]);

      const data = await ff.readFile(outputName);
      await ff.deleteFile(videoName);
      await ff.deleteFile(audioName);
      await ff.deleteFile(outputName);

      const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
      const blob = new Blob([bytes], { type: 'video/mp4' });
      const blobUrl = URL.createObjectURL(blob);

      setStatus('保存文件…', 0.98);
      await new Promise((resolve, reject) => {
        chrome.downloads.download(
          {
            url: blobUrl,
            filename: `TubeFetch/${filename}`,
            saveAs: false,
            conflictAction: 'uniquify',
          },
          (downloadId) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve(downloadId);
          },
        );
      });

      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      setStatus('合并完成', 1);
      return { ok: true };
    } finally {
      busy = false;
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== 'RUN_MERGE') return false;

    mergeStreams(message)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ ok: false, error: err.message || String(err) }));

    return true;
  });

  chrome.runtime.sendMessage({ type: 'MERGE_HOST_READY' }).catch(() => {});
})();
