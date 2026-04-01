# ✨ NewGen

> A dynamic showcase loader for premium Intel Eventide, Sony, and ASUS brochure experiences with smart collapsible navigation.

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

**NewGen** is a lightweight local web experience that launches a dynamic HTML loader and lets you switch between curated brochure pages:

- **Intel Eventide** - Full processor architecture showcase with CPU, GPU, Tile, and Technology deep-dives
- **Sony a0 & XCD-LED** - Professional camera systems
- **ASUS Ceralumenesium Sapphire** - Advanced material technology

The app is intentionally simple and fast: a Node.js static server powers a polished browser shell (`index.html`) that loads brochure pages in an iframe with one-click navigation, while History API routes keep the browser URL in sync for direct linking and refresh.

---

## 🚀 Features

- 🎯 **Hover-to-expand sidebar** - Automatically expands on hover (52px → 280px), collapses when you move away
- 🎨 **Icon-based navigation** - Every company, product, category, and page has a unique emoji icon
- 🗂️ **3-level nested navigation** - Company → Product → Subcategories → Individual Pages
- ✨ **Smooth animations** - Cubic-bezier transitions for professional feel
- 🧭 **History API routing** with URL-aware navigation and back/forward support
- 🖥️ **Single local server** (`Server/server.js`) with static file delivery
- 📦 **No framework overhead** (vanilla Node.js + HTML/CSS/JS)
- 📱 **Mobile responsive** with slide-in sidebar (900px breakpoint)
- 🧰 **Verbose Windows launcher UX** with structured startup diagnostics

---

## 🎯 Navigation System

### Hover-Based Collapsible Sidebar

The sidebar starts collapsed (52px width) and automatically expands to 280px when you hover over it. This saves screen space while keeping navigation easily accessible.

**Features:**
- **Auto-expand on hover** - No clicking required
- **Smooth animations** - 350ms cubic-bezier transitions
- **Icon indicators** - Visual feedback for every navigation item
- **Nested categories** - Support for unlimited hierarchy depth

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

To add new companies or brochures, update the `NAV_STRUCTURE` and `ICONS` objects in `index.html`. See [NAVIGATION.md](NAVIGATION.md) for detailed instructions.

---

## 🗂️ Project Structure

```text
NewGen/
├── index.html                  # Main dynamic loader UI with hover sidebar
├── NAVIGATION.md               # Navigation system documentation
├── Server/
│   └── server.js               # Node.js static server (port 3000)
├── start-newgen.bat            # Windows batch launcher
├── start-newgen.ps1            # PowerShell launcher
└── Source/
    ├── INTEL/
    │   └── Eventide/
    │       ├── intel.eventide.brochure.html
    │       ├── CPU.Architectures/
    │       ├── GPU.architectures/
    │       ├── Technologies/
    │       ├── Tiles/
    │       └── Media/
    ├── SONY/
    │   ├── ILCE-0/
    │   │   └── sony.a0.brochure.html
    │   └── XCD-LED/
    │       └── sony,XCDLED.brochure.html
    └── ASUS/
        └── Material/
            └── Ceraluminesium/
                └── asus.ceraluminesium.brochure.html
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
2. URL paths without file extensions (for example `/Intel/Eventide`) resolve to `index.html`.
3. `index.html` renders the top navigation and iframe viewer.
4. Clicking a nav button updates browser history (`pushState`) and swaps the iframe source to the selected brochure file.
5. Browser back/forward (`popstate`) restores the correct brochure view.
6. Static assets and brochure files are served directly from disk.

---

## 🧪 Development Notes

- `npm test` runs `scripts/test-debug.js`, a verbose diagnostics test that:
  - validates watchdog endpoints (`/__launcher/status`, `/__launcher/heartbeat`, `/__launcher/ping`, `/__launcher/closed`)
  - checks route navigability for declared `index.html` paths
  - verifies declared source pages and deep-dive mapping targets are loadable
  - reports potential orphaned `.html` files that are not referenced by route/deep-dive mappings
- There is currently no configured linter/build pipeline in `package.json`.
- This repository is focused on static brochure presentation and local hosting.

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
