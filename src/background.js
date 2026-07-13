const MAX_HISTORY = 50;
const MERGE_PAGE = 'src/merge/merge.html';
const OFFSCREEN_REASON = 'WORKERS';

try {
  // Chrome MV3 service worker: load shared browser shim.
  importScripts('lib/browser.js');
} catch (_) {
  // Firefox background.scripts already includes browser.js.
}

let mergeReadyWaiters = [];
let mergeHostReady = false;

function notifyMergeReady() {
  mergeHostReady = true;
  mergeReadyWaiters.forEach((resolve) => resolve());
  mergeReadyWaiters = [];
}

function waitForMergeReady(timeoutMs = 15000) {
  if (mergeHostReady) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      mergeReadyWaiters = mergeReadyWaiters.filter((r) => r !== resolve);
      reject(new Error('合并引擎启动超时'));
    }, timeoutMs);
    mergeReadyWaiters.push(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function saveHistory(entry) {
  const { downloadHistory = [] } = await chrome.storage.local.get('downloadHistory');
  const next = [
    entry,
    ...downloadHistory.filter(
      (item) => item.videoId !== entry.videoId || item.filename !== entry.filename,
    ),
  ].slice(0, MAX_HISTORY);
  await chrome.storage.local.set({ downloadHistory: next });
}

async function setMergeProgress(payload) {
  await chrome.storage.local.set({
    mergeProgress: {
      ...payload,
      at: Date.now(),
    },
  });
}

async function hasOffscreenDocument() {
  if (!chrome.offscreen?.createDocument) return false;
  if (chrome.runtime.getContexts) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
    });
    return contexts.length > 0;
  }
  return false;
}

async function ensureMergeHost() {
  if (chrome.offscreen?.createDocument) {
    const exists = await hasOffscreenDocument();
    if (!exists) {
      mergeHostReady = false;
      await chrome.offscreen.createDocument({
        url: MERGE_PAGE,
        reasons: [OFFSCREEN_REASON],
        justification: 'Use ffmpeg.wasm workers to merge YouTube video and audio streams',
      });
      await waitForMergeReady();
    }
    return { mode: 'offscreen' };
  }

  const pageUrl = chrome.runtime.getURL(MERGE_PAGE);
  const existing = await chrome.tabs.query({ url: pageUrl });
  if (existing[0]) {
    return { mode: 'tab', tabId: existing[0].id };
  }

  mergeHostReady = false;
  const tab = await chrome.tabs.create({ url: pageUrl, active: false });
  await waitForMergeReady();
  return { mode: 'tab', tabId: tab.id };
}

function downloadFile({ url, filename, videoId }) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        url,
        filename: `TubeFetch/${filename}`,
        saveAs: false,
        conflictAction: 'uniquify',
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        saveHistory({
          downloadId,
          filename,
          videoId,
          url,
          at: Date.now(),
        });
        resolve({ ok: true, downloadId });
      },
    );
  });
}

function sendMergeJob(payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'RUN_MERGE', ...payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response || { ok: false, error: '无响应' });
    });
  });
}

async function mergeAndDownload(payload) {
  await setMergeProgress({ text: '准备合并引擎…', progress: 0.02, active: true });
  await ensureMergeHost();

  const result = await sendMergeJob(payload);
  if (!result?.ok) {
    await setMergeProgress({
      text: result?.error || '合并失败',
      progress: 0,
      active: false,
      error: true,
    });
    return result;
  }

  await saveHistory({
    filename: payload.filename,
    videoId: payload.videoId,
    merged: true,
    at: Date.now(),
  });

  await setMergeProgress({
    text: '合并完成',
    progress: 1,
    active: false,
    done: true,
  });

  chrome.action.setBadgeText({ text: '✓' });
  chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2500);

  return result;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'MERGE_HOST_READY') {
    notifyMergeReady();
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'MERGE_PROGRESS') {
    setMergeProgress({
      text: message.text,
      progress: message.progress,
      active: true,
    });
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'DOWNLOAD') {
    downloadFile(message)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message.type === 'MERGE_AND_DOWNLOAD') {
    mergeAndDownload(message)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message.type === 'VIDEO_INFO') {
    chrome.storage.local.set({ lastVideoInfo: message.info });
    sendResponse({ ok: true });
    return true;
  }

  return false;
});

chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state?.current === 'complete' && delta.id) {
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2500);
  }
});
