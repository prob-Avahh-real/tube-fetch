#!/usr/bin/env node
/**
 * Copy ffmpeg.wasm UMD builds into vendor/ffmpeg for the extension.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dest = path.join(root, 'vendor', 'ffmpeg');

const files = [
  ['node_modules/@ffmpeg/ffmpeg/dist/umd/ffmpeg.js', 'ffmpeg.js'],
  ['node_modules/@ffmpeg/ffmpeg/dist/umd/814.ffmpeg.js', '814.ffmpeg.js'],
  ['node_modules/@ffmpeg/util/dist/umd/index.js', 'util.js'],
  ['node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js', 'ffmpeg-core.js'],
  ['node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm', 'ffmpeg-core.wasm'],
];

fs.mkdirSync(dest, { recursive: true });

for (const [fromRel, toName] of files) {
  const from = path.join(root, fromRel);
  if (!fs.existsSync(from)) {
    console.error(`Missing ${fromRel}. Run: npm install`);
    process.exit(1);
  }
  fs.copyFileSync(from, path.join(dest, toName));
  console.log(`vendor/ffmpeg/${toName}`);
}

console.log('ffmpeg vendor ready');
