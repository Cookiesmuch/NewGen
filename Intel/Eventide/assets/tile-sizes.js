/* ==========================================================================
   Eventide Tile Size Reference — the LITERAL physical size of each tile on
   the die, in real millimeters (converted to px via MM_PX for rendering).

   This is the single source of truth. The die-map renderer packs tiles by
   these true areas with NO gaps (an area-preserving treemap): every region
   of the package is exactly as large as the total silicon area of the tiles
   inside it, so nothing ever floats over empty substrate. Because the sizes
   are absolute, a small SKU renders as a physically smaller chip than the
   X9-599HKX — that is just true.

   Only two die areas are stated in the deep dives:
     - Klangkerne base die: 18 mm^2 (Tile/Klangkerne)
     - SoRT die: 7.2 mm^2 (Tile/Klangkerne)
   Everything else is an authored estimate in mm, calibrated so the biggest
   thing on the package is a single Elementalist GPU tile (an E1080 packs
   thousands of shader ALUs + XMX + RTU — it dwarfs a Compute Tile, even one
   carrying 86 cores), and so relative sizes read true.
   ========================================================================== */
(function (global) {
  "use strict";

  var MM_PX = 19; // render scale: 1mm of die edge = 19px (flagship ~fills the card; smaller SKUs render proportionally smaller)

  function mm2(w, h) { return { w: w * MM_PX, h: h * MM_PX }; }

  /* ---- Elementalist (Arc E-series) GPU tiles — the largest tiles on the
     package. E1080 (220 Xe5-cores, GPU_CLASS 8) is the reference; other
     classes scale by sqrt(xe5 / 220): area tracks core count, edge length
     tracks its square root. ---- */
  var E1080_MM = { w: 15.5, h: 14.5 };
  var E1080_XE5 = 220;
  function elementalistSize(xe5PerTile) {
    var f = Math.sqrt(Math.max(xe5PerTile, 1) / E1080_XE5);
    return mm2(E1080_MM.w * f, E1080_MM.h * f);
  }

  /* ---- Compute Tile — real silicon (86 cores across 3 architectures +
     12MB L3 on the X-line), but per the actual floorplan clearly SMALLER
     than an E1080: an E1080's shader/RT/XMX count is an order of magnitude
     more transistors. 86-core tile is the anchor; smaller lines scale by
     sqrt(cores / 86). ---- */
  var COMPUTE_ANCHOR_MM = { w: 8.4, h: 8.8 };
  var COMPUTE_ANCHOR_CORES = 86;
  function computeTileSize(coresPerTile) {
    var f = Math.max(Math.sqrt(Math.max(coresPerTile, 1) / COMPUTE_ANCHOR_CORES), 0.5);
    return mm2(COMPUTE_ANCHOR_MM.w * f, COMPUTE_ANCHOR_MM.h * f);
  }

  /* ---- Arc Druid (LP iGPU, Xe4E). D390 (~14 Xe4E-cores) is the largest
     configured class — a small always-on tile. ---- */
  var DRUID_ANCHOR_MM = { w: 5.0, h: 4.6 };
  var DRUID_ANCHOR_CORES = 14;
  function druidSize(xeCores) {
    var f = Math.sqrt(Math.max(xeCores, 1) / DRUID_ANCHOR_CORES);
    return mm2(DRUID_ANCHOR_MM.w * f, DRUID_ANCHOR_MM.h * f);
  }

  /* ---- Kache Kore — 4GB of shared bLLC at the physical center of the
     package. "Somewhat big" — real SRAM area, a clear centerpiece, sized
     between a Compute Tile and an E1080. ---- */
  var KACHE_KORE_SIZE = mm2(11.5, 11.0);

  /* ---- LP Island — scales by total core count (UHE + LPE) instead of a
     flat constant, so a phone-scale 2+4-core Atom part renders visibly
     smaller than a 16+16-core Xeon 500 LP Island rather than identically.
     Anchored at 32 cores (X-line's UHE+LPE total) == the previous fixed
     6.6x8.0mm size, so X-line's rendered die is unchanged; everything else
     scales down by sqrt(cores/32), floored at 0.4x so it never vanishes. ---- */
  var LP_ISLAND_ANCHOR_MM = { w: 6.6, h: 8.0 };
  var LP_ISLAND_ANCHOR_CORES = 32;
  function lpIslandSize(totalCores) {
    var f = Math.max(Math.sqrt(Math.max(totalCores, 1) / LP_ISLAND_ANCHOR_CORES), 0.4);
    return mm2(LP_ISLAND_ANCHOR_MM.w * f, LP_ISLAND_ANCHOR_MM.h * f);
  }

  /* ---- MFX — scales by core count only when the caller supplies one
     (Atom tiers only; every other line omits it and keeps the fixed
     default below, unchanged). Anchored at 6 cores == that fixed default,
     so Atom's 2-core MFX renders at sqrt(2/6) ~= 0.58x. ---- */
  var MFX_ANCHOR_MM = { w: 4.8, h: 5.4 };
  var MFX_ANCHOR_CORES = 6;
  function mfxSize(cores) {
    var f = Math.sqrt(Math.max(cores, 1) / MFX_ANCHOR_CORES);
    return mm2(MFX_ANCHOR_MM.w * f, MFX_ANCHOR_MM.h * f);
  }

  /* ---- BionzXR — scales by core count only when the caller supplies one
     (Atom Ultra only — its single-core BionzXR is a phone camera ISP, not
     Core Ultra/Xeon's multi-core media block). Anchored at 8 cores == the
     fixed default below (X-line's max), so a 1-core BionzXR renders at
     sqrt(1/8) ~= 0.35x — "much much smaller." Every other line keeps the
     fixed default, unchanged. ---- */
  var BIONZ_ANCHOR_MM = { w: 6.0, h: 6.8 };
  var BIONZ_ANCHOR_CORES = 8;
  function bionzSize(cores) {
    var f = Math.sqrt(Math.max(cores, 1) / BIONZ_ANCHOR_CORES);
    return mm2(BIONZ_ANCHOR_MM.w * f, BIONZ_ANCHOR_MM.h * f);
  }

  /* ---- Fixed-size tiles (not varied by SKU tier in the deep dives) ---- */
  var SIZES = {
    lpisland:       mm2(6.6, 8.0),
    bionzxr:        mm2(6.0, 6.8),
    hnpu:           mm2(6.8, 8.0),
    kanvas2d:       mm2(5.6, 6.6),
    mfx:            mm2(4.8, 5.4),
    klangkerne:     mm2(5.2, 4.2),   // ~18mm^2-ish, legible floor
    io:             mm2(4.4, 5.2),
    psm:            mm2(4.2, 5.0),
    killers1:       mm2(4.6, 5.2),
    ipu:            mm2(4.4, 5.0),
    gna:            mm2(3.8, 4.6),
    display:        mm2(4.2, 4.8),
    threaddirector: mm2(4.4, 5.0)
  };

  /* ---- Compact phone-scale variants — used only when the tile config
     explicitly flags `compact: true` (Atom's IO tile always; Atom's Killer
     S1 only on single-radio SKUs — the DX flagship's dual instances keep
     the full-size default above, matching Core-series parity). ---- */
  var IO_COMPACT_MM = { w: 2.5, h: 2.9 };     // ~0.56x the default — phone has no/little PCIe
  var KILLERS1_COMPACT_MM = { w: 3.1, h: 3.5 }; // ~0.67x the default — single-radio S1

  /* ---- ZAM — the one tile defined by the PACKAGE, not its own footprint:
     at full capacity (4 populated modules) its row spans the full package
     width, so module width is computed at layout time from the real
     package width. Only height + the per-module-GB constant are fixed.
     LPDDR6X (Atom) SKUs pass a much smaller moduleGB (soldered LPDDR6X
     packages, not ZAM's 256GB stacks) so their module count reads true at
     phone-realistic 8-28GB capacities instead of always rounding to 1. ---- */
  var ZAM_MODULE_GB = 256;
  var ZAM_ROW_H = 4.4 * MM_PX;
  function zamModules(capacityGB, moduleGB) {
    return Math.max(1, Math.round(capacityGB / (moduleGB || ZAM_MODULE_GB)));
  }

  function sizeOf(id, entry) {
    if (id === "gpu") return elementalistSize(entry.t.xe5);
    if (id === "druid") return druidSize(entry.t.xeCores);
    if (id === "compute") return computeTileSize(entry.t.coresPerTile);
    if (id === "kachekore") return KACHE_KORE_SIZE;
    if (id === "lpisland") return lpIslandSize(entry.t.cores);
    if (id === "mfx" && entry.t.cores != null) return mfxSize(entry.t.cores);
    if (id === "bionzxr" && entry.t.cores != null) return bionzSize(entry.t.cores);
    if (id === "io" && entry.t.compact) return mm2(IO_COMPACT_MM.w, IO_COMPACT_MM.h);
    if (id === "killers1" && entry.t.compact) return mm2(KILLERS1_COMPACT_MM.w, KILLERS1_COMPACT_MM.h);
    return SIZES[id] || mm2(4.2, 4.8);
  }

  global.EventideTileSizes = {
    MM_PX: MM_PX,
    elementalistSize: elementalistSize,
    druidSize: druidSize,
    computeTileSize: computeTileSize,
    lpIslandSize: lpIslandSize,
    mfxSize: mfxSize,
    bionzSize: bionzSize,
    KACHE_KORE_SIZE: KACHE_KORE_SIZE,
    SIZES: SIZES,
    sizeOf: sizeOf,
    zamModules: zamModules,
    ZAM_ROW_H: ZAM_ROW_H
  };
})(window);
