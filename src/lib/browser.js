/**
 * Cross-browser API shim. Prefer `browser` (Firefox), fall back to `chrome`.
 * Exposes a Promise-friendly `api` for callers that need it.
 */
(() => {
  'use strict';

  const root = typeof globalThis !== 'undefined' ? globalThis : self;
  const raw = root.browser || root.chrome;

  if (!raw) return;

  if (!root.chrome) root.chrome = raw;
  if (!root.browser) root.browser = raw;

  root.TubeFetchBrowser = raw;
})();
