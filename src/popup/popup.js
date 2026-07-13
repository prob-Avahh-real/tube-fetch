function show(id) {
  ['state-empty', 'state-loading', 'state-error', 'state-ready'].forEach((sectionId) => {
    document.getElementById(sectionId).hidden = sectionId !== id;
  });
}

function formatDuration(seconds) {
  const s = Number(seconds) || 0;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function renderOptions(info) {
  const container = document.getElementById('options');
  container.innerHTML = '';

  info.downloads.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option-btn';
    btn.dataset.optionId = item.id;

    if (item.kind === 'combo') {
      btn.innerHTML = `
        <span class="option-label">最佳画质（视频 + 音频，两个文件）</span>
        <span class="option-meta">${item.qualityLabel}</span>
      `;
    } else {
      const typeLabel = item.kind === 'audio' ? '仅音频' : item.kind === 'video' ? '仅视频' : '音视频';
      btn.innerHTML = `
        <span class="option-label">${item.qualityLabel || typeLabel} · ${item.ext.toUpperCase()}</span>
        <span class="option-meta">${typeLabel}${item.sizeLabel ? ` · ${item.sizeLabel}` : ''}</span>
      `;
    }

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'DOWNLOAD_OPTION',
        optionId: item.id,
      });
      btn.disabled = false;
      if (!response?.ok) {
        alert(response?.error || '下载失败');
      }
    });

    container.appendChild(btn);
  });
}

function renderInfo(info) {
  document.getElementById('thumb').src = info.thumbnail || '';
  document.getElementById('title').textContent = info.title;
  document.getElementById('meta').textContent = `${info.author} · ${formatDuration(info.duration)} · ${info.downloads.length} 个格式`;
  renderOptions(info);
}

async function loadHistory() {
  const { downloadHistory = [] } = await chrome.storage.local.get('downloadHistory');
  const list = document.getElementById('history');
  list.innerHTML = '';

  if (downloadHistory.length === 0) {
    list.innerHTML = '<li>暂无记录</li>';
    return;
  }

  downloadHistory.slice(0, 5).forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item.filename;
    list.appendChild(li);
  });
}

async function loadVideoInfo() {
  show('state-loading');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';

  if (!url.includes('youtube.com/watch') && !url.includes('youtube.com/shorts/') && !url.includes('youtu.be/')) {
    show('state-empty');
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_VIDEO_INFO' });
    const info = response?.info;

    if (!info?.ok) {
      document.getElementById('error-text').textContent = info?.error || '无法读取视频信息';
      show('state-error');
      return;
    }

    renderInfo(info);
    show('state-ready');
  } catch {
    document.getElementById('error-text').textContent = '请刷新 YouTube 页面后重试';
    show('state-error');
  }
}

document.getElementById('retry-btn').addEventListener('click', loadVideoInfo);

loadVideoInfo();
loadHistory();
