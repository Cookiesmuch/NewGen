# ✨ NewGen

> A dynamic showcase loader for premium Intel Eventide and Sony brochure experiences.

![Platform](https://img.shields.io/badge/platform-Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Frontend](https://img.shields.io/badge/frontend-HTML%20%7C%20CSS%20%7C%20JS-1f2937?style=for-the-badge)
![Status](https://img.shields.io/badge/status-active-22c55e?style=for-the-badge)
![License](https://img.shields.io/badge/license-ISC-0ea5e9?style=for-the-badge)

---

## 📚 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
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

- **Intel Eventide**
- **Sony a0**
- **Sony XCD-LED**

The app is intentionally simple and fast: a Node.js static server powers a polished browser shell (`NewGen.html`) that loads brochure pages in an iframe with one-click navigation, while History API routes keep the browser URL in sync for direct linking and refresh.

---

## 🚀 Features

- 🎛️ **Dynamic page switching** from a top navigation bar
- 🧭 **History API routing** with URL-aware navigation and back/forward support
- 🖥️ **Single local server** (`server.js`) with static file delivery
- 📦 **No framework overhead** (vanilla Node.js + HTML/CSS/JS)
- 🧭 **Cross-platform startup scripts** for Windows CMD and PowerShell
- 🧰 **Verbose Windows launcher UX** with structured startup diagnostics
- 🎨 **Modern visual shell** with dark UI, gradients, and responsive behavior

---

## 🗂️ Project Structure

```text
NewGen/
├── NewGen.html                 # Main dynamic loader UI
├── server.js                   # Node.js static server (port 3000)
├── start-newgen.bat            # Windows batch launcher
├── start-newgen.ps1            # PowerShell launcher
├── INTEL/
│   └── Eventide/
│       └── Source/
│           └── intel.eventide.brochure.html
└── SONY/
    ├── ILCE-0/
    │   └── sony.a0.brochure.html
    └── XCD-LED/
        └── sony,XCDLED.brochure.html
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
node server.js
```

Then open:

```text
http://localhost:3000
```

---

## 🧰 Run Options

### Standard (all platforms)

```bash
node server.js
```

### Windows CMD

```bat
start-newgen.bat
```

The batch launcher:
- starts `server.js` in CMD mode
- delegates verbose startup logs and browser open flow to `server.js`
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

1. `server.js` starts a local HTTP server on port **3000**.
2. URL paths without file extensions (for example `/Intel/Eventide`) resolve to `NewGen.html`.
3. `NewGen.html` renders the top navigation and iframe viewer.
4. Clicking a nav button updates browser history (`pushState`) and swaps the iframe source to the selected brochure file.
5. Browser back/forward (`popstate`) restores the correct brochure view.
6. Static assets and brochure files are served directly from disk.

---

## 🧪 Development Notes

- `npm test` is currently a placeholder script in `package.json`:
  - It intentionally returns: `Error: no test specified`.
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
