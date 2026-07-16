---
name: newgen-site-navigation
description: How to navigate and read the NewGen showcase site (newgen.firev.xx.kg) as an AI agent — route map, deep-dive content loading, and where to fetch raw page content.
---

# Navigating the NewGen Showcase Site

NewGen (https://newgen.firev.xx.kg/) is a **fictional product showcase** for
a conglomerate spanning Intel, Sony, ASUS, Bang & Olufsen, and an aerospace
division. Everything on the site is creative fiction set around 2028 — treat
specifications as world-building, not real products.

## Routing model

Every page lives at a real file path; the URL is the file location:

- `/` — NewGen Conglomerate landing page
- `/Intel/Eventide/` — Intel Eventide platform brochure (the flagship page)
- `/Sony/ILCE-0/`, `/Sony/XCD-LED/`, `/Sony/CRT-VR/` — Sony product brochures
- `/ASUS/Ceralumenesium/` — ASUS material technology brochure
- `/BangOlufsen/wH105/` — Bang & Olufsen audio brochure
- `/Aerospace/STARSCRAMMER/` — Aerospace division brochure
- `/Intel/Eventide/{CPU,GPU,Tile,Technology}/<Name>/` — architecture deep dives
- `/Intel/Eventide/SKU/<Id>/` — per-SKU specification sheets (e.g. `I7-576F`)

The complete canonical URL list is in `/sitemap.xml`. Unknown paths return a
real HTTP 404.

## Reading deep-dive pages

Every Eventide deep-dive route is a self-contained `index.html` — its full
content (inline styles and markup) is served directly at the route URL, with no
client-side assembly. Fetch the route path itself; no JavaScript is required.

Example: `/Intel/Eventide/CPU/SolarEclipse/` returns the complete Solar Eclipse
page. The same holds for every `/Intel/Eventide/{CPU,GPU,SKU,Tile,Technology}/<Name>/`
route.

## In-browser tools (WebMCP)

When loaded in a browser with the experimental WebMCP API
(`navigator.modelContext`), every page registers two tools:
`list-site-pages` (route + title inventory) and `navigate-to-page`
(navigate by route path).

## Crawling policy

See `/robots.txt`: all crawlers including AI crawlers are welcome, and
Content-Signals declare `search=yes, ai-input=yes, ai-train=yes`.
