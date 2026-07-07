# Navigation System Documentation

## Overview

NewGen uses **true file-path routing**: the URL path in the address bar is the actual folder path in the repository. `/Intel/Eventide/` is `Intel/Eventide/index.html` on disk. A shared **collapsible sidebar navigator** is injected on every page by `assets/nav.js` + `assets/nav.css`, so the global GUI is present no matter which URL is opened directly.

On desktop the sidebar collapses to a compact rail (52px) and expands on hover/focus (280px). It supports a 4-level hierarchy (Company → Product → Category → Page).

## Architecture

### Key Components

1. **Real route folders**: every navigable page is a folder containing an `index.html`
2. **Shared navigator** (`assets/nav.js`): builds the sidebar from `NAV_STRUCTURE`, injects it into the page, and derives the active item from `window.location`
3. **Plain links**: every sidebar entry is an `<a href>` — each navigation is a normal page load
4. **Deep-dive stubs** (Eventide only): tiny `index.html` files that declare a content fragment and let `Intel/Eventide/deepdive.js` fetch and inline it

### Routing

```
URL path                              File on disk
/                                     index.html
/Intel/Eventide/                      Intel/Eventide/index.html
/Intel/Eventide/CPU/SolarEclipse/     Intel/Eventide/CPU/SolarEclipse/index.html
/Sony/ILCE-0/                         Sony/ILCE-0/index.html
```

Because folders are served by their `index.html`, URLs stay clean (no `.html` suffix). GitHub Pages (and `Server/server.js` locally) redirect `/Intel/Eventide` → `/Intel/Eventide/` automatically.

### Navigation Hierarchy

```
Company (e.g., Intel)
└── Product (e.g., Eventide)
    ├── Main Page (/Intel/Eventide/)
    └── Subcategories
        ├── CPU Architectures
        │   ├── Solar Eclipse
        │   ├── Sunset Cove
        │   └── ...
        ├── Products (SKU mini-categories)
        ├── GPU Architectures
        ├── Tiles
        └── Technologies
```

## Adding New Companies/Brochures

### Step 1: Create the Route Folder

Create a folder matching the URL you want and put the brochure in it as `index.html`:

```
BangOlufsen/BeosoundA9/index.html     →  /BangOlufsen/BeosoundA9/
```

### Step 2: Include the Global Navigator

In the page's `<head>`, add the shared navigator (adjust `../../` to the folder depth):

```html
<link rel="stylesheet" href="../../assets/nav.css">
<script src="../../assets/nav.js" defer></script>
```

### Step 3: Add to Navigation Structure

Update the `NAV_STRUCTURE` object in `assets/nav.js` (paths are site-root-relative route ids; `nav.js` turns them into correct links on any host):

```javascript
'Bang & Olufsen': [
  {
    label: 'Beosound A9',
    path: '/BangOlufsen/BeosoundA9',
    subCategories: {
      'Acoustics': [
        { label: 'TrueImage Technology', path: '/BangOlufsen/BeosoundA9/Acoustics/TrueImage' }
      ]
    }
  }
]
```

Add icons to the `ICONS` object in `assets/nav.js` as desired.

### Step 4 (optional): Sidebar Page Highlight Colors

Update `PRODUCT_HIGHLIGHT_COLORS` in `assets/nav.js` (runtime source of truth). Choose colors based on the page's vibe:

```javascript
const PRODUCT_HIGHLIGHT_COLORS = {
  '/Intel/Eventide': {
    soft: 'rgba(140, 112, 255, 0.10)',   // expanded subcategory container bg
    row: 'rgba(140, 112, 255, 0.12)',    // row bg within the active page section
    border: 'rgba(140, 112, 255, 0.45)'  // left accent border
  },
  // ...
};
```

Page highlight backgrounds are applied only to the currently active page section; non-active sections stay neutral. Hover/selected states use a right-side blue motion indicator (dot on hover, line when selected).

## Deep-Dive Pages (multi-fragment content)

Eventide deep dives assemble a page from content fragments buried in subfolders (`CPU.Architectures/`, `CPU.SKU/`, `GPU.architectures/`, `Tiles/`, `Technologies/`). Each route is a small stub:

```html
<!-- Intel/Eventide/CPU/SolarEclipse/index.html -->
<link rel="stylesheet" href="../../../../assets/nav.css">
<script src="../../../../assets/nav.js" defer></script>
<link rel="stylesheet" href="../../deepdive.css">
...
<script>window.NG_DEEPDIVE_SRC = "../../CPU.Architectures/eventide.CPU.solar_eclipse.html";</script>
<script src="../../deepdive.js" defer></script>
```

