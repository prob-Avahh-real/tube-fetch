/* global TubeFetchUtils, TubeFetchParser */
(function () {
  'use strict';

  const { isWatchPage, getVideoId, sanitizeFilename } = TubeFetchUtils;

  let panelRoot = null;
  let latestInfo = null;

  function sendMessage(type, payload = {}) {
    return chrome.runtime.sendMessage({ type, ...payload });
  }

  function createPanel() {
    if (panelRoot) return panelRoot;

    panelRoot = document.createElement('div');
    panelRoot.id = 'tube-fetch-panel';
    panelRoot.innerHTML = `
      <button id="tube-fetch-toggle" type="button" title="TubeFetch">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
        </svg>
        <span>下载</span>
      </button>
      <div id="tube-fetch-menu" hidden>
        <div class="tf-header">
          <img class="tf-thumb" alt="" />
          <div>
            <div class="tf-title"></div>
            <div class="tf-meta"></div>
          </div>
        </div>
        <div class="tf-progress" hidden>
          <div class="tf-progress-text"></div>
          <div class="tf-progress-bar"><div class="tf-progress-fill"></div></div>
        </div>
        <div class="tf-options"></div>
        <div class="tf-footer">仅供个人学习使用，请遵守版权法规</div>
      </div>
    `;

    document.documentElement.appendChild(panelRoot);

    panelRoot.querySelector('#tube-fetch-toggle').addEventListener('click', () => {
      const menu = panelRoot.querySelector('#tube-fetch-menu');
      const willOpen = menu.hidden;
      menu.hidden = !willOpen;
      if (willOpen) refreshPanel();
    });

    document.addEventListener('click', (event) => {
      if (!panelRoot.contains(event.target)) {
        panelRoot.querySelector('#tube-fetch-menu').hidden = true;
      }
    });

    return panelRoot;
  }

  function setProgress(active, text, progress) {
    if (!panelRoot) return;
    const box = panelRoot.querySelector('.tf-progress');
    const textEl = panelRoot.querySelector('.tf-progress-text');
    const fill = panelRoot.querySelector('.tf-progress-fill');
    box.hidden = !active && !text;
    textEl.textContent = text || '';
    if (typeof progress === 'number') {
      fill.style.width = `${Math.round(progress * 100)}%`;
    }
  }

  function optionLabel(item) {
    if (item.kind === 'merge') {
      return {
        label: '最佳画质 · 合并为一个文件',
        meta: `${item.qualityLabel} · ffmpeg.wasm`,
      };
    }
    if (item.kind === 'combo') {
      return {
        label: '最佳画质 · 分开下载',
        meta: `${item.qualityLabel} · 两个文件`,
      };
    }
    const typeLabel = item.kind === 'audio' ? '仅音频' : item.kind === 'video' ? '仅视频' : '音视频';
    return {
      label: `${item.qualityLabel || typeLabel} · ${item.ext.toUpperCase()}`,
      meta: `${typeLabel}${item.sizeLabel ? ` · ${item.sizeLabel}` : ''}`,
    };
  }

  function renderOptions(container, info) {
    container.innerHTML = '';

    if (!info.ok) {
      container.innerHTML = `<div class="tf-error">${info.error}</div>`;
      return;
    }

    info.downloads.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tf-option';
      const { label, meta } = optionLabel(item);
      btn.innerHTML = `
        <span class="tf-option-label">${label}</span>
        <span class="tf-option-meta">${meta}</span>
      `;

      if (item.kind === 'merge') {
        btn.addEventListener('click', () => downloadMerge(info, item, btn));
      } else if (item.kind === 'combo') {
        btn.addEventListener('click', () => downloadCombo(info, item));
      } else {
        btn.addEventListener('click', () => downloadSingle(info, item));
      }

      container.appendChild(btn);
    });

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'tf-option tf-copy';
    copyBtn.textContent = '复制页面链接';
    copyBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(location.href);
      copyBtn.textContent = '已复制';
      setTimeout(() => { copyBtn.textContent = '复制页面链接'; }, 1500);
    });
    container.appendChild(copyBtn);
  }

  function refreshPanel() {
    const panel = createPanel();
    const info = TubeFetchParser.getCurrentVideoInfo();
    latestInfo = info;

    panel.querySelector('.tf-title').textContent = info.title || '未检测到视频';
    panel.querySelector('.tf-meta').textContent = info.ok
      ? `${info.author} · ${info.downloads.length} 个格式`
      : (info.error || '');
    panel.querySelector('.tf-thumb').src = info.thumbnail || '';
    panel.querySelector('.tf-thumb').hidden = !info.thumbnail;

    renderOptions(panel.querySelector('.tf-options'), info);
    sendMessage('VIDEO_INFO', { info });
  }

  async function downloadSingle(info, item) {
    const base = sanitizeFilename(info.title);
    const suffix = item.kind === 'audio' ? ' [audio]' : ` [${item.qualityLabel || item.kind}]`;
    const filename = `${base}${suffix}.${item.ext}`;

    await sendMessage('DOWNLOAD', {
      url: item.url,
      filename,
      videoId: info.videoId,
    });
  }

  async function downloadCombo(info, combo) {
    for (const stream of combo.streams) {
      const base = sanitizeFilename(info.title);
      const suffix = stream.kind === 'audio' ? ' [audio]' : ` [${stream.qualityLabel}]`;
      const filename = `${base}${suffix}.${stream.ext}`;
      await sendMessage('DOWNLOAD', {
        url: stream.url,
        filename,
        videoId: info.videoId,
      });
    }
  }

  async function downloadMerge(info, mergeItem, btn) {
    const video = mergeItem.streams.find((s) => s.kind === 'video');
    const audio = mergeItem.streams.find((s) => s.kind === 'audio');
    if (!video || !audio) return;

    const filename = `${sanitizeFilename(info.title)} [${video.qualityLabel}].mp4`;
    if (btn) btn.disabled = true;
    setProgress(true, '准备合并…', 0.02);

    try {
      const result = await sendMessage('MERGE_AND_DOWNLOAD', {
        videoUrl: video.url,
        audioUrl: audio.url,
        videoExt: video.ext,
        audioExt: audio.ext,
        filename,
        videoId: info.videoId,
      });

      if (!result?.ok) {
        setProgress(true, result?.error || '合并失败', 0);
        return;
      }
      setProgress(true, '合并完成', 1);
      setTimeout(() => setProgress(false, '', 0), 2500);
    } catch (err) {
      setProgress(true, err.message || '合并失败', 0);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function updateVisibility() {
    if (!isWatchPage()) {
      if (panelRoot) panelRoot.hidden = true;
      return;
    }

    createPanel().hidden = false;
    refreshPanel();
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_VIDEO_INFO') {
      const info = TubeFetchParser.getCurrentVideoInfo();
      latestInfo = info;
      sendResponse({ info });
      return true;
    }

    if (message.type === 'DOWNLOAD_OPTION') {
      if (!latestInfo?.ok) {
        sendResponse({ ok: false, error: latestInfo?.error || '无可用视频' });
        return true;
      }

      const option = latestInfo.downloads.find((d) => d.id === message.optionId);
      if (!option) {
        sendResponse({ ok: false, error: '格式不存在' });
        return true;
      }

      const run = async () => {
        if (option.kind === 'merge') {
          await downloadMerge(latestInfo, option);
        } else if (option.kind === 'combo') {
          await downloadCombo(latestInfo, option);
        } else {
          await downloadSingle(latestInfo, option);
        }
        return { ok: true };
      };

      run()
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    return false;
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.mergeProgress) return;
    const p = changes.mergeProgress.newValue;
    if (!p) return;
    setProgress(Boolean(p.active || p.done || p.error), p.text, p.progress);
  });

  TubeFetchParser.installFetchHook();

  const boot = () => {
    updateVisibility();
    setTimeout(updateVisibility, 1500);
    setTimeout(updateVisibility, 3500);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  let lastVideoId = getVideoId(location.href);
  const observer = new MutationObserver(() => {
    const currentId = getVideoId(location.href);
    if (currentId !== lastVideoId) {
      lastVideoId = currentId;
      latestInfo = null;
      updateVisibility();
    }
  });

  observer.observe(document.documentElement, { subtree: true, childList: true });
})();
