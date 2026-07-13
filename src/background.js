const MAX_HISTORY = 50;

async function saveHistory(entry) {
  const { downloadHistory = [] } = await chrome.storage.local.get('downloadHistory');
  const next = [entry, ...downloadHistory.filter((item) => item.videoId !== entry.videoId || item.filename !== entry.filename)].slice(0, MAX_HISTORY);
  await chrome.storage.local.set({ downloadHistory: next });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'DOWNLOAD') {
    const { url, filename, videoId } = message;

    chrome.downloads.download(
      {
        url,
        filename: `TubeFetch/${filename}`,
        saveAs: false,
        conflictAction: 'uniquify',
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }

        saveHistory({
          downloadId,
          filename,
          videoId,
          url,
          at: Date.now(),
        });

        sendResponse({ ok: true, downloadId });
      },
    );

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
