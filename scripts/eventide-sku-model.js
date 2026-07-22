"use strict";
/* ==========================================================================
   Eventide SKU parametric model.
   Core clocks and cache sizes below are FIXED architectural constants taken
   directly from the Eventide deep dives (CPU/SolarEclipse, CPU/SunsetCove,
   CPU/Venusmont, CPU/LunarEclipse, CPU/Darkmont) — every SKU containing a
   given core type runs that core at the same base/turbo clock and cache
   size; what varies per SKU is core COUNT (tier table) and power envelope
   (suffix table + AFFINITY model). This mirrors the deep dives, which
   describe each core as a single fixed silicon design, not a per-SKU bin.
   ========================================================================== */

/* Fixed per-core-type specs (from the CPU architecture deep dives). */
const CORE_SPECS = {
  uhp: { base: 2.4, turbo: 6.0, hyperboost: 10.0, smt: false, l0: "96 KB / core", l1: "256 KB / core", l2: "4 MB / core" },
  dp: { base: 2.1, turbo: 5.2, smt: true, l0: "128 KB / core", l1: "256 KB / core", l2: "6 MB / core" },
  spe: { base: 1.8, turbo: 3.6, smt: false, l0: "24 KB / core (cluster-shared)", l1: "128 KB / 9-core cluster", l2: "2 MB / 9-core cluster" },
  uhe: { base: 1.6, turbo: 4.8, smt: false, l0: "48 KB / core", l1: "128 KB / core", l2: "3 MB / core" },
  lpe: { base: 0.8, turbo: 3.0, smt: false, l0: null, l1: "128 KB / 4-core cluster", l2: "1 MB / 4-core cluster" }
};
const COMPUTE_TILE_L3_MB = 12; /* "12 MB / tile · 48 MB total (4 tiles)" — CPU/SolarEclipse, SunsetCove, Venusmont */
const LP_ISLAND_L3_MB = 8; /* "8 MB LP Island Shared L3" — CPU/LunarEclipse */
const KACHE_KORE_BLLC_GB = 4; /* "Kache Kore™ bLLC · 4 GB · APU-shared" — constant across every core deep dive */

/* GPU tile classes: Xe5-core density + product naming per class. 512 shaders/Xe5-core
   is fixed ("double the 256-shader Xe4E" — GPU/Elementalist). */
const GPU_CLASS = {
  0: { model: null, xe5: 0 },
  1: { model: "E310", xe5: 64 },
  2: { model: "E390", xe5: 88 },
  3: { model: "E560", xe5: 128 },
  4: { model: "E390", xe5: 96 },
  5: { model: "E580", xe5: 150 },
  6: { model: "E770", xe5: 176 },
  7: { model: "E980", xe5: 200 },
  8: { model: "E1080", xe5: 220 }
};
const SHADERS_PER_XE5 = 512;

/* Per-tier base parameters. Tile PRESENCE is dictated by the four-tier
   Product Family guide (Intel/Eventide/index.html):

   Core 500 (C)      — no Compute Tile; LP Island (UHE+LPE); Arc Druid iGPU
                       only (no Elementalist); HNPU low + LPNPU 88; no
                       BionzXR; no IPU; ZAM (on-package, fanless).
   Core i500 (I)     — Compute Tile (UHP + DP only, NO SPE); NO LP Island;
                       Arc Druid only (F-suffix = no iGPU at all); NO NPU
                       (HNPU + LPNPU disabled); NO BionzXR; NO ZAM (classic
                       DDR memory); has IPU/2DKR/MFX. A conventional CPU,
                       not a full NoC.
   Core Ultra 500(U) — single Compute Tile (limited SPE); full LP Island;
                       up to ×1 Arc E1080 (X-suffix only); Druid; HNPU 256
                       + LPNPU; BionzXR ≤4; ZAM.
   Core Xeon 500 (X) — up to 4× Compute Tiles (288+ SPE); full LP Island;
                       up to 4× Arc E1080; Druid; HNPU 256 + LPNPU 88; 8×
                       BionzXR; ZAM; vPro + Pluton.

   gpuLow/gpuHigh = Elementalist (E1080-class) tile count for a non-"X"
   suffix vs. an "X" suffix (HX/HKX). "X" means "higher end GPU" per the
   SKU Suffix Reference — that is the ONLY thing that changes the
   Elementalist tile count (HK has fewer than HKX, by design). */
