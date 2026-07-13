/* global TubeFetchUtils, TubeFetchParser */
const TubeFetchParser = (() => {
  'use strict';

  const { parseItag, qualityScore, extensionFromMime, formatBytes } = TubeFetchUtils;

  let cachedResponse = null;
  let fetchHookInstalled = false;

  function installFetchHook() {
    if (fetchHookInstalled) return;
    fetchHookInstalled = true;

    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';

      if (url.includes('/youtubei/v1/player') || url.includes('/get_watch')) {
        response.clone().json().then((data) => {
          if (data?.streamingData || data?.videoDetails) {
            cachedResponse = data;
          }
        }).catch(() => {});
      }

      return response;
    };
  }

  function parseEmbeddedJson(text, marker) {
    const idx = text.indexOf(marker);
    if (idx === -1) return null;

    const start = text.indexOf('{', idx);
    if (start === -1) return null;

    let depth = 0;
    for (let i = start; i < text.length; i += 1) {
      const ch = text[i];
      if (ch === '{') depth += 1;
      if (ch === '}') depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  function extractPlayerResponse() {
    if (cachedResponse?.streamingData) return cachedResponse;
    if (window.ytInitialPlayerResponse?.streamingData) {
      return window.ytInitialPlayerResponse;
    }

    for (const script of document.querySelectorAll('script')) {
      const text = script.textContent || '';
      const markers = ['ytInitialPlayerResponse', 'var ytInitialPlayerResponse'];
      for (const marker of markers) {
        const data = parseEmbeddedJson(text, marker);
        if (data?.streamingData || data?.videoDetails) {
          cachedResponse = data;
          return data;
        }
      }
    }

    return cachedResponse;
  }

  function resolveFormatUrl(format) {
    if (format.url) return format.url;

    const cipher = format.signatureCipher || format.cipher;
    if (!cipher) return null;

    const params = new URLSearchParams(cipher);
    const baseUrl = params.get('url');
    const sig = params.get('sig') || params.get('signature');
    const sp = params.get('sp') || 'signature';

    if (baseUrl && sig) {
      const joiner = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${joiner}${sp}=${encodeURIComponent(sig)}`;
    }

    return null;
  }

  function normalizeFormat(format, kind) {
    const url = resolveFormatUrl(format);
    if (!url) return null;

    const mimeType = format.mimeType || '';
    const qualityLabel = format.qualityLabel || format.quality || '';
    const hasVideo = mimeType.includes('video');
    const hasAudio = mimeType.includes('audio');

    return {
      id: `${kind}-${format.itag}`,
      itag: parseItag(format.itag),
      kind,
      qualityLabel,
      qualityScore: qualityScore(qualityLabel),
      mimeType,
      url,
      size: format.contentLength ? Number(format.contentLength) : null,
      sizeLabel: formatBytes(format.contentLength),
      hasVideo,
      hasAudio,
      ext: extensionFromMime(mimeType),
    };
  }

  function buildProgressiveOptions(formats) {
    return formats
      .map((f) => normalizeFormat(f, 'progressive'))
      .filter(Boolean)
      .filter((f) => f.hasVideo && f.hasAudio)
      .sort((a, b) => b.qualityScore - a.qualityScore);
  }

  function buildAdaptiveOptions(adaptiveFormats) {
    const video = adaptiveFormats
      .map((f) => normalizeFormat(f, 'video'))
      .filter(Boolean)
      .filter((f) => f.hasVideo && !f.hasAudio)
      .sort((a, b) => b.qualityScore - a.qualityScore);

    const audio = adaptiveFormats
      .map((f) => normalizeFormat(f, 'audio'))
      .filter(Boolean)
      .filter((f) => f.hasAudio && !f.hasVideo)
      .sort((a, b) => b.qualityScore - a.qualityScore);

    return { video, audio };
  }

  function buildBestCombo(adaptive) {
    const bestVideo = adaptive.video[0];
    const bestAudio = adaptive.audio[0];
    if (!bestVideo || !bestAudio) return null;

    return {
      id: `combo-${bestVideo.itag}-${bestAudio.itag}`,
      kind: 'combo',
      qualityLabel: `${bestVideo.qualityLabel} + 音频`,
      qualityScore: bestVideo.qualityScore,
      streams: [bestVideo, bestAudio],
    };
  }

  function extractVideoInfo(playerResponse) {
    if (!playerResponse) {
      return { ok: false, error: '无法读取播放器数据，请刷新页面后重试' };
    }

    const details = playerResponse.videoDetails || {};
    const streaming = playerResponse.streamingData;

    if (!streaming) {
      return {
        ok: false,
        error: playerResponse.playabilityStatus?.reason || '该视频暂无可下载流（可能受版权或会员限制）',
      };
    }

    const progressive = buildProgressiveOptions(streaming.formats || []);
    const adaptive = buildAdaptiveOptions(streaming.adaptiveFormats || []);
    const combo = buildBestCombo(adaptive);

    const downloads = [...progressive];
    if (combo) downloads.unshift(combo);
    adaptive.video.forEach((v) => downloads.push(v));
    adaptive.audio.forEach((a) => downloads.push(a));

    if (downloads.length === 0) {
      return { ok: false, error: '未找到可下载格式，YouTube 可能更新了加密策略' };
    }

    const thumbnails = details.thumbnail?.thumbnails || [];
    const thumb = thumbnails[thumbnails.length - 1]?.url || '';

    return {
      ok: true,
      videoId: details.videoId,
      title: details.title || 'Untitled',
      author: details.author || '',
      duration: Number(details.lengthSeconds) || 0,
      thumbnail: thumb,
      views: details.viewCount || '',
      downloads,
      progressive,
      adaptive,
      combo,
    };
  }

  function getCurrentVideoInfo() {
    installFetchHook();
    const playerResponse = extractPlayerResponse();
    return extractVideoInfo(playerResponse);
  }

  return {
    installFetchHook,
    getCurrentVideoInfo,
    extractPlayerResponse,
  };
})();
