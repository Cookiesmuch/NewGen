/* ==========================================================================
   Eventide Tile Size Reference — the LITERAL physical size of each tile on
   the die, in real NANOMETERS (converted to px via NM_PX for rendering).

   This is the single source of truth, and it is honored EXACTLY: every
   tile renders at precisely this box, on every SKU, every time — no
   stretching to fit a layout. (The renderer used to treat these sizes as
   proportional weights for a treemap split, which meant a "fixed" tile
   like PSM or Thread Director rendered at a different literal size on
   every SKU depending on what shared its row/column. spec-engine.js now
   does real shelf-packing against these exact boxes instead.)

   Sizing has three independent inputs, all real-world-motivated:
     1. Function/complexity — a bigger, busier tile (Compute, Elementalist
        GPU) is just physically bigger than a small fixed-function one
        (PSM, GNA).
     2. Core count — tiles whose transistor count scales with a real
        parameter (Compute cores, GPU Xe5 count, LP Island UHE+LPE count,
        Atom's MFX/BionzXR core counts) scale by sqrt(count) — area
        tracks the parameter, edge length tracks its square root. Same
        input always produces the same exact box (pure functions).
     3. Process node density (NODE_DENSITY below) — Intel's real node
        roadmap shows the most advanced node isn't always the densest in
        practice: real 14A's headline advantage over 18A is power
        delivery (2nd-gen "PowerDirect" backside power), not raw density,
        which is why fabs keep I/O-class logic on cheaper/older nodes
        even when a denser one exists (see PR discussion for sources).
        Here: 04A (Compute/HNPU/Elementalist GPU) is the density
        baseline; 06E (LP Island/Druid/BionzXR/LPNPU) is modestly larger
        per unit function; 14A-E (every ancillary tile — I/O, PSM,
        Display, GNA, Killer S1, Klangkerne, IPU, MFX, 2DKanvas, Thread
        Director) is the least dense and sized up accordingly.

   Only two die areas are stated in the deep dives:
     - Klangkerne base die: 18 mm^2 (Tile/Klangkerne)
     - SoRT die: 7.2 mm^2 (Tile/Klangkerne)
   Everything else is an authored estimate, calibrated so the biggest
   thing on the package is a single Elementalist GPU tile (an E1080 packs
   thousands of shader ALUs + XMX + RTU — it dwarfs a Compute Tile, even
   one carrying 86 cores), and so relative sizes read true.
   ========================================================================== */
