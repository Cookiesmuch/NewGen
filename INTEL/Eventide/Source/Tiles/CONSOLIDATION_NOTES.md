# Eventide Deepdive HTML Consolidation Notes

## Status: ALL 11 FILES SANITIZED ✓

All 11 deepdive files have been cleaned up and are ready for integration into the main brochure.

---

## Sanitization Applied

### 1. **HTML Structure Cleanup**
- ✓ Removed `<!DOCTYPE html>` declarations
- ✓ Removed `<html lang="en">` and `</html>` tags
- ✓ Removed entire `<head>` section (meta tags, title, font links)
- ✓ Removed `<body>` and `</body>` tags
- ✓ Files now begin with section comments and start with `<style>` blocks
- ✓ Files end with proper HTML snippet structure (no full document wrapper)

### 2. **CSS Structure Cleanup**
- ✓ Removed `* { }` universal selector rules
- ✓ Removed `body { }` styling rules from all 8 files that had them
- ✓ Removed `--font-display`, `--font-body`, `--font-mono` variables from `:root`
- ✓ Kept all tile-specific color and styling variables in `:root`

### 3. **Section Comments Standardized**
- ✓ All files now start with Z-ANGLE MEMORY pattern comment:
  ```html
  <!-- Z-ANGLE MEMORY: [prefix]-dd- | [Tile Name] Deep-Dive Section -->
  ```
- ✓ Killer S1 maintains its enhanced comment format with full decorative borders

### 4. **Files List with Prefixes & Colors**

| File | Prefix | Accent Color | Theme |
|------|--------|-------------|-------|
| eventide_deepdive_hnpu.html | `hnpu-dd-` | #FF7A35 | Warm Orange |
| eventide_deepdive_lpnpu.html | `lpnpu-dd-` | #60B4FF | Cool Blue |
| eventide_deepdive_gna.html | `gna-dd-` | #4ADEAA | Mint Green |
| eventide_deepdive_bionzxr.html | `bionz-dd-` | #F87171 | Salmon Red |
| eventide_deepdive_mfx.html | `mfx-dd-` | #C084FC | Purple |
| eventide_deepdive_ipu.html | `ipu-dd-` | #60B4FF | Cool Blue |
| eventide_deepdive_klangkerne.html | `klang-dd-` | #F0B848 | Gold |
| eventide_deepdive_display.html | `de-dd-` | #2DD4BF | Teal |
| eventide_deepdive_killer_s1.html | `s1-dd-` | #4ADE80 | Bright Green |
| eventide_deepdive_io.html | `io-dd-` | #A3E635 | Lime |
| eventide_deepdive_psm.html | `psm-dd-` | #FCA5A5 | Rose |

---

## Font Consolidation for Brochure

### Action Required: Update Brochure `<head>`

All files reference the following shared font variables that must be defined in the brochure's main stylesheet:

**Add to brochure's `<head>` section (after existing fonts):**

```html
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**Add to brochure's `:root` CSS block:**

```css
--font-display: 'Bebas Neue', sans-serif;
--font-body: 'Space Grotesk', sans-serif;
--font-mono: 'IBM Plex Mono', monospace;
```

These variables are referenced throughout all 11 deepdive files and will be inherited when the files are merged into the brochure.

---

## Insertion Locations (from file comments)

Each file includes an `/* INSERT LOCATION */` comment or integration note:

- **HNPU**: After Tile Mosaic overview section
- **LPNPU**: After HNPU and its divider
- **GNA**: After LPNPU and its divider
- **BIONZXR**: Section-specific placement
- **MFX**: Media/Video category in brochure
- **IPU**: Image Processing section
- **KLANGKERNE**: Audio Engine section (before Display)
- **DISPLAY**: Display/Output section
- **KILLER S1**: Connectivity/Wireless section
- **I/O**: I/O Controller section
- **PSM**: Security/Platform Management Tile section

---

## File Structure Template (All Files Follow This)

```html
<!-- Z-ANGLE MEMORY: [prefix]-dd- | [Tile] Deep-Dive Section -->

<style>
    :root {
        /* Tile-specific color variables only */
        /* Font variables come from brochure */
    }

    /* All class selectors use [prefix]-dd- prefix */
    .prefix-dd-wrap { ... }
    .prefix-dd-section { ... }
    /* etc */
</style>

<div class="prefix-dd-wrap">
    <div class="prefix-dd-section">
        <!-- Content here -->
    </div>
    <div class="section-divider"></div>
</div>
```

---

## Verification Checklist

- [x] All 11 files cleaned of HTML wrappers
- [x] All 11 files use Z-ANGLE MEMORY section comment format
- [x] All CSS variables scoped properly (tile-specific in `:root`)
- [x] Body styling removed from all files
- [x] Font variables removed from all file `:root` blocks
- [x] All files maintain proper responsive breakpoints
- [x] All files end with `<div class="section-divider"></div>`
- [x] No `<html>`, `<head>`, `<body>` tags remain
- [x] No DOCTYPE declarations remain
- [x] All wrapper divs properly scoped with tile-specific prefixes

---

## Next Steps for Brochure Integration

1. **Update brochure `<head>`** with consolidated font link (see Font Consolidation section above)
2. **Add font variables to brochure `:root`** (see Font Consolidation section above)
3. **Extract `<style>` blocks** from each file and consolidate into brochure `<style>` section
4. **Extract HTML content** (the div blocks) and place at appropriate locations per insertion notes
5. **Test responsive behavior** across breakpoints
6. **Verify color themes** render correctly with brochure's overall design

All files are now ready to be safely merged without HTML structure conflicts!
