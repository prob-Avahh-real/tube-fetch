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

      if (item.kind === 'combo') {
        btn.innerHTML = `
          <span class="tf-option-label">最佳画质（视频+音频）</span>
          <span class="tf-option-meta">${item.qualityLabel}</span>
        `;
        btn.addEventListener('click', () => downloadCombo(info, item));
      } else {
        const typeLabel = item.kind === 'audio' ? '仅音频' : item.kind === 'video' ? '仅视频' : '音视频';
        btn.innerHTML = `
          <span class="tf-option-label">${item.qualityLabel || typeLabel} · ${item.ext.toUpperCase()}</span>
          <span class="tf-option-meta">${typeLabel}${item.sizeLabel ? ` · ${item.sizeLabel}` : ''}</span>
        `;
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
    const suffix = item.kind === 'audio' ? ' [audio]' : item.kind === 'video' ? ` [${item.qualityLabel}]` : ` [${item.qualityLabel}]`;
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

      if (option.kind === 'combo') {
        downloadCombo(latestInfo, option).then(() => sendResponse({ ok: true }));
      } else {
        downloadSingle(latestInfo, option).then(() => sendResponse({ ok: true }));
      }
      return true;
    }

    return false;
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
      cachedResponseClear();
      updateVisibility();
    }
  });

  function cachedResponseClear() {
    latestInfo = null;
  }

  observer.observe(document.documentElement, { subtree: true, childList: true });
})();
