#!/usr/bin/env node
/**
 * Generate PNG icons from SVG for Chrome extension.
 * Requires: npm install sharp (optional). Falls back to copying SVG as placeholder.
 */
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'icons');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff0033"/>
      <stop offset="100%" stop-color="#b80024"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#g)"/>
  <path fill="#fff" d="M52 38 L52 90 L88 64 Z"/>
  <path fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" d="M34 96 L94 96"/>
</svg>`;

fs.mkdirSync(iconsDir, { recursive: true });
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svg);

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.log('sharp not installed — writing SVG placeholders as PNG names');
    for (const size of [16, 48, 128]) {
      fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), Buffer.from(svg));
    }
    return;
  }

  for (const size of [16, 48, 128]) {
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(iconsDir, `icon${size}.png`));
  }
  console.log('Icons generated in icons/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