`deepdive.js` fetches the fragment, inlines its styles and body, and fixes relative media paths. To add a new deep dive, copy an existing stub into a new route folder and point `NG_DEEPDIVE_SRC` at the new fragment. This pattern can be reused for any future product that assembles pages from multiple source files.

## Navigation Features

### Desktop View
- **Collapsible Sidebar**: 52px rail, expands to 280px on hover/focus (overlays page content)
- **Nested Categories**: Click category headers to expand/collapse subcategories
- Active page and its ancestor categories are expanded/highlighted automatically on load
- Smooth transitions

### Mobile View (≤900px)
- Sidebar slides in from left
- Floating "Menu" toggle button (top-right)
- Full-height overlay

### Keyboard Accessibility
- Navigation expands on `focusin` and collapses on `focusout` (desktop)
- Collapsible category/subcategory controls expose `aria-expanded`
- The active link exposes `aria-current="page"`
- Menu button exposes `aria-controls` and `aria-expanded`

## Path Structure Convention

```
/{Company}/{Product}/{Category?}/{Item?}/
```

**Examples:**
- Main brochure: `/Intel/Eventide/`
- Category page: `/Intel/Eventide/CPU/SolarEclipse/`
- Material spec: `/ASUS/Ceralumenesium/`

**Naming Convention:**
- Route folders: exactly as they should appear in the URL (case-sensitive on GitHub Pages)
- Content fragment folders keep their historical names (`CPU.Architectures/`, `CPU.SKU/`, ...) and never collide with route folders (`CPU/`, `SKU/`, ...)

## CSS Variables

Customize appearance by modifying these CSS variables in `assets/nav.css`:

```css
:root {
  --ng-sidebar-width: 280px;            /* Expanded sidebar width */
  --ng-sidebar-width-collapsed: 52px;   /* Collapsed sidebar width */
  --ng-accent: #4da3ff;                 /* Highlight color */
  --ng-accent-2: #f0b848;               /* Secondary accent (company headers) */
  --ng-border: #20314f;                 /* Border color */
  --ng-text: #e7edf9;                   /* Text color */
  --ng-muted: #8da0bd;                  /* Muted text */
}
```

## Navigation CSS Classes

```css
.ng-sidebar          /* Injected sidebar container */
.cat-header          /* Company-level header (Intel, Sony, ASUS) */
.cat-items           /* Container for company's products */
.nav-item            /* Page link */
.sub-cat-header      /* Subcategory header (CPU, GPU, Tiles) */
.sub-cat-items       /* Container for subcategory items */
.nav-item.nested     /* Nested page links (3rd level) */
.mini-sub-cat-header /* SKU family header (Core 500, Core i500, ...) */
.ng-menu-toggle      /* Floating mobile menu button */
```

## Current Structure

### Intel - Eventide
- **Main Page**: Eventide Platform Overview
- **CPU Architectures**: Solar Eclipse, Sunset Cove, Venusmont, Lunar Eclipse, Darkmont
- **Products**: Core 500 / i500 / u500 / x500 SKU sheets
- **GPU Architectures**: Elementalist, Druid, 2D Kanvas
- **Tiles**: ZAM, HNPU, LPNPU, GNA, BionzXR, MFX, IPU, Klangkerne, Display, KillerS1, IO, PSM
- **Technologies**: Thread Director, Sonoral, AcoustX

### Sony
- Alpha 0 (a0)
- XCD-LED
- CRT-VR

### ASUS
- Ceralumenesium Sapphire Material

### Bang & Olufsen
- wH105 (`/BangOlufsen/wH105/`)

### Aerospace division
- STARSCRAMMER™ (`/Aerospace/STARSCRAMMER/`)

## Future Enhancements

The modular structure allows for easy implementation of:

1. **Search functionality**: Filter navigation by keyword
2. **Favorites/Bookmarks**: User-saved brochure links
3. **Recently Viewed**: Auto-populated based on history
4. **Company logos**: SVG icons in category headers
5. **Breadcrumb navigation**: Show current location in hierarchy

## Supported Future Companies

Based on `NewGenLogo.svg` assets:
- Bang & Olufsen
- NewGen (proprietary platforms)
- (Additional companies as defined in logo assets)

**Note**: LightMatter is excluded as per original requirements.
