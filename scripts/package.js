#!/usr/bin/env node
/**
 * Package TubeFetch for Chrome / Firefox stores.
 *
 * Usage:
 *   node scripts/package.js chrome
 *   node scripts/package.js firefox
 *   node scripts/package.js all
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const target = (process.argv[2] || 'all').toLowerCase();

const INCLUDE = [
  'icons',
  'src',
  'vendor',
  'README.md',
  'AGENTS.md',
];

function ensureVendor() {
  const wasm = path.join(root, 'vendor', 'ffmpeg', 'ffmpeg-core.wasm');
  if (!fs.existsSync(wasm)) {
    console.log('Vendoring ffmpeg…');
    execSync('node scripts/vendor-ffmpeg.js', { cwd: root, stdio: 'inherit' });
  }
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      if (name === '.DS_Store') continue;
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function packageBrowser(browser) {
  const outDir = path.join(root, 'dist', browser);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const manifestSrc = browser === 'firefox'
    ? path.join(root, 'manifest.firefox.json')
    : path.join(root, 'manifest.json');

  fs.copyFileSync(manifestSrc, path.join(outDir, 'manifest.json'));

  for (const item of INCLUDE) {
    const from = path.join(root, item);
    if (!fs.existsSync(from)) continue;
    copyRecursive(from, path.join(outDir, item));
  }

  // Chrome package should not include Firefox-only notes; zip the folder.
  const zipPath = path.join(root, 'dist', `tubefetch-${browser}-v${readVersion()}.zip`);
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

  const zipCmd = process.platform === 'win32'
    ? `powershell -Command "Compress-Archive -Path '${outDir}\\*' -DestinationPath '${zipPath}'"`
    : `cd '${outDir}' && zip -qr '${zipPath}' .`;

  execSync(zipCmd, { stdio: 'inherit' });
  console.log(`Built ${browser}: ${zipPath}`);
}

function readVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  return pkg.version || '0.0.0';
}

ensureVendor();

if (target === 'all') {
  packageBrowser('chrome');
  packageBrowser('firefox');
} else if (target === 'chrome' || target === 'firefox') {
  packageBrowser(target);
} else {
  console.error('Usage: node scripts/package.js [chrome|firefox|all]');
  process.exit(1);
}