(function (global) {
  "use strict";

  var MM_PX = 19; // render scale: 1mm of die edge = 19px (flagship ~fills the card; smaller SKUs render proportionally smaller)
  var NM_PX = MM_PX / 1000000; // px per nanometer

  function nm2(w, h) { return { w: w * NM_PX, h: h * NM_PX }; }

  /* ---- Process-node density multiplier. Applied uniformly to every
     tile's computed box (formula-derived or fixed) based on its
     tile-catalog.js `node` string. Node strings in the catalog aren't
     perfectly normalized (some carry the full "Intel 04A (0.4nm-class...)"
     description, some just "Intel 04A", ZAM is "Foveros-mounted"), so this
     matches by substring rather than exact string. ---- */
  var NODE_DENSITY = {
    "04A": 1.0,   // densest — Compute, HNPU, Elementalist GPU
    "06E": 1.15,  // efficiency node — LP Island, Druid, BionzXR, LPNPU
    "14A-E": 1.4  // least dense — every ancillary/fixed-function tile
  };
  function nodeDensityFor(nodeStr) {
    if (!nodeStr) return 1.0;
    if (nodeStr.indexOf("04A") !== -1) return NODE_DENSITY["04A"];
    if (nodeStr.indexOf("06E") !== -1) return NODE_DENSITY["06E"];
    if (nodeStr.indexOf("14A-E") !== -1) return NODE_DENSITY["14A-E"];
    return 1.0; // Foveros-mounted (ZAM/LPDDR6X) and other non-node silicon
  }
  function applyDensity(box, nodeStr) {
    var f = nodeDensityFor(nodeStr);
    return { w: box.w * f, h: box.h * f };
  }

  /* ---- Elementalist (Arc E-series) GPU tiles — the largest tiles on the
     package. E1080 (220 Xe5-cores, GPU_CLASS 8) is the reference; other
     classes scale by sqrt(xe5 / 220): area tracks core count, edge length
     tracks its square root. ---- */
  var E1080_NM = { w: 15500000, h: 14500000 };
  var E1080_XE5 = 220;
  function elementalistSize(xe5PerTile) {
    var f = Math.sqrt(Math.max(xe5PerTile, 1) / E1080_XE5);
    return nm2(E1080_NM.w * f, E1080_NM.h * f);
  }

  /* ---- Compute Tile — real silicon (86 cores across 3 architectures +
     12MB L3 on the X-line), but per the actual floorplan clearly SMALLER
     than an E1080: an E1080's shader/RT/XMX count is an order of magnitude
     more transistors. 86-core tile is the anchor; smaller lines scale by
     sqrt(cores / 86). ---- */
  var COMPUTE_ANCHOR_NM = { w: 8400000, h: 8800000 };
  var COMPUTE_ANCHOR_CORES = 86;
  function computeTileSize(coresPerTile) {
    var f = Math.max(Math.sqrt(Math.max(coresPerTile, 1) / COMPUTE_ANCHOR_CORES), 0.5);
    return nm2(COMPUTE_ANCHOR_NM.w * f, COMPUTE_ANCHOR_NM.h * f);
  }

  /* ---- Arc Druid (LP iGPU, Xe4E). D390 (~14 Xe4E-cores) is the largest
     configured class — a small always-on tile. ---- */
  var DRUID_ANCHOR_NM = { w: 5000000, h: 4600000 };
  var DRUID_ANCHOR_CORES = 14;
  function druidSize(xeCores) {
    var f = Math.sqrt(Math.max(xeCores, 1) / DRUID_ANCHOR_CORES);
    return nm2(DRUID_ANCHOR_NM.w * f, DRUID_ANCHOR_NM.h * f);
  }

  /* ---- Kache Kore — 4GB of shared bLLC at the physical center of the
     package. "Somewhat big" — real SRAM area, a clear centerpiece, sized
     between a Compute Tile and an E1080. ---- */
  var KACHE_KORE_NM = { w: 11500000, h: 11000000 };

  /* ---- LP Island — scales by total core count (UHE + LPE) instead of a
     flat constant, so a phone-scale 2+4-core Atom part renders visibly
     smaller than a 16+16-core Xeon 500 LP Island rather than identically.
     Anchored at 32 cores (X-line's UHE+LPE total); everything else scales
     down by sqrt(cores/32), floored at 0.4x so it never vanishes. ---- */
  var LP_ISLAND_ANCHOR_NM = { w: 6600000, h: 8000000 };
  var LP_ISLAND_ANCHOR_CORES = 32;
  function lpIslandSize(totalCores) {
    var f = Math.max(Math.sqrt(Math.max(totalCores, 1) / LP_ISLAND_ANCHOR_CORES), 0.4);
    return nm2(LP_ISLAND_ANCHOR_NM.w * f, LP_ISLAND_ANCHOR_NM.h * f);
  }

  /* ---- MFX — scales by core count only when the caller supplies one
     (Atom tiers only; every other line omits it and keeps the fixed
     default below, unchanged). Anchored at 6 cores == that fixed default,
     so Atom's 2-core MFX renders at sqrt(2/6) ~= 0.58x. ---- */
  var MFX_ANCHOR_NM = { w: 4800000, h: 5400000 };
  var MFX_ANCHOR_CORES = 6;
  function mfxSize(cores) {
    var f = Math.sqrt(Math.max(cores, 1) / MFX_ANCHOR_CORES);
    return nm2(MFX_ANCHOR_NM.w * f, MFX_ANCHOR_NM.h * f);
  }

  /* ---- BionzXR — scales by core count only when the caller supplies one
     (Atom Ultra only — its single-core BionzXR is a phone camera ISP, not
     Core Ultra/Xeon's multi-core media block). Anchored at 8 cores == the
     fixed default below (X-line's max), so a 1-core BionzXR renders at
     sqrt(1/8) ~= 0.35x — "much much smaller." Every other line keeps the
     fixed default, unchanged. ---- */
  var BIONZ_ANCHOR_NM = { w: 6000000, h: 6800000 };
  var BIONZ_ANCHOR_CORES = 8;
  function bionzSize(cores) {
    var f = Math.sqrt(Math.max(cores, 1) / BIONZ_ANCHOR_CORES);
    return nm2(BIONZ_ANCHOR_NM.w * f, BIONZ_ANCHOR_NM.h * f);
  }

  /* ---- Fixed-size tiles (not varied by SKU tier). Every one of these is
     rendered at this EXACT box, before node-density is applied, on every
     single SKU that carries it — see sizeOf(). ---- */
  var SIZES = {
    lpisland:       nm2(6600000, 8000000),
    bionzxr:        nm2(6000000, 6800000),
    hnpu:           nm2(6800000, 8000000),
    kanvas2d:       nm2(5600000, 6600000),
    mfx:            nm2(4800000, 5400000),
    klangkerne:     nm2(5200000, 4200000),   // ~18mm^2-ish, legible floor
    io:             nm2(4400000, 5200000),
    psm:            nm2(4200000, 5000000),
    killers1:       nm2(4600000, 5200000),
    ipu:            nm2(4400000, 5000000),
    gna:            nm2(3800000, 4600000),
    display:        nm2(4200000, 4800000),
    threaddirector: nm2(4400000, 5000000)
  };

  /* ---- Compact phone-scale variants — used only when the tile config
     explicitly flags `compact: true` (Atom's IO tile always; Atom's Killer
     S1 only on single-radio SKUs — the DX flagship's dual instances keep
     the full-size default above, matching Core-series parity). ---- */
  var IO_COMPACT_NM = { w: 2500000, h: 2900000 };     // ~0.56x the default — phone has no/little PCIe
  var KILLERS1_COMPACT_NM = { w: 3100000, h: 3500000 }; // ~0.67x the default — single-radio S1

  /* ---- ZAM / LPDDR6X memory modules — a fixed real physical box, the
     same literal size on every SKU within its memory family. Density (GB
     per module) varies by product line/generation — that's `moduleGB`,
     supplied by the caller — but the housing itself never stretches; only
     the module COUNT (capacityGB / moduleGB) changes what you see. This
     mirrors how real RAM packages work: a stick's physical size doesn't
     grow with the density of the dies stacked inside it.

     Two families, two boxes (they are physically different packages —
     Core's ZAM is a tall Foveros TSV die-stack; Atom's LPDDR6X is a
     smaller phone-class package):

       ZAM_MODULE_NM  — Core / Core Ultra / Xeon 500. CALIBRATED so the
         flagship X9-599HKX's full 2 TB config (8× 256 GB modules) spans
         the flagship's tightly-packed cluster width (~1017px). That
         flagship 8-die line is the stated basis for how big ZAM is; every
         other Core-line SKU uses this same fixed module, so its shorter
         memory row simply covers less of the package (base die takes the
         remainder). 8·w + 7·GAP == 1017px  =>  w ≈ 6.41e6 nm.
       LPDDR6X_MODULE_NM — Atom / Atom Ultra 500. A smaller phone-class
         package (a phone's LPDDR stack is physically far smaller than a
         server ZAM die-stack), sized so a dense Atom's row reads in scale
         with its small logic die rather than dwarfing it. ---- */
  var ZAM_MODULE_NM     = { w: 6414000, h: 5400000 };  // Core ZAM — flagship-calibrated (8 span X9-599HKX cluster)
  var LPDDR6X_MODULE_NM = { w: 5300000, h: 5200000 };  // Atom LPDDR6X — phone-class package
  var ZAM_MODULE_GB = 256; // Core-derived default density; Atom passes its own (phone-realistic) moduleGB
  function zamModuleBox(model) {
    var b = (model === "LPDDR6X") ? LPDDR6X_MODULE_NM : ZAM_MODULE_NM;
    return nm2(b.w, b.h);
  }
  function zamModules(capacityGB, moduleGB) {
    return Math.max(1, Math.round(capacityGB / (moduleGB || ZAM_MODULE_GB)));
  }

  function sizeOf(id, entry) {
    var box;
    if (id === "gpu") box = elementalistSize(entry.t.xe5);
    else if (id === "druid") box = druidSize(entry.t.xeCores);
    else if (id === "compute") box = computeTileSize(entry.t.coresPerTile);
    else if (id === "kachekore") box = nm2(KACHE_KORE_NM.w, KACHE_KORE_NM.h);
    else if (id === "lpisland") box = lpIslandSize(entry.t.cores);
    else if (id === "mfx" && entry.t.cores != null) box = mfxSize(entry.t.cores);
    else if (id === "bionzxr" && entry.t.cores != null) box = bionzSize(entry.t.cores);
    else if (id === "io" && entry.t.compact) box = nm2(IO_COMPACT_NM.w, IO_COMPACT_NM.h);
    else if (id === "killers1" && entry.t.compact) box = nm2(KILLERS1_COMPACT_NM.w, KILLERS1_COMPACT_NM.h);
    else box = SIZES[id] || nm2(4200000, 4800000);
    return applyDensity(box, entry.meta && entry.meta.node);
  }

  global.EventideTileSizes = {
    MM_PX: MM_PX,
    NM_PX: NM_PX,
    elementalistSize: elementalistSize,
    druidSize: druidSize,
    computeTileSize: computeTileSize,
    lpIslandSize: lpIslandSize,
    mfxSize: mfxSize,
    bionzSize: bionzSize,
    KACHE_KORE_SIZE: nm2(KACHE_KORE_NM.w, KACHE_KORE_NM.h),
    SIZES: SIZES,
    sizeOf: sizeOf,
    zamModuleBox: zamModuleBox,
    zamModules: zamModules,
    ZAM_MODULE_GB: ZAM_MODULE_GB
  };
})(window);
