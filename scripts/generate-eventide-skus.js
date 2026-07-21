#!/usr/bin/env node
/* ==========================================================================
   Regenerates every Intel/Eventide/SKU/<CODE>/index.html spec sheet with:
   - the shared dark Eventide theme
   - an interactive SVG die map (hover lift-off, click-to-drill)
   - (?) tooltips on glossary terms
   - a derived AFFINITY™ power table (0.5W floor -> up to 2000W Unleashed)
   - a new Audio & Acoustics section (Klangkerne/SoRT/Sonoral/GNA)
   Existing spec data is parsed out of each file (all key/value pairs are
   preserved) and re-bucketed into the new section layout; nothing is lost.
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

const SKU_ROOT = path.join(__dirname, "..", "Intel", "Eventide", "SKU");
const GLOSSARY_TERMS = [
  "FOveros 2.0", "HyperBOOST", "Kache Kore", "AFFINITY", "ZAM", "XMX5", "RTU5",
  "SoRT", "2DKR", "Pluton", "vPro", "Smart Sound Technology", "GNA", "IPU",
  "BionzXR", "Killer", "DirectStorage", "Sonoral", "Thread Director"
];

const SECTION_MAP = {
  essentials: ["Product Collection", "Code Name", "Vertical Segment", "Processor Number",
    "Launch Date", "Lithography (Primary)", "Lithography (Efficiency)", "Lithography (Ancillary)",
    "Tile Interconnect", "Recommended Customer Price"],
  cpu: ["Compute Tiles", "Total UHP Cores (Solar Eclipse)", "Total DP Cores (Sunset Cove)",
    "Total SPE Cores (Venusmont)", "Total UHE Cores (Lunar Eclipse)", "Total LPE Cores (Darkmont)",
    "Total Physical CPU Cores", "Total Logical Threads", "UHP Base Frequency",
    "UHP Max Turbo (TBM 5.0)", "UHP V8 HyperBOOST (peak)", "DP Base Frequency", "DP Max Turbo",
    "SPE Base / Max Turbo", "UHE Base / Max Turbo", "LPE Base / Max Turbo", "Overclocking"],
  cache: ["L0 (UHP, per core)", "L0 (DP, per core)", "L0 (UHE, per core)", "L1 (UHP/DP, per core)",
    "L1 (SPE, per 9-cluster)", "L1 (UHE, per core)", "L1 (LPE, per 4-cluster)", "L2 (UHP, per core)",
    "L2 (DP, per core)", "L2 (SPE, per 9-cluster)", "L2 (UHE, per core)", "L2 (LPE, per 4-cluster)",
    "L3 (Compute tile, shared)", "L3 (LP Island, shared)", "Kache Kore™ L4 / bLLC",
    "Kache Kore™ bLLC", "Total SRAM cache (approx.)"],
  memory: ["Primary Memory Type", "ZAM Architecture", "ZAM Controllers (base)", "ZAM Controllers",
    "Integrated ZAM", "ZAM Bandwidth", "ZAM Latency", "DDR6 Controllers (optional)", "DDR6 Support",
    "Max ZAM Capacity", "Max DDR6 Capacity", "DDR6 Speed", "Max Total Memory", "Memory Architecture",
    "Intel DirectStorage 2.0", "ECC Memory"],
  graphics: ["Primary iGPU", "iGPU Process", "Total Xe5-cores (1× E1080)", "Total Xe5-cores (2× E1080)",
    "Total Xe5-cores (4× E1080)", "Total Xe5-cores (single-tile)", "GPU Boost Clock",
    "XMX5 AI units (total)", "RTU5 Ray Trace Units (total)", "Multi-tile presentation",
    "Dedicated Xe5 Tile Cluster", "VR Support", "LP iGPU", "Arc Druid Xe-cores", "2DKR Node",
    "Max Displays", "Display Outputs", "Max Resolution (eDP 2.0)"],
  ai: ["HNPU (Intel 04A)", "LPNPU (Intel 06E)", "Total System AI TOPS", "QuickSync BionzXR Cores",
    "Encode Codecs (BionzXR)", "Decode Codecs (BionzXR)", "Max Encode Resolution",
    "MFX QuickSync (14A-E)", "IPU Version", "Intel® Gaussian &amp; Neural Accelerator"],
  io: ["PCIe Revision", "Thunderbolt Version", "USB Specification", "WiFi Specification",
    "WiFi Chips", "Bluetooth", "Cellular", "Antenna Support", "Intel® Wake on Voice",
    "Intel® Wake on Wi-Fi (SONAR)"],
  security: ["Intel® vPro®", "Microsoft Pluton", "Intel® Thread Director",
    "Thread Director Tile capabilities", "Intel® Smart Sound Technology",
    "Intel® High Definition Audio"]
};
const POWER_KEYS = ["AFFINITY™ Power System", "Affinity Power System", "TDP (Base / Max Turbo)",
  "Min LP Island TDP", "Processor Graphics TDP"];

const SECTION_TITLES = {
  essentials: "Essentials", cpu: "CPU Specifications", cache: "Cache", memory: "Memory",
  graphics: "Graphics", ai: "AI & Media", io: "I/O & Connectivity", security: "Security & Platform",
  audio: "Audio & Acoustics", power: "Power & AFFINITY™", extra: "Additional Specifications"
};
const SECTION_ORDER = ["essentials", "cpu", "cache", "memory", "graphics", "ai", "audio", "power", "io", "security", "extra"];

function esc(s) { return String(s); }

function num(str) {
  if (!str) return 0;
  const m = String(str).replace(/,/g, "").match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
}

function parseSku(html) {
  const rows = {};
  const re = /<div class="spec-row"><div class="spec-row-key">([\s\S]*?)<\/div><div class="spec-row-val">([\s\S]*?)<\/div><\/div>/g;
  let m;
  while ((m = re.exec(html))) {
    rows[m[1].trim()] = m[2].trim();
  }
  const titleMatch = html.match(/<div class="spec-sku">([\s\S]*?)<\/div>\s*<div class="spec-badges-header">/);
  let name = "", subtitle = "";
  if (titleMatch) {
    const parts = titleMatch[1].split("<br>");
    name = (parts[0] || "").trim();
    subtitle = (parts[1] || "").trim();
  }
  const badges = [];
  const bre = /<span class="badge badge-(\w+)">([^<]*)<\/span>/g;
  while ((m = bre.exec(html))) badges.push({ cls: m[1], text: m[2] });

  return { rows, name, subtitle, badges };
}

function bucketRows(rows) {
  const used = new Set();
  const buckets = {};
  SECTION_ORDER.forEach((s) => (buckets[s] = []));
  for (const sec of Object.keys(SECTION_MAP)) {
    SECTION_MAP[sec].forEach((key) => {
      if (rows[key] != null) {
        buckets[sec].push([key, rows[key]]);
        used.add(key);
      }
    });
  }
  POWER_KEYS.forEach((key) => {
    if (rows[key] != null) { buckets.power.push([key, rows[key]]); used.add(key); }
  });
  Object.keys(rows).forEach((key) => {
    if (!used.has(key)) buckets.extra.push([key, rows[key]]);
  });
  return buckets;
}

function helpButtonFor(key, val) {
  return GLOSSARY_TERMS.find((t) => key.indexOf(t) !== -1) ||
    GLOSSARY_TERMS.find((t) => val.indexOf(t) !== -1);
}

function rowHtml(key, val, glossary) {
  const term = helpButtonFor(key, val);
  let help = "";
  if (term && glossary[term]) {
    help = ` <span class="ev-help-btn" data-term="${term}">?<span class="ev-help-pop">${glossary[term]}</span></span>`;
  }
  return `<div class="ev-row"><div class="ev-row-key">${key}${help}</div><div class="ev-row-val">${val}</div></div>`;
}

function deriveComposition(rows) {
  const computeTiles = Math.round(num(rows["Compute Tiles"]));
  const primaryGpu = rows["Primary iGPU"] || "";
  const hasElementalist = /E\d{3,4}/.test(primaryGpu);
  const gpuMulti = primaryGpu.match(/E\d{3,4}\s*×\s*(\d+)/);
  const gpuTiles = hasElementalist ? (gpuMulti ? parseInt(gpuMulti[1], 10) : 1) : 0;
  const hnpuTOPS = num(rows["HNPU (Intel 04A)"]);
  const lpnpuTOPS = num(rows["LPNPU (Intel 06E)"]);
  const uhp = Math.round(num(rows["Total UHP Cores (Solar Eclipse)"]));
  const dp = Math.round(num(rows["Total DP Cores (Sunset Cove)"]));
  const spe = Math.round(num(rows["Total SPE Cores (Venusmont)"]));
  const uhe = Math.round(num(rows["Total UHE Cores (Lunar Eclipse)"]));
  const lpe = Math.round(num(rows["Total LPE Cores (Darkmont)"]));
  const skuCode = (rows["Processor Number"] || "").trim();
  const suffixMatch = skuCode.match(/(\d{3})([A-Z]+)$/);
  const suffix = suffixMatch ? suffixMatch[2] : "";
  const unlocked = /K/.test(suffix);
  const tdpMatch = (rows["TDP (Base / Max Turbo)"] || "").match(/([\d.]+)\s*W[^/]*\/\s*[^\d]*([\d.]+)\s*W/);
  const baseTdpW = tdpMatch ? parseFloat(tdpMatch[1]) : null;
  const maxTdpW = tdpMatch ? parseFloat(tdpMatch[2]) : null;

  return { computeTiles, gpuTiles, hnpuTOPS, lpnpuTOPS, uhp, dp, spe, uhe, lpe, suffix, unlocked, baseTdpW, maxTdpW };
}

function computeAffinity(c) {
  const floor = 0.5;
  const efficiency = +(floor + 1.4 + c.computeTiles * 0.35 + c.gpuTiles * 0.6 + (c.hnpuTOPS / 256) * 1.0).toFixed(1);
  const balanced = c.baseTdpW || +(8 + c.computeTiles * 6 + c.gpuTiles * 9 + (c.hnpuTOPS / 256) * 10).toFixed(0);
  const performance = c.maxTdpW || +(balanced * 1.8 + c.gpuTiles * 20).toFixed(0);
  const unleashedRaw = Math.round(150 + c.computeTiles * 100 + c.gpuTiles * 350 + 50);
  const unleashed = c.unlocked ? Math.min(2000, unleashedRaw) : null;
  return { floor, efficiency, balanced, performance, unleashed, unlocked: c.unlocked };
}

function affinityTableHtml(a) {
  const rows = [
    ["Supersaver", a.floor + "W", "LP Island only — UHE/LPE cores idle-parked, screen dimmed, all Compute/GPU tiles powered off. The assured minimum running power on battery."],
    ["Efficiency", a.efficiency + "W", "LP Island active for everyday light use (browsing, video) — Compute Tiles and GPU tiles stay parked unless woken by Thread Director."],
    ["Balanced", a.balanced + "W", "Sustained cTDP with Compute Tiles and iGPU active under typical mixed load."],
    ["Performance", a.performance + "W", "Sustained Max Turbo across all active tiles — Compute, GPU and HNPU boosted, thermally gated by Thread Director."],
    ["Unleashed", a.unleashed ? a.unleashed + "W" : "Not available", a.unlocked
      ? "Dock-fed ceiling with liquid-assisted cooling. Scales with Compute Tile and Elementalist GPU tile count — requires a compatible power-delivery dock."
      : "Locked multiplier — this SKU does not expose an Unleashed AFFINITY™ tier. Performance is the sustained ceiling."]
  ];
  const trs = rows.map((r) => `<tr><td>${r[0]}</td><td class="num">${r[1]}</td><td>${r[2]}</td></tr>`).join("");
  return `<table class="ev-tdp-table"><thead><tr><th>AFFINITY™ Profile</th><th>Package Power</th><th>Behavior</th></tr></thead><tbody>${trs}</tbody></table>
<div class="ev-tdp-note">Package power is derived from tile composition (Compute Tiles, Elementalist GPU tiles, HNPU throughput) under Intel's AFFINITY™ power-profile model. Supersaver's 0.5W floor is the assured minimum running power while on battery with the display active; it is not a full system-off state. Unleashed requires a compatible cooling + power-delivery dock and is only exposed on unlocked (K/HK/HKX) SKUs.</div>`;
}

function audioSectionHtml(rows) {
  const smartSound = rows["Intel® Smart Sound Technology"] || "Yes";
  const hdAudio = rows["Intel® High Definition Audio"] || "Yes";
  const items = [
    ["Audio Tile", "Klangkerne + SoRT (3D stacked via Foveros 2.0 hybrid bond)"],
    ["Klangkerne Base Die", "18 mm² · Intel 14A-E · mixer/DSP grid, Tiefton resonator bank, Hallraum output stage"],
    ["SoRT Die (stacked)", "7.2 mm² · Intel 04A · Traversal Engine, Diffraction Unit, Binaural Divergence Unit, IR Assembler"],
    ["Stack Bond", "Foveros 2.0 hybrid bond · 0.4µm pitch · +38µm package height"],
    ["Sonoral™ Runtime", "Software/driver layer programming the SoRT die — 2.67ms hard real-time acoustic block deadline"],
    ["AcoustX™ Platform Brand", "Intel's acoustic ray-tracing platform brand covering SoRT hardware + Sonoral runtime"],
    ["Ray-Traced Frame Cost", "0.0% — SoRT never shares the GPU render path"],
    ["SoRT Power Draw", "~118 mW typical (vs. 1.8W+ CPU-software approximation)"],
    ["Hybrid-Bond Handoff Latency", "0.02 ms (SoRT parametric IR → Klangkerne convolution engine)"],
    ["Intel® Smart Sound Technology", smartSound + " · accelerated by GNA tile"],
    ["Intel® High Definition Audio", hdAudio],
    ["GNA Audio Co-Processor", "GNA 5.0 · always-on noise suppression, wake-word, speaker isolation"]
  ];
  return items.map(([k, v]) => rowHtml(k, v, {})).join("\n");
}

function buildTileConfig(comp) {
  const tiles = [];
  tiles.push({ id: "kachekore" });
  if (comp.computeTiles > 0) tiles.push({ id: "compute", count: comp.computeTiles });
  tiles.push({ id: "lpisland" });
  tiles.push({ id: "hnpu" });
  if (comp.gpuTiles > 0) tiles.push({ id: "gpu", count: comp.gpuTiles });
  tiles.push({ id: "kanvas2d" });
  tiles.push({ id: "zam" });
  tiles.push({ id: "klangkerne" });
  tiles.push({ id: "io" });
  tiles.push({ id: "psm" });
  tiles.push({ id: "killers1" });
  tiles.push({ id: "ipu" });
  tiles.push({ id: "mfx" });
  tiles.push({ id: "gna" });
  tiles.push({ id: "display" });
  tiles.push({ id: "threaddirector" });
  return tiles;
}

function buildTileSpecs(comp, rows, affinity) {
  const specs = {};
  specs.kachekore = [
    { label: "L4 / bLLC Capacity", val: rows["Kache Kore™ L4 / bLLC"] || rows["Kache Kore™ bLLC"] || "—" },
    { label: "L3 (LP Island share)", val: rows["L3 (LP Island, shared)"] || "—" },
    { label: "Total SRAM + L4", val: rows["Total SRAM cache (approx.)"] || "—" },
    { label: "Fabric", val: "FOveros 2.0 · shared by every tile" }
  ];
  if (comp.computeTiles > 0) {
    specs.compute = [
      { label: "Instances", val: comp.computeTiles },
      { label: "UHP Cores / tile", val: Math.round(comp.uhp / comp.computeTiles) },
      { label: "DP Cores / tile", val: Math.round(comp.dp / comp.computeTiles) },
      { label: "SPE Cores / tile", val: Math.round(comp.spe / comp.computeTiles) },
      { label: "UHP Max Turbo", val: rows["UHP Max Turbo (TBM 5.0)"] || "—" },
      { label: "HyperBOOST Peak", val: rows["UHP V8 HyperBOOST (peak)"] || "—" },
      { label: "L3 per tile", val: rows["L3 (Compute tile, shared)"] || "—" }
    ];
  }
  specs.lpisland = [
    { label: "UHE Cores", val: comp.uhe },
    { label: "LPE Cores", val: comp.lpe },
    { label: "LP iGPU", val: rows["LP iGPU"] || "Arc® Druid" },
    { label: "LPNPU", val: comp.lpnpuTOPS + " TOPS" },
    { label: "Min Island TDP", val: rows["Min LP Island TDP"] || affinity.floor + "W" }
  ];
  specs.hnpu = [
    { label: "Throughput", val: comp.hnpuTOPS + " TOPS" },
    { label: "Node", val: "Intel 04A" }
  ];
  if (comp.gpuTiles > 0) {
    specs.gpu = [
      { label: "Instances", val: comp.gpuTiles },
      { label: "Total Xe5-cores", val: rows["Total Xe5-cores (" + comp.gpuTiles + "× E1080)"] || rows["Total Xe5-cores (single-tile)"] || "—" },
      { label: "Boost Clock", val: rows["GPU Boost Clock"] || "—" },
      { label: "XMX5 Units", val: rows["XMX5 AI units (total)"] || "—" },
      { label: "RTU5 Units", val: rows["RTU5 Ray Trace Units (total)"] || "—" }
    ];
  }
  specs.zam = [
    { label: "Max Capacity", val: rows["Max ZAM Capacity"] || "—" },
    { label: "Architecture", val: rows["ZAM Architecture"] || "—" },
    { label: "Controllers", val: rows["ZAM Controllers (base)"] || rows["ZAM Controllers"] || "—" }
  ];
  specs.klangkerne = [
    { label: "Base Die", val: "18 mm² · Intel 14A-E" },
    { label: "SoRT Die", val: "7.2 mm² · Intel 04A" },
    { label: "Frame Cost", val: "0.0%" },
    { label: "SoRT Power", val: "~118 mW" }
  ];
  specs.killers1 = [{ label: "WiFi", val: rows["WiFi Specification"] || "—" }, { label: "Chips", val: rows["WiFi Chips"] || "—" }];
  specs.ipu = [{ label: "Version", val: rows["IPU Version"] || "—" }];
  specs.mfx = [{ label: "Decode", val: rows["MFX QuickSync (14A-E)"] || "—" }];
  specs.display = [{ label: "Max Displays", val: rows["Max Displays"] || "—" }, { label: "Outputs", val: rows["Display Outputs"] || "—" }];
  specs.threaddirector = [{ label: "Capabilities", val: rows["Thread Director Tile capabilities"] || "—" }];
  return specs;
}

function statVal(rows, key, fallback) {
  return rows[key] || fallback || "—";
}

function shortStat(str, unitGuess) {
  if (!str) return "—";
  const m = String(str).match(/^[\d,.]+(\s*[A-Za-z%µ]+)?/);
  return m ? m[0].trim() : (unitGuess || str);
}

function render(dirName, parsed) {
  const rows = parsed.rows;
  const comp = deriveComposition(rows);
  const affinity = computeAffinity(comp);
  const buckets = bucketRows(rows);
  const glossary = {}; // filled at runtime from tile-catalog.js; keep generator self-contained copy:
  const GLOSSARY = require("./eventide-glossary.js");
  Object.assign(glossary, GLOSSARY);

  const sectionsHtml = SECTION_ORDER.map((sec) => {
    let bodyRows;
    if (sec === "audio") {
      bodyRows = audioSectionHtml(rows);
    } else if (sec === "power") {
      bodyRows = buckets.power.map(([k, v]) => rowHtml(k, v, glossary)).join("\n") + affinityTableHtml(affinity);
    } else {
      if (!buckets[sec].length) return "";
      bodyRows = buckets[sec].map(([k, v]) => rowHtml(k, v, glossary)).join("\n");
    }
    const open = sec === "essentials" || sec === "cpu" ? "open" : "";
    const icon = open ? "▲" : "▼";
    return `<div class="ev-section">
  <div class="ev-section-head"><span class="ev-section-head-label">${SECTION_TITLES[sec]}</span><span class="ev-section-head-icon ${open}">${icon}</span></div>
  <div class="ev-section-body ${open}">${bodyRows}</div>
</div>`;
  }).join("\n");

  const fixedBadges = parsed.badges.map((b) => {
    if (b.cls === "purple" && /TOPS AI/i.test(b.text)) {
      const combined = Math.round(comp.hnpuTOPS + comp.lpnpuTOPS);
      return { cls: b.cls, text: combined + " TOPS AI (NPU)" };
    }
    return b;
  });
  const badgesHtml = fixedBadges.map((b) => `<span class="ev-badge ${b.cls}">${b.text}</span>`).join("\n        ");

  const tileConfig = buildTileConfig(comp);
  const tileSpecs = buildTileSpecs(comp, rows, affinity);
  const skuData = JSON.stringify({ tiles: tileConfig, tileSpecs: tileSpecs });

  const cacheTotal = shortStat(statVal(rows, "Total SRAM cache (approx.)"));
  const totalCores = statVal(rows, "Total Physical CPU Cores", "0");
  let maxTurboSrc;
  if (comp.computeTiles > 0) {
    maxTurboSrc = rows["UHP Max Turbo (TBM 5.0)"] || rows["DP Max Turbo"];
  } else {
    const uheTurbo = (rows["UHE Base / Max Turbo"] || "").split("/")[1];
    maxTurboSrc = uheTurbo || rows["DP Max Turbo"] || rows["UHP Max Turbo (TBM 5.0)"];
  }
  const maxTurbo = shortStat(maxTurboSrc);
  const totalTops = shortStat(statVal(rows, "Total System AI TOPS"));

  const depth = "../../../../";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${parsed.name.replace(/<[^>]+>/g, "")} — Eventide Deep Dive</title>
<link rel="stylesheet" href="${depth}assets/nav.css">
<script src="${depth}assets/nav.js" defer><\/script>
<link rel="stylesheet" href="../../deepdive.css">
<link rel="stylesheet" href="../../assets/spec-engine.css">
<style>@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
:root { --font-display:'Bebas Neue',sans-serif; --font-body:'Space Grotesk',sans-serif; --font-mono:'IBM Plex Mono',monospace; }
</style>
</head>
<body>
  <a class="back-button" href="../../">← Back to Overview</a>
  <div id="deepdive-container" class="deepdive-container">
<div class="ev-spec">
  <div class="ev-wrap">
    <div class="ev-header">
      <div class="ev-eyebrow">Intel Corporation · Eventide Architecture · 2028</div>
      <div class="ev-title">${parsed.name}</div>
      <div class="ev-subtitle">${parsed.subtitle}</div>
      <div class="ev-badges">
        ${badgesHtml}
      </div>
    </div>

    <div class="ev-stats">
      <div class="ev-stat"><div class="ev-stat-num">${maxTurbo}</div><div class="ev-stat-label">Max Turbo</div></div>
      <div class="ev-stat"><div class="ev-stat-num">${totalCores}</div><div class="ev-stat-label">Physical Cores</div></div>
      <div class="ev-stat"><div class="ev-stat-num">${totalTops}</div><div class="ev-stat-label">AI TOPS</div></div>
      <div class="ev-stat"><div class="ev-stat-num">${cacheTotal}</div><div class="ev-stat-label">Total Cache</div></div>
    </div>

    <div class="ev-diemap-card">
      <div class="ev-diemap-head">
        <span class="ev-diemap-title">Interactive Die Map — hover to inspect, click to drill in</span>
        <button type="button" class="ev-diemap-reset">← All Tiles</button>
      </div>
      <div class="ev-diemap-svg-wrap"></div>
      <div class="ev-diemap-legend"></div>
      <div class="ev-focus-card"></div>
    </div>

    <div class="ev-spec-sheet">
${sectionsHtml}
    </div>
  </div>
  <div class="ev-footer">Intel, the Intel logo, Core, Core Ultra, Xeon, Arc, Thunderbolt, Killer, vPro, QuickSync, Thread Director, PowerVia, Foveros, and Turbo Boost are trademarks of Intel Corporation or its subsidiaries. Klangkerne, SoRT, Sonoral and AcoustX are trademarks used under the Eventide co-engineering program.<br>Specifications subject to change. Performance and power numbers represent theoretical maximums under ideal conditions; AFFINITY™ power figures are derived from tile composition.<br>${parsed.name.replace(/<[^>]+>/g, "")} · Eventide Generation · Intel Corporation 2028 · All rights reserved.</div>
  <script type="application/json" id="ev-sku-data">${skuData}<\/script>
  <script src="../../assets/tile-catalog.js"><\/script>
  <script src="../../assets/spec-engine.js"><\/script>
</div>
  </div>
</body>
</html>
`;
}

function main() {
  const dirs = fs.readdirSync(SKU_ROOT).filter((d) => fs.statSync(path.join(SKU_ROOT, d)).isDirectory());
  let ok = 0, fail = 0;
  dirs.forEach((dir) => {
    const file = path.join(SKU_ROOT, dir, "index.html");
    if (!fs.existsSync(file)) return;
    try {
      const html = fs.readFileSync(file, "utf8");
      const parsed = parseSku(html);
      if (!Object.keys(parsed.rows).length) { console.error("SKIP (no rows parsed):", dir); fail++; return; }
      const out = render(dir, parsed);
      fs.writeFileSync(file, out, "utf8");
      ok++;
    } catch (e) {
      console.error("FAIL:", dir, e.message);
      fail++;
    }
  });
  console.log(`Generated ${ok} SKU pages, ${fail} failures out of ${dirs.length}.`);
}

main();
