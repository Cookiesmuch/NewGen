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

/* Per-tier base parameters — core COUNTS and per-tile throughput ratings only.
   hnpu is each tier's reference (flagship-suffix) INT2 TOPS rating — the
   flagship X9/HKX's 256 TOPS anchor comes directly from Tile/HNPU. */
const TIER_TABLE = {
  C3: { line: "C", n: 3, computeTiles: 0, cpt: { uhp: 0, dp: 0, spe: 0 }, uhe: 2, lpe: 2, gpuTiles: 0, gpuClass: 0, druid: "D310", hnpu: 40, lpnpu: 12, gna: 4, tdpBase: 12, ipuMp: 32, bionz: 2 },
  C5: { line: "C", n: 5, computeTiles: 0, cpt: { uhp: 0, dp: 0, spe: 0 }, uhe: 3, lpe: 3, gpuTiles: 0, gpuClass: 0, druid: "D330", hnpu: 48, lpnpu: 14, gna: 4, tdpBase: 15, ipuMp: 48, bionz: 2 },
  C7: { line: "C", n: 7, computeTiles: 0, cpt: { uhp: 0, dp: 0, spe: 0 }, uhe: 4, lpe: 4, gpuTiles: 0, gpuClass: 0, druid: "D360", hnpu: 56, lpnpu: 16, gna: 5, tdpBase: 18, ipuMp: 64, bionz: 3 },
  C9: { line: "C", n: 9, computeTiles: 0, cpt: { uhp: 0, dp: 0, spe: 0 }, uhe: 4, lpe: 5, gpuTiles: 0, gpuClass: 0, druid: "D390", hnpu: 64, lpnpu: 18, gna: 5, tdpBase: 22, ipuMp: 64, bionz: 3 },

  I3: { line: "I", n: 3, computeTiles: 1, cpt: { uhp: 2, dp: 2, spe: 8 }, uhe: 2, lpe: 2, gpuTiles: 1, gpuClass: 1, druid: "D310", hnpu: 64, lpnpu: 16, gna: 5, tdpBase: 28, ipuMp: 64, bionz: 4 },
  I5: { line: "I", n: 5, computeTiles: 1, cpt: { uhp: 4, dp: 2, spe: 12 }, uhe: 2, lpe: 3, gpuTiles: 1, gpuClass: 2, druid: "D330", hnpu: 96, lpnpu: 18, gna: 5, tdpBase: 35, ipuMp: 96, bionz: 4 },
  I7: { line: "I", n: 7, computeTiles: 1, cpt: { uhp: 6, dp: 2, spe: 16 }, uhe: 3, lpe: 3, gpuTiles: 1, gpuClass: 3, druid: "D360", hnpu: 120, lpnpu: 20, gna: 6, tdpBase: 45, ipuMp: 128, bionz: 6 },
  I9: { line: "I", n: 9, computeTiles: 1, cpt: { uhp: 8, dp: 2, spe: 20 }, uhe: 3, lpe: 4, gpuTiles: 1, gpuClass: 3, druid: "D390", hnpu: 140, lpnpu: 22, gna: 6, tdpBase: 55, ipuMp: 128, bionz: 6 },

  U3: { line: "U", n: 3, computeTiles: 1, cpt: { uhp: 2, dp: 2, spe: 8 }, uhe: 4, lpe: 4, gpuTiles: 1, gpuClass: 1, druid: "D310", hnpu: 96, lpnpu: 20, gna: 5, tdpBase: 28, ipuMp: 64, bionz: 4 },
  U5: { line: "U", n: 5, computeTiles: 1, cpt: { uhp: 4, dp: 2, spe: 12 }, uhe: 4, lpe: 4, gpuTiles: 1, gpuClass: 4, druid: "D390", hnpu: 160, lpnpu: 24, gna: 6, tdpBase: 37, ipuMp: 96, bionz: 6 },
  U7: { line: "U", n: 7, computeTiles: 1, cpt: { uhp: 6, dp: 2, spe: 16 }, uhe: 4, lpe: 4, gpuTiles: 1, gpuClass: 5, druid: "D390", hnpu: 200, lpnpu: 28, gna: 6, tdpBase: 45, ipuMp: 128, bionz: 6 },
  U9: { line: "U", n: 9, computeTiles: 1, cpt: { uhp: 8, dp: 4, spe: 20 }, uhe: 4, lpe: 4, gpuTiles: 1, gpuClass: 6, druid: "D390", hnpu: 256, lpnpu: 32, gna: 7, tdpBase: 55, ipuMp: 160, bionz: 8 },

  X7: { line: "X", n: 7, computeTiles: 2, cpt: { uhp: 8, dp: 6, spe: 72 }, uhe: 16, lpe: 16, gpuTiles: 4, gpuClass: 8, druid: "D390", hnpu: 224, lpnpu: 80, gna: 7, tdpBase: 45, ipuMp: 201, bionz: 8, lpDruidLabel: "LP" },
  X9: { line: "X", n: 9, computeTiles: 4, cpt: { uhp: 8, dp: 6, spe: 72 }, uhe: 16, lpe: 16, gpuTiles: 4, gpuClass: 8, druid: "D390", hnpu: 256, lpnpu: 88, gna: 8, tdpBase: 55, ipuMp: 201, bionz: 8, lpDruidLabel: "LP" }
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

  const gpuTiles = suffix.noGpu ? 0 : tier.gpuTiles;
  const gpuClassInfo = GPU_CLASS[tier.gpuClass];

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
  const uhpBase = computeTiles ? uhp.base : null;
  const uhpTurbo = computeTiles ? uhp.turbo : null;
  const hyperboost = computeTiles ? uhp.hyperboost : null;
  const dpBase = computeTiles ? dp.base : null;
  const dpTurbo = computeTiles ? dp.turbo : null;
  const speBase = computeTiles ? spe.base : null;
  const speTurbo = computeTiles ? spe.turbo : null;
  const uheBase = uhe.base;
  const uheTurbo = uhe.turbo;
  const lpeBase = lpe.base;
  const lpeTurbo = lpe.turbo;

  const l3PerComputeTile = computeTiles ? COMPUTE_TILE_L3_MB : 0;
  const l3Total = l3PerComputeTile * computeTiles;
  const l3LPIsland = LP_ISLAND_L3_MB;
  const l4KacheGB = KACHE_KORE_BLLC_GB;
  const totalSRAM = round(l3Total + l3LPIsland, 1);

  const xe5PerTile = gpuTiles ? gpuClassInfo.xe5 : 0;
  const xe5Total = xe5PerTile * gpuTiles;
  const shaderPerXe5 = SHADERS_PER_XE5;
  const shaderTotal = xe5Total * shaderPerXe5;
  const gpuBoostClock = gpuTiles ? round(1.9 + tier.n * 0.045 + (unlocked ? 0.15 : 0), 2) : null;
  const xmx5PerXe5 = 8;
  const xmx5Total = xe5Total * xmx5PerXe5;
  const rtu5Total = xe5Total * 4;
  const gpuTOPS = xmx5Total ? round(xmx5Total * 9.6, 0) : 0;

  const druidXeCores = round(4 + tier.n * 1.1, 0);
  const druidShaders = druidXeCores * 256; /* Xe4E is 256 shaders/core — half of Xe5's 512 */
  const druidBoost = round(1.6 + tier.n * 0.03, 2);

  /* tier.hnpu is each tier's flagship-suffix (tdpMult=1.0) INT2 TOPS rating —
     X9/HKX resolves to exactly 256 TOPS, matching Tile/HNPU's reference figure. */
  const hnpuTOPS = round(tier.hnpu * (0.5 + 0.5 * suffix.tdpMult), 0);
  const lpnpuTOPS = tier.lpnpu;
  const gnaTOPS = tier.gna;
  const totalSystemTOPS = hnpuTOPS + lpnpuTOPS + gnaTOPS;

  /* ZAM (Tile/ZAM): base config is always 2× dual-channel ZAM controllers, 2–3 TB/s
     each, 5–6 TB/s aggregate, ~8ns Kache Kore access. ZAM alone caps at 1 TB; higher
     SKUs (Core Ultra 500 / Xeon 500) add a 3rd dual-channel DDR6/LPDDR6X controller
     for up to 1 TB more, for a combined 2 TB ceiling — ZAM is never itself 2 TB. */
  const hasDdr6 = tier.line === "U" || tier.line === "X";
  const zamMaxCapacityGB = computeTiles ? Math.min(1024, 128 * Math.pow(2, Math.min(tier.n === 9 ? 3 : tier.n === 7 ? 2 : 1, 3))) : Math.max(16, tier.n * 4);
  const zamControllers = "2× dual-channel";
  /* Bandwidth scales with suffix power envelope, not tile count — the base 2-controller
     config is universal; lower-power SKUs run the controllers at a reduced clock. */
  const zamBandwidthGBs = round(5500 * (0.5 + 0.5 * suffix.tdpMult), 0);
  const zamLatencyNs = 8;
  const ddr6MaxGB = hasDdr6 ? 1024 : 0;
  const ddr6Speed = 7200 + tier.n * 200 + (unlocked ? 400 : 0);

  const maxDisplays = gpuTiles >= 4 ? 6 : gpuTiles >= 1 ? 4 : 2;
  const maxResW = gpuTiles >= 4 ? 15360 : gpuTiles ? 7680 : 5120;
  const maxResH = gpuTiles >= 4 ? 9600 : gpuTiles ? 4320 : 2880;
  const maxResHz = gpuTiles >= 4 ? 1200 : gpuTiles ? 480 : 240;

  const bionzCores = tier.bionz;
  const ipuMp = tier.ipuMp;

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

  const priceUsd = tier.line === "X" ? null : round(89 + tier.n * 34 + computeTiles * 65 + gpuTiles * 40 + (unlocked ? 60 : 0), 0);

  return {
    code, tierKey, suffixKey, tier, suffix, brand, shortBrand,
    collection: COLLECTION[tier.line], vertical: suffix.vertical, unlocked, form: suffix.form,
    computeTiles, uhpTotal, dpTotal, speTotal, uheCores, lpeCores, totalPhysicalCores, totalThreads,
    uhpPerTile: tier.cpt.uhp, dpPerTile: tier.cpt.dp, spePerTile: tier.cpt.spe,
    uhpBase, uhpTurbo, hyperboost, dpBase, dpTurbo, speBase, speTurbo, uheBase, uheTurbo, lpeBase, lpeTurbo,
    coreSpecs: CORE_SPECS,
    l3PerComputeTile, l3Total, l3LPIsland, l4KacheGB, totalSRAM,
    gpuTiles, gpuModel: gpuTiles ? gpuClassInfo.model : null, xe5PerTile, xe5Total, shaderPerXe5, shaderTotal,
    gpuBoostClock, xmx5Total, rtu5Total, gpuTOPS,
    druidModel: tier.druid + (tier.lpDruidLabel ? " " + tier.lpDruidLabel : ""), druidXeCores, druidShaders, druidBoost,
    hnpuTOPS, lpnpuTOPS, gnaTOPS, totalSystemTOPS,
    zamMaxCapacityGB, zamBandwidthGBs, zamLatencyNs, ddr6MaxGB, ddr6Speed,
    maxDisplays, maxResW, maxResH, maxResHz,
    bionzCores, ipuMp,
    pcieRev, tbVersion, usbSpec, wifiGen, wifiChips, bluetooth, cellular, cellularPresent,
    sortClusters, sortRayBudget, sortMaxSources, totalL2MB,
    tdp: { floor, efficiency, balanced, performance, unleashed, unlocked },
    priceUsd
  };
}

module.exports = { TIER_TABLE, SUFFIX_TABLE, GPU_CLASS, CORE_SPECS, buildModel, parseCode };
