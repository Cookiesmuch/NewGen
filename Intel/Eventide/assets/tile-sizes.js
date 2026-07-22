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

  /* ---- ZAM — the one tile defined by the PACKAGE, not its own footprint:
     at 1TB (4 populated 256GB modules) its row spans the full package
     width, so module width is computed at layout time from the real
     package width. Only height + the 256GB/module constant are fixed. ---- */
  var ZAM_MODULE_GB = 256;
  var ZAM_ROW_H = 4.4 * MM_PX;
  function zamModules(capacityGB) {
    return Math.max(1, Math.round(capacityGB / ZAM_MODULE_GB));
  }

  function sizeOf(id, entry) {
    if (id === "gpu") return elementalistSize(entry.t.xe5);
    if (id === "druid") return druidSize(entry.t.xeCores);
    if (id === "compute") return computeTileSize(entry.t.coresPerTile);
    if (id === "kachekore") return KACHE_KORE_SIZE;
    return SIZES[id] || mm2(4.2, 4.8);
  }

  global.EventideTileSizes = {
    MM_PX: MM_PX,
    elementalistSize: elementalistSize,
    druidSize: druidSize,
    computeTileSize: computeTileSize,
    KACHE_KORE_SIZE: KACHE_KORE_SIZE,
    SIZES: SIZES,
    sizeOf: sizeOf,
    zamModules: zamModules,
    ZAM_ROW_H: ZAM_ROW_H
  };
})(window);
