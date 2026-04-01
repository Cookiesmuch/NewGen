# Navigation System Documentation

## Overview

The NewGen dynamic loader now uses a modular sidebar navigation system with collapsible company categories. This makes it easy to add new companies and brochures without modifying the UI code.

## Architecture

### Key Components

1. **Sidebar Navigation**: Collapsible categories organized by company
2. **Responsive Design**: Mobile-friendly with hamburger menu toggle
3. **Modular Structure**: Easy to extend with new companies/products

### File Structure

```
index.html
├── CSS Grid Layout (sidebar + content area)
├── PAGES Registry (route → source mapping)
├── NAV_STRUCTURE (company → products mapping)
└── Dynamic Navigation Builder
```

## Adding New Companies/Brochures

### Step 1: Add the Route to PAGES Array

In `index.html`, add your new brochure route to the `PAGES` array:

```javascript
const PAGES = [
  // Main brochure pages
  { path: '/Intel/Eventide', src: '/Source/INTEL/Eventide/intel.eventide.brochure.html' },
  { path: '/Sony/ILCE-0',    src: '/Source/SONY/ILCE-0/sony.a0.brochure.html' },
  { path: '/Sony/XCD-LED',   src: '/Source/SONY/XCD-LED/sony,XCDLED.brochure.html' },
  { path: '/ASUS/Ceralumenesium', src: '/Source/ASUS/Material/Ceraluminesium/asus.ceraluminesium.brochure.html' },

  // Add your new brochure here:
  { path: '/BangOlufsen/BeosoundA9', src: '/Source/BANGOLUFSEN/Audio/beosound.a9.brochure.html' },

  // Deep dive pages...
];
```

### Step 2: Add to Navigation Structure

Update the `NAV_STRUCTURE` object to include your company/product in the sidebar:

```javascript
const NAV_STRUCTURE = {
  'Intel': [
    { label: 'Eventide', path: '/Intel/Eventide' }
  ],
  'Sony': [
    { label: 'Alpha 0 (a0)', path: '/Sony/ILCE-0' },
    { label: 'XCD-LED', path: '/Sony/XCD-LED' }
  ],
  'ASUS': [
    { label: 'Ceralumenesium Sapphire', path: '/ASUS/Ceralumenesium' }
  ],
  'Bang & Olufsen': [
    { label: 'Beosound A9', path: '/BangOlufsen/BeosoundA9' }
  ]
};
```

### Step 3: Create Your Brochure File

Create your brochure HTML file following the existing patterns:

```
/Source/BANGOLUFSEN/Audio/beosound.a9.brochure.html
```

**Naming Convention:**
- Company folder: UPPERCASE (e.g., `INTEL`, `SONY`, `ASUS`)
- Product category folder: PascalCase (e.g., `Eventide`, `Material`, `Audio`)
- HTML file: lowercase with dots (e.g., `beosound.a9.brochure.html`)

## Path Structure Convention

```
/{Company}/{Product}/{Category?}/{Item?}
```

**Examples:**
- Main brochure: `/Intel/Eventide`
- Deep dive: `/Intel/Eventide/CPU/SolarEclipse`
- Material spec: `/ASUS/Ceralumenesium`

## Navigation Features

### Desktop View
- Fixed sidebar (280px width)
- Collapsible company categories
- Active state highlighting
- Smooth transitions

### Mobile View (≤900px)
- Sidebar slides in from left
- Hamburger menu toggle in topbar
- Auto-close after navigation
- Full-height overlay

### CSS Variables

Customize appearance by modifying these CSS variables in `index.html`:

```css
:root {
  --sidebar-width: 280px;      /* Sidebar width */
  --topbar-height: 58px;       /* Header height */
  --accent: #4da3ff;           /* Highlight color */
  --accent-2: #f0b848;         /* Secondary accent (company headers) */
  --border: #20314f;           /* Border color */
  --text: #e7edf9;             /* Text color */
  --muted: #8da0bd;            /* Muted text */
}
```

## Future Enhancements

The modular structure allows for easy implementation of:

1. **Multi-level categories**: Nested product lines within companies
2. **Search functionality**: Filter navigation by keyword
3. **Favorites/Bookmarks**: User-saved brochure links
4. **Recently Viewed**: Auto-populated based on history
5. **Company logos**: SVG icons in category headers

## Current Companies

- **Intel**: Eventide Platform
- **Sony**: Alpha 0 (a0), XCD-LED
- **ASUS**: Ceralumenesium Sapphire Material

## Supported Future Companies

Based on `NewGenLogo.svg` assets:
- Bang & Olufsen
- NewGen (proprietary platforms)
- (Additional companies as defined in logo assets)

**Note**: LightMatter is excluded as per original requirements.