const TIER_TABLE = {
  C3: { line: "C", n: 3, computeTiles: 0, cpt: { uhp: 0, dp: 0, spe: 0 }, uhe: 2, lpe: 2, druid: "D310", elemModel: null, elemXe5: 0, gpuLow: 0, gpuHigh: 0, hnpu: 24, lpnpu: 88, gna: 4, tdpBase: 9, ipuMp: 0, bionz: 0 },
  C5: { line: "C", n: 5, computeTiles: 0, cpt: { uhp: 0, dp: 0, spe: 0 }, uhe: 3, lpe: 3, druid: "D330", elemModel: null, elemXe5: 0, gpuLow: 0, gpuHigh: 0, hnpu: 32, lpnpu: 88, gna: 4, tdpBase: 12, ipuMp: 0, bionz: 0 },
  C7: { line: "C", n: 7, computeTiles: 0, cpt: { uhp: 0, dp: 0, spe: 0 }, uhe: 4, lpe: 4, druid: "D360", elemModel: null, elemXe5: 0, gpuLow: 0, gpuHigh: 0, hnpu: 40, lpnpu: 88, gna: 5, tdpBase: 15, ipuMp: 0, bionz: 0 },
  C9: { line: "C", n: 9, computeTiles: 0, cpt: { uhp: 0, dp: 0, spe: 0 }, uhe: 4, lpe: 5, druid: "D390", elemModel: null, elemXe5: 0, gpuLow: 0, gpuHigh: 0, hnpu: 48, lpnpu: 88, gna: 5, tdpBase: 18, ipuMp: 0, bionz: 0 },

  I3: { line: "I", n: 3, computeTiles: 1, cpt: { uhp: 4, dp: 2, spe: 0 }, uhe: 0, lpe: 0, druid: "D310", elemModel: null, elemXe5: 0, gpuLow: 0, gpuHigh: 0, hnpu: 0, lpnpu: 0, gna: 4, tdpBase: 35, ipuMp: 32, bionz: 0 },
  I5: { line: "I", n: 5, computeTiles: 1, cpt: { uhp: 6, dp: 4, spe: 0 }, uhe: 0, lpe: 0, druid: "D330", elemModel: null, elemXe5: 0, gpuLow: 0, gpuHigh: 0, hnpu: 0, lpnpu: 0, gna: 4, tdpBase: 45, ipuMp: 48, bionz: 0 },
  I7: { line: "I", n: 7, computeTiles: 1, cpt: { uhp: 8, dp: 4, spe: 0 }, uhe: 0, lpe: 0, druid: "D360", elemModel: null, elemXe5: 0, gpuLow: 0, gpuHigh: 0, hnpu: 0, lpnpu: 0, gna: 5, tdpBase: 65, ipuMp: 64, bionz: 0 },
  I9: { line: "I", n: 9, computeTiles: 1, cpt: { uhp: 8, dp: 8, spe: 0 }, uhe: 0, lpe: 0, druid: "D390", elemModel: null, elemXe5: 0, gpuLow: 0, gpuHigh: 0, hnpu: 0, lpnpu: 0, gna: 5, tdpBase: 85, ipuMp: 64, bionz: 0 },

  U3: { line: "U", n: 3, computeTiles: 1, cpt: { uhp: 2, dp: 2, spe: 8 }, uhe: 4, lpe: 4, druid: "D310", elemModel: "E580", elemXe5: 150, gpuLow: 0, gpuHigh: 1, hnpu: 96, lpnpu: 20, gna: 5, tdpBase: 15, ipuMp: 64, bionz: 2 },
  U5: { line: "U", n: 5, computeTiles: 1, cpt: { uhp: 4, dp: 2, spe: 12 }, uhe: 4, lpe: 4, druid: "D330", elemModel: "E770", elemXe5: 176, gpuLow: 0, gpuHigh: 1, hnpu: 160, lpnpu: 24, gna: 6, tdpBase: 18, ipuMp: 96, bionz: 3 },
  U7: { line: "U", n: 7, computeTiles: 1, cpt: { uhp: 6, dp: 2, spe: 16 }, uhe: 4, lpe: 4, druid: "D360", elemModel: "E980", elemXe5: 200, gpuLow: 0, gpuHigh: 1, hnpu: 208, lpnpu: 28, gna: 6, tdpBase: 22, ipuMp: 128, bionz: 4 },
  U9: { line: "U", n: 9, computeTiles: 1, cpt: { uhp: 8, dp: 4, spe: 20 }, uhe: 4, lpe: 4, druid: "D390", elemModel: "E1080", elemXe5: 220, gpuLow: 0, gpuHigh: 1, hnpu: 256, lpnpu: 32, gna: 7, tdpBase: 28, ipuMp: 160, bionz: 4 },

  X7: { line: "X", n: 7, computeTiles: 2, cpt: { uhp: 8, dp: 6, spe: 72 }, uhe: 16, lpe: 16, druid: "D390", elemModel: "E1080", elemXe5: 220, gpuLow: 1, gpuHigh: 2, hnpu: 256, lpnpu: 88, gna: 8, tdpBase: 45, ipuMp: 201, bionz: 8, lpDruidLabel: "LP" },
  X9: { line: "X", n: 9, computeTiles: 4, cpt: { uhp: 8, dp: 6, spe: 72 }, uhe: 16, lpe: 16, druid: "D390", elemModel: "E1080", elemXe5: 220, gpuLow: 2, gpuHigh: 4, hnpu: 256, lpnpu: 88, gna: 8, tdpBase: 55, ipuMp: 201, bionz: 8, lpDruidLabel: "LP" }
};

