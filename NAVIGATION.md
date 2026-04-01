# Navigation System Documentation

## Overview

The NewGen dynamic loader uses a **collapsible sidebar navigation** with support for **nested subcategories**. On desktop, the sidebar collapses to a compact rail and expands on hover/focus to save space, and it supports a 4-level hierarchy (Company → Product → Category → Page).

## Architecture

### Key Components

1. **Collapsible Sidebar**: Desktop rail (52px) that expands to 280px on hover/focus
2. **Nested Navigation**: Support for company → product → category → page
3. **Responsive Design**: Mobile-friendly with hamburger menu toggle
4. **Modular Structure**: Easy to extend with new companies/products/subcategories

### Navigation Hierarchy

```
Company (e.g., Intel)
└── Product (e.g., Eventide)
    ├── Main Page (/Intel/Eventide)
    └── Subcategories
        ├── CPU Architectures
        │   ├── Solar Eclipse
        │   ├── Sunset Cove
        │   └── ...
        ├── GPU Architectures
        │   └── ...
        └── Tiles
            └── ...
```

### File Structure

```
index.html
├── CSS Grid Layout (sidebar + content area)
├── PAGES Registry (route → source mapping)
├── NAV_STRUCTURE (hierarchical company/product/subcategory mapping)
└── Dynamic Navigation Builder with nested support
```

## Adding New Companies/Brochures

### Step 1: Add Routes to PAGES Array

In `index.html`, add your new brochure routes to the `PAGES` array:

```javascript
const PAGES = [
  // Main brochure pages
  { path: '/Intel/Eventide', src: '/Source/INTEL/Eventide/intel.eventide.brochure.html' },

  // Add your new brochure:
  { path: '/BangOlufsen/BeosoundA9', src: '/Source/BANGOLUFSEN/Audio/beosound.a9.brochure.html' },

  // Add deep-dive pages if needed:
  { path: '/BangOlufsen/BeosoundA9/Acoustics/TrueImage', src: '/Source/BANGOLUFSEN/Audio/beosound.deepdive.viewer.html' },
];
```

### Step 2: Add to Navigation Structure

Update the `NAV_STRUCTURE` object with nested subcategories:

```javascript
const NAV_STRUCTURE = {
  'Intel': [
    {
      label: 'Eventide',
      path: '/Intel/Eventide',
      subCategories: {
        'CPU Architectures': [
          { label: 'Solar Eclipse', path: '/Intel/Eventide/CPU/SolarEclipse' },
          // ... more items
        ],
        'GPU Architectures': [
          { label: 'Elementalist', path: '/Intel/Eventide/GPU/Elementalist' },
          // ... more items
        ]
      }
    }
  ],
  'Bang & Olufsen': [
    {
      label: 'Beosound A9',
      path: '/BangOlufsen/BeosoundA9',
      subCategories: {
        'Acoustics': [
          { label: 'TrueImage Technology', path: '/BangOlufsen/BeosoundA9/Acoustics/TrueImage' }
        ],
        'Design': [
          { label: 'Materials', path: '/BangOlufsen/BeosoundA9/Design/Materials' }
        ]
      }
    }
  ]
};
```

### Simple Product Without Subcategories

If a product doesn't have subcategories yet, use the simple format:

```javascript
'Sony': [
  { label: 'Alpha 0 (a0)', path: '/Sony/ILCE-0' },
  { label: 'XCD-LED', path: '/Sony/XCD-LED' }
]
```

### Step 3: Create Your Brochure Files

Create your brochure HTML files following the existing patterns:

```
/Source/BANGOLUFSEN/Audio/beosound.a9.brochure.html
/Source/BANGOLUFSEN/Audio/beosound.deepdive.viewer.html  (if using deep-dives)
```

**Naming Convention:**
- Company folder: UPPERCASE (e.g., `INTEL`, `SONY`, `ASUS`)
- Product category folder: PascalCase (e.g., `Eventide`, `Material`, `Audio`)
- HTML file: lowercase with dots (e.g., `beosound.a9.brochure.html`)

## Navigation Features

### Desktop View
- **Collapsible Sidebar**: Defaults to a 52px rail and expands to 280px on hover/focus
- **Nested Categories**: Click category headers to expand/collapse subcategories
- Active state highlighting at all levels
- Smooth transitions

### Mobile View (≤900px)
- Sidebar slides in from left
- Hamburger menu toggle in topbar
- Auto-close after navigation
- Full-height overlay

### Keyboard Accessibility
- Navigation expands on `focusin` and collapses on `focusout` (desktop)
- Collapsible category/subcategory controls expose `aria-expanded`
- Mobile menu button exposes `aria-controls` and `aria-expanded`

## Path Structure Convention

```
/{Company}/{Product}/{Category?}/{Item?}
```

**Examples:**
- Main brochure: `/Intel/Eventide`
- Category page: `/Intel/Eventide/CPU/SolarEclipse`
- Material spec: `/ASUS/Ceralumenesium`

## CSS Variables

Customize appearance by modifying these CSS variables in `index.html`:

```css
:root {
  --sidebar-width: 280px;               /* Expanded sidebar width */
  --sidebar-width-collapsed: 52px;      /* Collapsed sidebar width */
  --topbar-height: 58px;                /* Header height */
  --accent: #4da3ff;                    /* Highlight color */
  --accent-2: #f0b848;                  /* Secondary accent (company headers) */
  --border: #20314f;                    /* Border color */
  --text: #e7edf9;                      /* Text color */
  --muted: #8da0bd;                     /* Muted text */
}
```

## Navigation CSS Classes

```css
.cat-header          /* Company-level header (Intel, Sony, ASUS) */
.cat-items           /* Container for company's products */
.nav-item            /* Product main page link */
.sub-cat-header      /* Subcategory header (CPU, GPU, Tiles) */
.sub-cat-items       /* Container for subcategory items */
.nav-item.nested     /* Nested page links (3rd level) */
```

## Current Structure

### Intel - Eventide
- **Main Page**: Eventide Platform Overview
- **CPU Architectures**: Solar Eclipse, Sunset Cove, Venusmont, Lunar Eclipse, Darkmont
- **GPU Architectures**: Elementalist, Druid, 2D Kanvas
- **Tiles**: ZAM, HNPU, LPNPU, GNA, BionzXR, MFX, IPU, Klangkerne, Display, KillerS1, IO, PSM
- **Technologies**: Thread Director

### Sony
- Alpha 0 (a0)
- XCD-LED

### ASUS
- Ceralumenesium Sapphire Material

## Future Enhancements

The modular structure allows for easy implementation of:

1. **Multi-level categories**: Already supported up to 3 levels
2. **Search functionality**: Filter navigation by keyword
3. **Favorites/Bookmarks**: User-saved brochure links
4. **Recently Viewed**: Auto-populated based on history
5. **Company logos**: SVG icons in category headers
6. **Breadcrumb navigation**: Show current location in hierarchy

## Supported Future Companies

Based on `NewGenLogo.svg` assets:
- Bang & Olufsen
- NewGen (proprietary platforms)
- (Additional companies as defined in logo assets)

**Note**: LightMatter is excluded as per original requirements.
