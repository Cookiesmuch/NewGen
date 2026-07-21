/* ==========================================================================
   Eventide Tile Size Reference — source of truth for physical tile
   proportions on the die map.

   Every SKU page renders tiles at sizes derived from THIS file, so an
   E1080 (or a D390, or an 86-core Compute Tile) is the same relative size
   everywhere it appears across the 58-SKU catalog — nothing is re-guessed
   per page.

   Anchor reference (the flagship Core Xeon 9 599HKX, ×4 Elementalist
   E1080 GPU tiles):
     - An E1080's HEIGHT is defined as exactly half the package's usable
       NoC height (the region above the ZAM row). Four E1080s in a 2x2
       grid therefore fill that entire height — which is why the 599HKX's
       GPU column spans top-to-bottom of the NoC.
     - ZAM is drawn as its own full-width row BELOW the NoC. At its
       largest configured capacity (1TB), ZAM's row spans the full
       horizontal width of the package — the same width reference the
       E1080 pair's 2-wide row uses above it. Below 1TB, ZAM keeps the
       same per-module aspect ratio and packs its modules into a 1x4 or
       2x2 arrangement sized to the capacity actually present, rather than
       stretching a smaller module count across the full width.
     - Every other tile is sized relative to those two anchors, scaled by
       whatever physically drives its real footprint (Xe-core count for
       GPU/Druid tiles, total core count for Compute Tiles, capacity for
       ZAM). Tiles the deep dives never gave a die size for (I/O, PSM,
       Killer S1, IPU, MFX, GNA, Display, Thread Director) get a shared,
       modest, uniform footprint — they are small ancillary controllers,
       not tiles with meaningfully-differentiated sizes in-lore.
   ========================================================================== */