const BRAND_TEMPLATE = {
  C: (n) => `Intel® Core™ ${n}`,
  I: (n) => `Intel® Core™ i${n}`,
  U: (n) => `Intel® Core™ Ultra ${n}`,
  X: (n) => `Intel® Core™ Xeon® ${n}`
};
const COLLECTION = {
  C: "Intel® Core™ 500 Series Processors (Eventide)",
  I: "Intel® Core™ i-500 Series Processors (Eventide)",
  U: "Intel® Core™ Ultra 500 Series Processors (Eventide)",
  X: "Intel® Core™ Xeon® 500 Series Processors (Eventide)"
};

const SUFFIX_TABLE = {
  /* tdpMult is calibrated so HKX = 1.0 — the flagship Core™ Xeon® 9 599HKX is the
     reference SKU throughout the Eventide deep dives (55W Balanced / 175W Performance
     on-adapter / 2,000W Unleashed-docked; 256 TOPS HNPU). Every other suffix scales
     relative to it. Core clocks themselves are FIXED (see CORE_SPECS) — suffix does
     not change them; only unlocked (K) SKUs can reach Unleashed AFFINITY, where V8
     HyperBOOST and the top Elementalist tile count actually engage. */
  U: { label: "Ultra-Low-Power Mobile", form: "Mobile", unlocked: false, tdpMult: 0.35, wifi: true, cellular: false, vertical: "Mobile (U — Ultra-Low-Power)" },
  H: { label: "Mobile", form: "Mobile", unlocked: false, tdpMult: 0.50, wifi: true, cellular: false, vertical: "Mobile (H — Standard Power)" },
  HX: { label: "High-Performance Mobile", form: "Mobile", unlocked: false, tdpMult: 0.75, wifi: true, cellular: false, vertical: "Mobile (HX — High Performance)" },
  HK: { label: "Unlocked Mobile", form: "Mobile", unlocked: true, tdpMult: 0.85, wifi: true, cellular: false, vertical: "Mobile (HK — Unlocked)" },
  HKX: { label: "Unlocked Mobile Xtreme", form: "Mobile", unlocked: true, tdpMult: 1.0, wifi: true, cellular: false, vertical: "Mobile (HKX — Overclocked, Unlocked, Xtreme)" },
  V: { label: "Efficiency Mobile", form: "Mobile", unlocked: false, tdpMult: 0.3, wifi: true, cellular: true, vertical: "Mobile (V — Efficiency / Always-Connected)" },
  F: { label: "Desktop (No Integrated Graphics)", form: "Desktop", unlocked: false, tdpMult: 0.8, wifi: false, cellular: false, noGpu: true, vertical: "Desktop (F — Requires Discrete Graphics)" },
  T: { label: "Low-Power Desktop", form: "Desktop", unlocked: false, tdpMult: 0.4, wifi: false, cellular: false, vertical: "Desktop (T — Power-Optimized)" }
};

function round(v, d) { const m = Math.pow(10, d || 0); return Math.round(v * m) / m; }

