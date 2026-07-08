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

// ---- Executive portrait placeholder (initials on accent circle) ----
function portrait(name, accent) {
  const fg = textColor(accent);
  const ini = initials(name);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="Placeholder portrait">
  <rect width="200" height="200" fill="${accent}"/>
  <circle cx="100" cy="78" r="34" fill="${fg}" opacity="0.85"/>
  <path d="M40 172c0-38 27-62 60-62s60 24 60 62" fill="${fg}" opacity="0.85"/>
  <text x="100" y="196" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="600" fill="${fg}" text-anchor="middle" opacity="0.9">${ini} · PLACEHOLDER</text>
</svg>`;
}

// ---- Card thumbnail (800x450 gradient + title) ----
function cardThumb(card, accent) {
  const fg = textColor(accent);
  const id = 'g' + Math.random().toString(36).slice(2, 8);
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
