# ✨ NewGen

> A static brochure site for premium Intel Eventide, Sony, ASUS, Bang & Olufsen, and Aerospace experiences — every page lives at a real file path, with a shared collapsible navigator.

![Platform](https://img.shields.io/badge/platform-Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Frontend](https://img.shields.io/badge/frontend-HTML%20%7C%20CSS%20%7C%20JS-1f2937?style=for-the-badge)
![Status](https://img.shields.io/badge/status-active-22c55e?style=for-the-badge)
![License](https://img.shields.io/badge/license-ISC-0ea5e9?style=for-the-badge)

---

## 📚 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Navigation System](#-navigation-system)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Run Options](#-run-options)
- [Technology Stack](#-technology-stack)
- [How It Works](#-how-it-works)
- [Development Notes](#-development-notes)
- [Credits & Authorship](#-credits--authorship)
- [License](#-license)

---

## 🌌 Overview

**NewGen** is a static site where the address bar path *is* the file path. Every route is a real folder with an `index.html`, so pages are directly linkable, crawlable, and refresh-safe with no client-side routing tricks:

- **NewGen Conglomerate** — Root (`/`) landing page with the NewGen logo
- **Intel Eventide** (`/Intel/Eventide/`) — Full processor architecture showcase with CPU, GPU, Tile, and Technology deep-dives
- **Sony a0, XCD-LED & CRT-VR** (`/Sony/...`) — Professional camera and display systems
- **ASUS Ceralumenesium Sapphire** (`/ASUS/Ceralumenesium/`) — Advanced material technology
- **Bang & Olufsen wH105** (`/BangOlufsen/wH105/`) — Audio
- **Aerospace STARSCRAMMER™** (`/Aerospace/STARSCRAMMER/`) — Aerospace division

A shared navigator (`assets/nav.js` + `assets/nav.css`) is included by every page and injects the collapsible sidebar, so the global GUI survives direct navigation to any URL.

---

## 🚀 Features

- 📁 **True file-path routing** — `/Intel/Eventide/CPU/SolarEclipse/` is literally `Intel/Eventide/CPU/SolarEclipse/index.html`
- 🎯 **Hover-to-expand sidebar** — Automatically expands on hover (52px → 280px), collapses when you move away
- 🎨 **Icon-based navigation** — Every company, product, category, and page has a unique emoji icon
- 🗂️ **4-level nested navigation** — Company → Product → Category → Individual Pages
- ✨ **Smooth animations** — Cubic-bezier transitions for professional feel
- 🔗 **Real links everywhere** — Sidebar entries are plain `<a>` elements; no History API, no iframe shell
- 🚫 **Honest 404s** — Unknown paths get `404.html` (with randomized jokes); real pages never flash a 404
- 🖥️ **Single local server** (`Server/server.js`) with GitHub-Pages-style directory serving
- 📦 **No framework overhead** (vanilla Node.js + HTML/CSS/JS)
- 📱 **Mobile responsive** with slide-in sidebar (900px breakpoint)
- 🧰 **Verbose Windows launcher UX** with structured startup diagnostics
- 🛡️ **Launcher watchdog lifecycle** (`/__launcher/*`) with close-tab countdown signaling (localhost only)

---

## 🎯 Navigation System

### Hover-Based Collapsible Sidebar

The sidebar starts collapsed (52px width) and automatically expands to 280px when you hover over it. It is injected on every page by `assets/nav.js`, so it works no matter which URL you land on.

**Features:**
- **Auto-expand on hover** — No clicking required
- **Smooth animations** — 350ms cubic-bezier transitions
- **Icon indicators** — Visual feedback for every navigation item
- **Nested categories** — Support for unlimited hierarchy depth
- **URL-aware active state** — The current page and its ancestors are highlighted and expanded automatically

### Navigation Hierarchy

```
Company (e.g., Intel 🔷)
  └── Product (e.g., Eventide 📘)
      └── Subcategories
          ├── CPU Architectures 🖥️
          │   ├── Solar Eclipse ☀️
          │   ├── Sunset Cove 🌅
          │   └── ...
          ├── GPU Architectures 🎨
          ├── Tiles 🧩
          └── Technologies ⚡
```

### Adding New Navigation Items

To add new companies or brochures, create the route folder with an `index.html` and update the `NAV_STRUCTURE` and `ICONS` objects in `assets/nav.js`. See [NAVIGATION.md](NAVIGATION.md) for detailed instructions.

---

## 🗂️ Project Structure

```text
NewGen/
├── index.html                  # Root (/) landing page (NewGen Conglomerate)
├── 404.html                    # 404 experience with rotating jokes
├── NAVIGATION.md               # Navigation system documentation
├── assets/
│   ├── nav.css                 # Shared navigator styles
│   └── nav.js                  # Shared navigator (sidebar, active state, watchdog)
├── Media/
│   └── NewGenLogo.svg
├── Server/
│   └── server.js               # Node.js static server (port 3000)
├── start-newgen.bat            # Windows batch launcher
├── start-newgen.ps1            # PowerShell launcher
├── Intel/
│   └── Eventide/
│       ├── index.html          # Brochure page (/Intel/Eventide/)
│       ├── deepdive.js         # Shared deep-dive content loader
│       ├── deepdive.css
│       ├── CPU/<Name>/index.html        # Deep-dive route stubs
│       ├── SKU/<Id>/index.html
│       ├── GPU/<Name>/index.html
│       ├── Tile/<Name>/index.html
│       ├── Technology/<Name>/index.html
│       ├── CPU.Architectures/  # Deep-dive content fragments
│       ├── CPU.SKU/
│       ├── GPU.architectures/
│       ├── Tiles/
│       ├── Technologies/
│       └── Media/
├── Sony/
│   ├── ILCE-0/index.html
│   ├── XCD-LED/index.html
│   └── CRT-VR/index.html
├── ASUS/
│   └── Ceralumenesium/index.html
├── BangOlufsen/
│   └── wH105/index.html
└── Aerospace/
    └── STARSCRAMMER/index.html
```

---

## ⚡ Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ recommended

### Install (if needed)

```bash
npm install
```

### Launch

```bash
node Server/server.js
```

Then open:

```text
http://localhost:3000
```

---

## 🧰 Run Options

### Standard (all platforms)

```bash
node Server/server.js
```

### Windows CMD

```bat
start-newgen.bat
```

The batch launcher:
- starts `Server/server.js` in CMD mode
- delegates verbose startup logs and browser open flow to `Server/server.js`
- opens the browser automatically (or reuses an already-running server)
- keeps output and shutdown/watcher behavior centralized in one script

### PowerShell

```powershell
./start-newgen.ps1
```

> Default server port is `3000`.

---

## 🧠 Technology Stack

- **Runtime:** Node.js (CommonJS)
- **Server:** Native `http`, `fs`, and `path` modules
- **Frontend:** HTML5, CSS3, vanilla JavaScript
- **Assets:** SVG and static HTML brochure files

---

## ⚙️ How It Works

1. `Server/server.js` starts a local HTTP server on port **3000**.
2. Directory URLs (for example `/Intel/Eventide/`) serve that folder's `index.html`; URLs without a trailing slash are redirected first, matching GitHub Pages behavior.
3. Every page includes `assets/nav.js`, which injects the global sidebar, marks the current page active, and expands its ancestor categories.
4. Sidebar entries are ordinary links — each click is a normal page load to a real path.
5. Eventide deep-dive pages are small stubs that declare their content fragment (`window.NG_DEEPDIVE_SRC`) and let the shared `Intel/Eventide/deepdive.js` fetch and inline it — this keeps multi-fragment pages assembled client-side where needed.
6. Unknown paths return `404.html` with a 404 status and preserve the typed path for `{PATH}` jokes.
7. Static assets and brochure files are served directly from disk.

---

## 🧪 Development Notes

- `npm test` runs `scripts/test-debug.js`, a diagnostics test that:
  - verifies every route declared in `assets/nav.js` has a real `index.html` on disk
  - starts the local server and checks every route responds with HTTP 200
  - verifies deep-dive stubs point at existing content fragments
  - checks trailing-slash redirects and 404 behavior
  - validates watchdog endpoints (`/__launcher/status`, `/__launcher/heartbeat`, `/__launcher/ping`)
- There is currently no configured linter/build pipeline in `package.json`.
- This repository is focused on static brochure presentation; it deploys to GitHub Pages via `.github/workflows/jekyll.yml`.

---

## 👥 Credits & Authorship

This project README and development workflow are credited to:

- **You** (project owner / author)
- **GitHub Copilot**
- **Claude**
- **Gemini**
- **Codex**

Thank you for shaping NewGen through human + AI collaboration.

---

## 📄 License

Licensed under the **ISC License** (see `package.json`).