function parseCode(dirName) {
  const m = dirName.match(/^([A-Z])(\d)-\d{3}([A-Z]+)$/);
  if (!m) throw new Error("Unrecognized SKU directory name: " + dirName);
  return { tierKey: m[1] + m[2], suffixKey: m[3] };
}

function buildModel(dirName) {
  const { tierKey, suffixKey } = parseCode(dirName);
  const tier = TIER_TABLE[tierKey];
  const suffix = SUFFIX_TABLE[suffixKey];
  if (!tier || !suffix) throw new Error("No model data for " + dirName);

  const code = dirName;
  const numPart = code.match(/-(\d{3})/)[1];
  const brand = `${BRAND_TEMPLATE[tier.line](tier.n)} ${numPart}${suffixKey} Processor`;
  const shortBrand = `${BRAND_TEMPLATE[tier.line](tier.n)} ${numPart}${suffixKey}`;

  /* Tile presence, straight from the Product Family guide. */
  const line = tier.line;
  const hasLpIsland = line !== "I";                    // Core i500 has no LP Island
  const hasNpu = line !== "I";                         // Core i500 disables HNPU + LPNPU
  const hasBionz = tier.bionz > 0;                     // U / X only
  const hasZam = line !== "I";                         // Core i500 uses classic DDR, no ZAM
  const hasDdr6 = line === "I" || line === "U" || line === "X"; // C is ZAM-only (fanless, on-package)
  const hasIpu = tier.ipuMp > 0;                       // C has no camera pipeline

  /* Elementalist (E1080-class) tile count: only an "X" suffix (HX/HKX) buys
     the higher-end GPU config; C/I lines never carry an Elementalist tile
     (Arc Druid iGPU only), and F removes the iGPU entirely. */
  const highGpu = /X$/.test(suffixKey);
  let gpuTiles = 0;
  if (line === "U" || line === "X") gpuTiles = highGpu ? tier.gpuHigh : tier.gpuLow;
  if (suffix.noGpu) gpuTiles = 0;
  const hasDruid = !suffix.noGpu;                      // F-suffix = no iGPU at all
  const gpuModel = gpuTiles ? tier.elemModel : null;

  const computeTiles = tier.computeTiles;
  const uhpTotal = tier.cpt.uhp * computeTiles;
  const dpTotal = tier.cpt.dp * computeTiles;
  const speTotal = tier.cpt.spe * computeTiles;
  const uheCores = tier.uhe;
  const lpeCores = tier.lpe;
  const totalPhysicalCores = uhpTotal + dpTotal + speTotal + uheCores + lpeCores;
  /* Only DP (Sunset Cove) has SMT (P-SMT, 2T/core) — UHP, SPE, UHE, LPE do not. */
  const totalThreads = uhpTotal + dpTotal * 2 + speTotal + uheCores + lpeCores;

  const unlocked = suffix.unlocked;
  const uhp = CORE_SPECS.uhp, dp = CORE_SPECS.dp, spe = CORE_SPECS.spe, uhe = CORE_SPECS.uhe, lpe = CORE_SPECS.lpe;
  const uhpBase = uhpTotal ? uhp.base : null;
  const uhpTurbo = uhpTotal ? uhp.turbo : null;
  const hyperboost = uhpTotal ? uhp.hyperboost : null;
  const dpBase = dpTotal ? dp.base : null;
  const dpTurbo = dpTotal ? dp.turbo : null;
  const speBase = speTotal ? spe.base : null;
  const speTurbo = speTotal ? spe.turbo : null;
  const uheBase = uheCores ? uhe.base : null;
  const uheTurbo = uheCores ? uhe.turbo : null;
  const lpeBase = lpeCores ? lpe.base : null;
  const lpeTurbo = lpeCores ? lpe.turbo : null;

  const l3PerComputeTile = computeTiles ? COMPUTE_TILE_L3_MB : 0;
  const l3Total = l3PerComputeTile * computeTiles;
  const l3LPIsland = hasLpIsland ? LP_ISLAND_L3_MB : 0;
  const l4KacheGB = KACHE_KORE_BLLC_GB;
  const totalSRAM = round(l3Total + l3LPIsland, 1);

  const xe5PerTile = gpuTiles ? tier.elemXe5 : 0;
  const xe5Total = xe5PerTile * gpuTiles;
  const shaderPerXe5 = SHADERS_PER_XE5;
  const shaderTotal = xe5Total * shaderPerXe5;
  const gpuBoostClock = gpuTiles ? round(1.9 + tier.n * 0.045 + (unlocked ? 0.15 : 0), 2) : null;
  const xmx5PerXe5 = 8;
  const xmx5Total = xe5Total * xmx5PerXe5;
  const rtu5Total = xe5Total * 4;
  const gpuTOPS = xmx5Total ? round(xmx5Total * 9.6, 0) : 0;

  const druidXeCores = hasDruid ? round(4 + tier.n * 1.1, 0) : 0;
  const druidShaders = druidXeCores * 256; /* Xe4E is 256 shaders/core — half of Xe5's 512 */
  const druidBoost = hasDruid ? round(1.6 + tier.n * 0.03, 2) : null;

  /* tier.hnpu is each tier's flagship-suffix (tdpMult=1.0) INT2 TOPS rating —
     X9/HKX resolves to exactly 256 TOPS, matching Tile/HNPU's reference figure.
     Core i500 disables the NPUs entirely. */
  const hnpuTOPS = hasNpu ? round(tier.hnpu * (0.5 + 0.5 * suffix.tdpMult), 0) : 0;
  const lpnpuTOPS = hasNpu ? tier.lpnpu : 0;
  const gnaTOPS = tier.gna;
  const totalSystemTOPS = hnpuTOPS + lpnpuTOPS + gnaTOPS;

  /* ZAM (Tile/ZAM): 2× dual-channel controllers, 2–3 TB/s each, ~8ns Kache
     Kore access. ZAM alone caps at 1 TB; Core Ultra 500 / Xeon 500 add a 3rd
     dual-channel DDR6/LPDDR6X controller for up to 1 TB more (2 TB combined).
     Core 500 is ZAM-only (on-package, fanless); Core i500 is the classic-CPU
     tier — no ZAM at all, conventional DDR6 only. */
  const zamMaxCapacityGB = !hasZam ? 0 : computeTiles ? Math.min(1024, 128 * Math.pow(2, Math.min(tier.n === 9 ? 3 : tier.n === 7 ? 2 : 1, 3))) : Math.max(32, tier.n * 8);
  const zamControllers = "2× dual-channel";
  /* Bandwidth scales with suffix power envelope, not tile count — the base 2-controller
     config is universal; lower-power SKUs run the controllers at a reduced clock. */
  const zamBandwidthGBs = hasZam ? round(5500 * (0.5 + 0.5 * suffix.tdpMult), 0) : 0;
  const zamLatencyNs = 8;
  const ddr6MaxGB = hasDdr6 ? (line === "I" ? 256 : 1024) : 0;
  const ddr6Speed = 7200 + tier.n * 200 + (unlocked ? 400 : 0);

  const maxDisplays = gpuTiles >= 4 ? 6 : gpuTiles >= 1 ? 4 : 2;
  const maxResW = gpuTiles >= 4 ? 15360 : gpuTiles ? 7680 : 5120;
  const maxResH = gpuTiles >= 4 ? 9600 : gpuTiles ? 4320 : 2880;
  const maxResHz = gpuTiles >= 4 ? 1200 : gpuTiles ? 480 : 240;

  const bionzCores = tier.bionz;
  const ipuMp = hasIpu ? tier.ipuMp : 0;

  const pcieRev = gpuTiles >= 4 ? "PCIe 7.0" : "PCIe 6.0";
  const tbVersion = suffix.form === "Desktop" ? "Thunderbolt 6 (host, optional)" : "Thunderbolt 6";
  const usbSpec = tier.line === "C" ? "USB4 Gen 3×2 (40 Gbps)" : "USB4 Gen 4×2 (80 Gbps)";
  const wifiGen = suffix.wifi ? "Intel® Killer™ Wi-Fi 7 (802.11be)" : "Not present (Killer S1 tile disabled)";
  const wifiChips = suffix.wifi ? (tier.line === "X" ? "2× X1 chips (8 bands total)" : "1× X1 chip (4 bands)") : "—";
  const bluetooth = suffix.wifi ? "Bluetooth Core 6.2" : "—";
  /* Killer S1 cellular ships on every line except Core i- (the traditional-PC line, no cellular
     modem by design) — not gated on the V suffix alone. Still requires the Killer S1 tile itself
     (suffix.wifi) to be present. */
  const cellularPresent = suffix.wifi && tier.line !== "I";
  const cellular = cellularPresent ? "5G Sub-6 / mmWave, 4G LTE, VoLTE" : "Not present";

  /* SoRT (Tile/Klangkerne + Technology/Sonoral): fixed-function cluster count and ray budget
     scale by tier class — "Core 500" tiers run 1 cluster, "Laptop-class" (Core i-/Ultra-) run 2,
     "Xeon 500" runs 4. Feature set is uniform across all tiers; only ray budget scales. */
  const sortClusters = tier.line === "C" ? 1 : tier.line === "X" ? 4 : 2;
  const sortRayBudget = sortClusters * 6144;
  const sortMaxSources = sortClusters * 64;

  /* Total L2 across every core type present, for the CPU Specifications "Total L2 Cache" row. */
  const totalL2MB = round(
    (computeTiles ? uhpTotal * 4 + dpTotal * 6 + speTotal * (2 / 9) : 0) +
    uheCores * 3 + lpeCores * (1 / 4),
    1
  );

  /* Calibrated against Eventide's official AFFINITY™ envelopes (Intel/Eventide/index.html):
     On Battery 0.5–45W (Supersaver/Efficiency live here), On Adapter 15–175W (Balanced/
     Performance), Docked up to 2,000W (Unleashed, unlocked SKUs only). The flagship
     Core™ Xeon® 9 599HKX is the reference point: Balanced 55W, Performance 175W,
     Unleashed 2,000W. */
  const floor = 0.5;
  const efficiency = round(floor + 1.0 + computeTiles * 0.3 + gpuTiles * 0.5 + (hnpuTOPS / 256) * 0.9, 1);
  const balanced = round(tier.tdpBase * suffix.tdpMult, 0);
  const performance = round(balanced * (1.7 + computeTiles * 0.1) + gpuTiles * 15, 0);
  const unleashedRaw = Math.round(150 + computeTiles * 100 + gpuTiles * 350 + 50);
  const unleashed = unlocked ? Math.min(2000, unleashedRaw) : null;

  const priceUsd = round(
    line === "X"
      ? 1200 + tier.n * 120 + computeTiles * 900 + gpuTiles * 700 + (unlocked ? 800 : 0)
      : 89 + tier.n * 34 + computeTiles * 55 + gpuTiles * 260 + hnpuTOPS * 0.4 + (unlocked ? 60 : 0),
    0);

  return {
    code, tierKey, suffixKey, tier, suffix, brand, shortBrand,
    collection: COLLECTION[tier.line], vertical: suffix.vertical, unlocked, form: suffix.form,
    line, hasLpIsland, hasNpu, hasBionz, hasZam, hasDdr6, hasIpu, hasDruid,
    computeTiles, uhpTotal, dpTotal, speTotal, uheCores, lpeCores, totalPhysicalCores, totalThreads,
    uhpPerTile: tier.cpt.uhp, dpPerTile: tier.cpt.dp, spePerTile: tier.cpt.spe,
    uhpBase, uhpTurbo, hyperboost, dpBase, dpTurbo, speBase, speTurbo, uheBase, uheTurbo, lpeBase, lpeTurbo,
    coreSpecs: CORE_SPECS,
    l3PerComputeTile, l3Total, l3LPIsland, l4KacheGB, totalSRAM,
    gpuTiles, gpuModel, xe5PerTile, xe5Total, shaderPerXe5, shaderTotal,
    gpuBoostClock, xmx5Total, rtu5Total, gpuTOPS,
    druidModel: tier.druid + (tier.lpDruidLabel ? " " + tier.lpDruidLabel : ""), druidXeCores, druidShaders, druidBoost,
    hnpuTOPS, lpnpuTOPS, gnaTOPS, totalSystemTOPS,
    zamMaxCapacityGB, zamControllers, zamBandwidthGBs, zamLatencyNs, ddr6MaxGB, ddr6Speed,
    maxDisplays, maxResW, maxResH, maxResHz,
    bionzCores, ipuMp,
    pcieRev, tbVersion, usbSpec, wifiGen, wifiChips, bluetooth, cellular, cellularPresent,
    sortClusters, sortRayBudget, sortMaxSources, totalL2MB,
    tdp: { floor, efficiency, balanced, performance, unleashed, unlocked },
    priceUsd
  };
}

module.exports = { TIER_TABLE, SUFFIX_TABLE, GPU_CLASS, CORE_SPECS, buildModel, parseCode };
