#!/usr/bin/env node
// One-off generator for placeholder SVG assets (logos, executive portraits, card thumbnails).
// Run with: node scripts/generate-placeholders.js
// Safe to re-run; overwrites existing placeholder files.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const divisions = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/divisions.json'), 'utf8'));
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/cards.json'), 'utf8'));

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function initials(name) {
  return name
    .replace(/\(.*?\)/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function textColor(hex) {
  const c = hex.replace('#', '');
  if (c.length !== 6) return '#0A0A0A';
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#0A0A0A' : '#F5F5F0';
}

// ---- Company wordmark logos ----
function companyLogo(div) {
  const fg = textColor(div.accentColor);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60" role="img" aria-label="${div.name} placeholder mark">
  <rect width="240" height="60" rx="8" fill="${div.accentColor}"/>
  <text x="20" y="38" font-family="'Space Grotesk', Arial, sans-serif" font-size="22" font-weight="700" fill="${fg}">${div.name}</text>
</svg>`;
}

// ---- Executive portrait placeholder ----
// Duotone gradient bust silhouette + halftone texture, so the CSS-level
// glow ring / duotone overlay on the live page has something to work
// with instead of a flat initials-on-circle badge.
function mix(hex, targetHex, amount) {
  const c = hex.replace('#', '');
  const t = targetHex.replace('#', '');
  const r = Math.round(parseInt(c.slice(0, 2), 16) * (1 - amount) + parseInt(t.slice(0, 2), 16) * amount);
  const g = Math.round(parseInt(c.slice(2, 4), 16) * (1 - amount) + parseInt(t.slice(2, 4), 16) * amount);
  const b = Math.round(parseInt(c.slice(4, 6), 16) * (1 - amount) + parseInt(t.slice(4, 6), 16) * amount);
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function portrait(name, accent) {
  const fg = textColor(accent);
  const ini = initials(name);
  const shadow = mix(accent, '#000000', 0.72);
  const highlight = mix(accent, '#FFFFFF', 0.35);
  const seed = hash(name);
  const dotPhase = seed % 12;
  const id = 'p' + (seed % 100000).toString(36);

  // sparse halftone dot field for texture, phase varies per-name
  let dots = '';
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if ((row * 10 + col + dotPhase) % 3 !== 0) continue;
      const cx = 10 + col * 20 + (row % 2 ? 10 : 0);
      const cy = 10 + row * 20;
      dots += `<circle cx="${cx}" cy="${cy}" r="1.1" fill="${highlight}" opacity="0.14"/>`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="Placeholder portrait">
  <defs>
    <linearGradient id="${id}-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${shadow}"/>
      <stop offset="1" stop-color="${accent}"/>
    </linearGradient>
    <radialGradient id="${id}-glow" cx="50%" cy="34%" r="65%">
      <stop offset="0" stop-color="${highlight}" stop-opacity="0.5"/>
      <stop offset="1" stop-color="${highlight}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="200" height="200" fill="url(#${id}-bg)"/>
  <rect width="200" height="200" fill="url(#${id}-glow)"/>
  <g>${dots}</g>
  <circle cx="100" cy="76" r="36" fill="${shadow}" opacity="0.55"/>
  <path d="M36 176c0-40 29-66 64-66s64 26 64 66" fill="${shadow}" opacity="0.55"/>
  <circle cx="100" cy="76" r="36" fill="none" stroke="${highlight}" stroke-width="1" opacity="0.4"/>
  <text x="16" y="184" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="700" fill="${fg}" opacity="0.85">${ini}</text>
  <text x="16" y="196" font-family="'JetBrains Mono', monospace" font-size="7" letter-spacing="1.5" fill="${fg}" opacity="0.55">PLACEHOLDER</text>
</svg>`;
}

// ---- Card thumbnail (800x450 gradient + title) ----
function cardThumb(card, accent) {
  const fg = textColor(accent);
  const id = 'g' + (hash(card.title) % 100000).toString(36);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" role="img" aria-label="${card.title} placeholder thumbnail">
  <defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.95"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0.55"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="#05070F"/>
  <rect width="800" height="450" fill="url(#${id})"/>
  <text x="40" y="400" font-family="'Space Grotesk', Arial, sans-serif" font-size="34" font-weight="700" fill="${fg}">${card.title}</text>
  <text x="40" y="50" font-family="'JetBrains Mono', monospace" font-size="14" letter-spacing="2" fill="${fg}" opacity="0.75">${card.division.toUpperCase()}</text>
</svg>`;
}

ensureDir(path.join(ROOT, 'Media/Companies'));
ensureDir(path.join(ROOT, 'Media/Executives'));
ensureDir(path.join(ROOT, 'Media/Cards'));

const logoSlugs = {
  Intel: 'intel-logo', Lightmatter: 'lightmatter-logo', Sony: 'sony-logo', ASUS: 'asus-rog-logo',
  OPPO: 'oppo-bbk-logo', Ford: 'ford-logo', BO: 'bo-logo', ShallXR: 'shallxr-logo',
  PlayForDream: 'playfordream-logo', Noctua: 'noctua-logo', Hollyland: 'hollyland-logo', Shimoda: 'shimoda-logo'
};

for (const div of divisions) {
  const logoFile = path.join(ROOT, 'Media/Companies', `${logoSlugs[div.slug]}.svg`);
  fs.writeFileSync(logoFile, companyLogo(div));

  const portraitSlug = path.basename(div.ceoPortraitPath);
  const portraitFile = path.join(ROOT, 'Media/Executives', portraitSlug);
  fs.writeFileSync(portraitFile, portrait(div.ceoName, div.accentColor));
}

// Francis's portrait — gold/amber, distinct from the twelve
fs.writeFileSync(
  path.join(ROOT, 'Media/Executives/francis-robledo.svg'),
  portrait('Francis Gabriel D. Robledo', '#E0B84A')
);

for (const card of cards) {
  const div = divisions.find((d) => d.slug === card.division);
  const file = path.join(ROOT, 'Media/Cards', path.basename(card.thumb));
  fs.writeFileSync(file, cardThumb(card, div ? div.accentColor : '#0068B5'));
}

console.log('Placeholder assets generated.');
