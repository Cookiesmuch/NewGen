#!/usr/bin/env node
// Regenerates /sitemap.xml from the routes declared in assets/nav.js.
// Run after adding or removing pages: node scripts/generate-sitemap.js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE_ORIGIN = 'https://newgen.renovait.qzz.io';

function extractNavRoutes() {
  const navSource = fs.readFileSync(path.join(ROOT, 'assets', 'nav.js'), 'utf8');
  const routeRegex = /path:\s*'(\/[^']*)'/g;
  const routes = new Set(['/']);
  let match;
  while ((match = routeRegex.exec(navSource)) !== null) {
    routes.add(match[1]);
  }
  return Array.from(routes);
}

const today = new Date().toISOString().slice(0, 10);
const urls = extractNavRoutes()
  .map((route) => (route === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${route}/`))
  .sort();

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map((loc) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`),
  '</urlset>',
  '',
].join('\n');

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
console.log(`sitemap.xml written with ${urls.length} URLs`);