(function (global) {
  "use strict";

  /* NoC height anchor: one E1080's height, in die-units. Everything else
     is derived from this number so the whole system scales together if
     it's ever tuned. */
  var NOC_HALF_H = 300;

  /* Elementalist (Arc E-series) GPU tiles: E1080 is the reference class at
     220 Xe5-cores/tile (GPU_CLASS 8 in eventide-sku-model.js). Area (and
     therefore both width and height) scales with sqrt(xe5PerTile / 220) —
     die area scales with transistor/core count, linear dimensions scale
     with its square root. */
  var E1080_XE5 = 220;
  function elementalistSize(xe5PerTile) {
    var f = Math.sqrt(Math.max(xe5PerTile, 1) / E1080_XE5);
    return { w: NOC_HALF_H * 1.05 * f, h: NOC_HALF_H * f };
  }

  /* Arc Druid (LP iGPU, Xe4E): D390 is the largest configured class,
     ~14 Xe4E-cores. Druid is a small always-on tile, never more than
     roughly a third of an E1080's linear size even at its biggest
     configuration. */
  var DRUID_ANCHOR_CORES = 14;
  var DRUID_MAX_LINEAR = NOC_HALF_H * 0.34;
  function druidSize(xeCores) {
    var f = Math.sqrt(Math.max(xeCores, 1) / DRUID_ANCHOR_CORES);
    return { w: DRUID_MAX_LINEAR * f, h: DRUID_MAX_LINEAR * f * 0.94 };
  }

  /* Compute Tile: the X-line's 86-cores/tile config (8 UHP + 6 DP + 72 SPE)
     is the anchor -- the biggest Compute Tile that ships. Smaller-line
     tiles (fewer UHP/DP/SPE per tile) are physically smaller reticles.
     Drawn portrait (taller than wide), matching Intel's own Compute Tile
     floorplan references. */
  var COMPUTE_ANCHOR_CORES = 86;
  var ROW_H = NOC_HALF_H * 0.62; // shared row-height constant — see LP_CLUSTER_SIZE etc below
  var GRID_GAP = 6;
  /* The flagship X-line ships 4 Compute Tiles (86 cores/tile) in a 2x2 grid,
     and that grid's TOTAL height is calibrated to exactly ROW_H — the same
     row height LP Island/BionzXR/Kache Kore/HNPU all share — so the
     flagship's Compute grid sits flush with its row instead of dwarfing or
     undershooting its neighbors. `rows` is how many grid rows this SKU's
     tile count actually resolves to (1 for 1-2 tiles, 2 for 4 tiles), so
     the per-cell height adapts to keep the GRID's total height consistent
     regardless of row count. */
  function computeTileSize(coresPerTile, rows) {
    rows = rows || 1;
    var f = Math.max(Math.sqrt(Math.max(coresPerTile, 1) / COMPUTE_ANCHOR_CORES), 0.55);
    var cellH = ((ROW_H - (rows - 1) * GRID_GAP) / rows) * f;
    return { w: cellH * 0.9, h: cellH };
  }

  /* LP Island / BionzXR / HNPU: fixed-size ancillary tiles -- the deep
     dives don't vary these by SKU tier the way GPU/Compute scale, so they
     get one consistent footprint each, sized relative to the anchors
     above (roughly a third of an E1080's edge). */
  var LP_CLUSTER_SIZE = { w: NOC_HALF_H * 0.30, h: NOC_HALF_H * 0.62 };
  var HNPU_SIZE = { w: NOC_HALF_H * 0.30, h: NOC_HALF_H * 0.62 };

  /* Klangkerne (18 mm^2) / SoRT (7.2 mm^2): real die areas are given in
     the deep dive, so SoRT's linear size is sqrt(7.2/18) = ~0.63x
     Klangkerne's -- it's a small die hybrid-bonded on top, not a
     full-size tile of its own. */
  var KLANGKERNE_SIZE = { w: NOC_HALF_H * 0.44, h: NOC_HALF_H * 0.62 };
  var SORT_SIZE = { w: KLANGKERNE_SIZE.w * 0.62, h: KLANGKERNE_SIZE.h * 0.62 };

  /* 2DKanvas: a small, shader-free tile -- reclaims whatever width is left
     in its row, sized as a floor/minimum rather than a fixed box. */
  var KANVAS_MIN = { w: NOC_HALF_H * 0.40, h: NOC_HALF_H * 0.62 };

  /* ZAM: modules of 256GB each (so 1TB = 4 modules -- matching "1TB is as
     wide as the package" when 4 modules sit in a single row). Below 1TB,
     the same per-module aspect ratio is kept and modules pack 1x4 (wide
     platforms) or 2x2 (narrower ones) rather than stretching to fill. */
  var ZAM_MODULE_GB = 256;
  var ZAM_MODULE_SIZE = { w: NOC_HALF_H * 0.5, h: NOC_HALF_H * 0.30 };
  function zamModules(capacityGB) {
    return Math.max(1, Math.round(capacityGB / ZAM_MODULE_GB));
  }

  /* Ancillary controller tiles with no in-lore die size: I/O, PSM,
     Killer S1, IPU, MFX, GNA, Display, Thread Director. One shared,
     modest, uniform footprint -- small controllers, not differentiated
     silicon in the source material. */
  var ANCILLARY_SIZE = { w: NOC_HALF_H * 0.24, h: NOC_HALF_H * 0.28 };

  global.EventideTileSizes = {
    NOC_HALF_H: NOC_HALF_H,
    elementalistSize: elementalistSize,
    druidSize: druidSize,
    computeTileSize: computeTileSize,
    zamModules: zamModules,
    ZAM_MODULE_SIZE: ZAM_MODULE_SIZE,
    LP_CLUSTER_SIZE: LP_CLUSTER_SIZE,
    HNPU_SIZE: HNPU_SIZE,
    KLANGKERNE_SIZE: KLANGKERNE_SIZE,
    SORT_SIZE: SORT_SIZE,
    KANVAS_MIN: KANVAS_MIN,
    ANCILLARY_SIZE: ANCILLARY_SIZE
  };
})(window);
