/* global TubeFetchUtils */
const TubeFetchUtils = (() => {
  'use strict';

  function sanitizeFilename(name) {
    return (name || 'video')
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120) || 'video';
  }

  function parseItag(itag) {
    const n = Number(itag);
    return Number.isFinite(n) ? n : 0;
  }

  function qualityScore(label) {
    if (!label) return 0;
    const match = String(label).match(/(\d+)/);
    return match ? Number(match[1]) : 0;
  }

  function formatBytes(bytes) {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n <= 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = n;
    let i = 0;
    while (value >= 1024 && i < units.length - 1) {
      value /= 1024;
      i += 1;
    }
    return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  function extensionFromMime(mimeType) {
    if (!mimeType) return 'mp4';
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('mp4')) return 'mp4';
    if (mimeType.includes('audio')) return 'm4a';
    return 'mp4';
  }

  function getVideoId(url) {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) {
        return u.pathname.slice(1).split('/')[0];
      }
      if (u.pathname.startsWith('/shorts/')) {
        return u.pathname.split('/')[2];
      }
      return u.searchParams.get('v');
    } catch {
      return null;
    }
  }

  function isWatchPage(url) {
    const id = getVideoId(url || location.href);
    return Boolean(id);
  }

  return {
    sanitizeFilename,
    parseItag,
    qualityScore,
    formatBytes,
    extensionFromMime,
    getVideoId,
    isWatchPage,
  };
})();
