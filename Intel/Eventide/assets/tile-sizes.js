/* ==========================================================================
   Eventide Tile Size Reference — source of truth for physical tile
   proportions on the die map, in real millimeters (converted to px via
   MM_PX for rendering). Every SKU page renders tiles at sizes derived
   from THIS file, so an E1080 (or an 86-core Compute Tile) is the same
   physical size everywhere it appears across the 58-SKU catalog.

   Two die areas are given explicit mm^2 values in the deep dives:
     - Klangkerne base die: 18 mm^2 (Tile/Klangkerne)
     - SoRT die: 7.2 mm^2 (Tile/Klangkerne)
   Every other tile has no in-lore mm^2 figure, so its footprint here is
   an authored estimate calibrated against those two real numbers and
   against what actually drives its physical size (Xe-core count for
   GPU/Druid, total core count for Compute Tiles, capacity for ZAM).

   Floorplan rule (599HKX, the reference SKU): the four E1080 GPU tiles
   are the single largest thing on the package — in a 2x2 grid they set
   the height of the entire NoC (compute + cache + AI region). Everything
   that is NOT GPU or ZAM packs into the column beside the GPU block,
   built outward from Kache Kore at its center — LP cluster/Compute above,
   HNPU/2DKanvas beside the core, Klangkerne+ancillary I/O below — sized
   so that stack's total height lands close to the GPU column's, instead
   of leaving dead package substrate under a short stack. ZAM is the only
   OTHER tile that spans the GPU column's full width: it is a single
   full-width row beneath the entire NoC (GPU column included), 1TB
   populating all 4 module slots edge-to-edge across that width.
   ========================================================================== */
(function (global) {
  "use strict";

  var MM_PX = 7.4; // render scale: 1mm of die = 7.4px

  function mm(w, h) { return { w: w * MM_PX, h: h * MM_PX }; }

  /* ---- Elementalist (Arc E-series) GPU tiles ----
     E1080 (220 Xe5-cores/tile, GPU_CLASS 8): the reference size, defined
     directly in mm — this is simply the biggest tile on the package.
     Other classes scale off it by sqrt(xe5PerTile / 220) (area scales
     with core count, linear dims scale with its square root). */
  var E1080_MM = { w: 42, h: 40 };
  var E1080_XE5 = 220;
  function elementalistSize(xe5PerTile) {
    var f = Math.sqrt(Math.max(xe5PerTile, 1) / E1080_XE5);
    return mm(E1080_MM.w * f, E1080_MM.h * f);
  }

  /* ---- Compute Tile ----
     86 cores/tile (8 UHP + 6 DP + 72 SPE — the X-line's config) is the
     anchor. Real silicon, not a small controller — but per the actual
     599HKX floorplan, Compute sits in the top-right corner beside GPU,
     geometrically capped by the space between the top of the package and
     Kache Kore's top edge (its bottom edge lands flush on Kache Kore, by
     design — see buildLayout). So height is driven by that geometric
     slot, and WIDTH is what carries the "more cores = more silicon"
     signal, scaling by sqrt(coresPerTile / 86). Clearly smaller than an
     E1080 — hundreds of cores is real, but nowhere near an E1080's
     shader count. */
  var COMPUTE_ANCHOR_CORES = 86;
  var COMPUTE_ANCHOR_W_MM = 26;
  var COMPUTE_FALLBACK_H_MM = 30; // used only if no target height is given (e.g. isolated preview)
  function computeTileSize(coresPerTile, rows, targetHeightPx) {
    rows = rows || 1;
    var f = Math.max(Math.sqrt(Math.max(coresPerTile, 1) / COMPUTE_ANCHOR_CORES), 0.4);
    var gapPx = 6;
    var cellH = targetHeightPx
      ? (targetHeightPx - (rows - 1) * gapPx) / rows
      : mm(0, COMPUTE_FALLBACK_H_MM).h * f;
    return { w: mm(COMPUTE_ANCHOR_W_MM, 0).w * f, h: cellH };
  }

  /* ---- Arc Druid (LP iGPU, Xe4E) ----
     D390 (~14 Xe4E-cores) is the largest configured class — still a
     small always-on tile next to Elementalist/Compute. */
  var DRUID_ANCHOR_MM = { w: 11, h: 10 };
  var DRUID_ANCHOR_CORES = 14;
  function druidSize(xeCores) {
    var f = Math.sqrt(Math.max(xeCores, 1) / DRUID_ANCHOR_CORES);
    return mm(DRUID_ANCHOR_MM.w * f, DRUID_ANCHOR_MM.h * f);
  }

  /* ---- LP Island / BionzXR / HNPU ----
     Fixed footprints — the deep dives don't vary these by SKU tier the
     way GPU/Compute do. */
  var LP_CLUSTER_SIZE = mm(15, 22);
  var HNPU_SIZE = mm(17, 22);
  /* Kache Kore: "somewhat big" per spec -- 4GB of shared bLLC sitting at
     the physical center of the package is real silicon, not a token
     square. Sized bigger than any single top-strip tile, clearly a
     centerpiece. */
  var KACHE_KORE_SIZE = mm(32, 32);

  /* ---- Klangkerne (18 mm^2, given) / SoRT (7.2 mm^2, given) ---- */
  var KLANGKERNE_SIZE = mm(6, 3);
  var SORT_SIZE = mm(3.79, 1.9); // sqrt(7.2/18) linear scale of Klangkerne

  /* ---- 2DKanvas: small, shader-free — a floor size, not a fixed box. ---- */
  var KANVAS_MIN = mm(15, 22);

  /* ---- ZAM ----
     ZAM is the one tile explicitly defined by the PACKAGE, not by its
     own footprint: at 1TB (4 populated 256GB modules) its row spans the
     FULL width of the package — GPU column included — so its module
     width is computed at layout time from the actual package width, not
     from a fixed mm figure here. Only its height and the 256GB/module
     capacity constant are fixed. */
  var ZAM_MODULE_GB = 256;
  var ZAM_ROW_H = 15 * MM_PX;
  function zamModules(capacityGB) {
    return Math.max(1, Math.round(capacityGB / ZAM_MODULE_GB));
  }

  /* ---- Ancillary controller tiles with no in-lore die size ----
     I/O, PSM, Killer S1, IPU, MFX, GNA, Display, Thread Director: one
     shared, modest, uniform footprint each. */
  var ANCILLARY_SIZE = mm(9, 11);

  global.EventideTileSizes = {
    MM_PX: MM_PX,
    elementalistSize: elementalistSize,
    druidSize: druidSize,
    computeTileSize: computeTileSize,
    zamModules: zamModules,
    ZAM_ROW_H: ZAM_ROW_H,
    LP_CLUSTER_SIZE: LP_CLUSTER_SIZE,
    HNPU_SIZE: HNPU_SIZE,
    KACHE_KORE_SIZE: KACHE_KORE_SIZE,
    KLANGKERNE_SIZE: KLANGKERNE_SIZE,
    SORT_SIZE: SORT_SIZE,
    KANVAS_MIN: KANVAS_MIN,
    ANCILLARY_SIZE: ANCILLARY_SIZE
  };
})(window);
