#!/usr/bin/env node
/* ==========================================================================
   Generates every Intel/Eventide/SKU/<CODE>/index.html spec sheet from
   scratch, from the parametric model in eventide-sku-model.js. Nothing is
   read from the old pages — every field is freshly derived and internally
   consistent across the 58-SKU catalog. Produces ARK-parity breadth: a
   dedicated section for every GPU tile type, every NPU, and Klangkerne vs
   SoRT are fully separate sections (they are physically stacked but
   functionally independent dies).
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const { buildModel } = require("./eventide-sku-model.js");
const GLOSSARY = require("./eventide-glossary.js");

const SKU_ROOT = path.join(__dirname, "..", "Intel", "Eventide", "SKU");
const GLOSSARY_TERMS = Object.keys(GLOSSARY);

function fmt(n) { return typeof n === "number" ? n.toLocaleString("en-US") : n; }
function gb(n) { return n >= 1024 ? round1(n / 1024) + " TB" : n + " GB"; }
function mbfmt(n) { return n >= 1024 ? round1(n / 1024) + " GB" : n + " MB"; }
function round1(n) { return Math.round(n * 10) / 10; }

function helpButtonFor(key, val) {
  return GLOSSARY_TERMS.find((t) => key.indexOf(t) !== -1) ||
    GLOSSARY_TERMS.find((t) => val.indexOf(t) !== -1);
}
function row(key, val) {
  const term = helpButtonFor(key, String(val));
  let help = "";
  if (term && GLOSSARY[term]) {
    help = ` <span class="ev-help-btn" data-term="${term}">?<span class="ev-help-pop">${GLOSSARY[term]}</span></span>`;
  }
  return `<div class="ev-row"><div class="ev-row-key">${key}${help}</div><div class="ev-row-val">${val}</div></div>`;
}
function rows(pairs) { return pairs.filter((p) => p[1] != null).map((p) => row(p[0], p[1])).join("\n"); }
function capCard(icon, name, desc) {
  return `<div class="ev-cap-card"><div class="ev-cap-icon">${icon}</div><div class="ev-cap-name">${name}</div><div class="ev-cap-desc">${desc}</div></div>`;
}
function capGrid(cards) { return `<div class="ev-cap-grid">${cards.join("\n")}</div>`; }
function intro(text) { return `<div class="ev-section-intro">${text}</div>`; }

/* ---------------------------------------------------------------- Sections */

function sectionEssentials(m) {
  const launchQ = "Q" + (1 + (m.tier.n % 4)) + " 2028";
  return rows([
    ["Product Collection", m.collection],
    ["Code Name", 'Eventide <span class="note">· one-off generation, spiritual successor to Lunar Lake + Panther Lake</span>'],
    ["Processor Number", m.shortBrand],
    ["Vertical Segment", m.vertical],
    ["Status", "Launched"],
    ["Launch Date", launchQ],
    ["Lithography (Primary — Compute)", `Intel 04A (0.4nm-class GaNSi GAA) <span class="note">· Compute Tiles, HNPU, Elementalist GPU</span>`],
    ["Lithography (Efficiency — LP Island)", `Intel 06E (0.6nm-class FinFlex GAA) <span class="note">· LP Island cores, Arc Druid, BionzXR, LPNPU</span>`],
    ["Lithography (Ancillary)", `Intel 14A-E <span class="note">· MFX, IPU, 2DKR, I/O, Klangkerne, PSM, Killer S1, Display, GNA</span>`],
    ["Package Interconnect", "Intel FOveros 2.0 (FiberOptic-VEROS) — photonic; co-developed with Lightmatter (USA)"],
    ["Total Tiles on Package", m.computeTiles + m.gpuTiles + 12 + (m.computeTiles ? 0 : 0)],
    ["Recommended Customer Price", m.priceUsd ? "$" + fmt(m.priceUsd) + " USD" : "Contact OEM <span class=\"note\">(Xeon-class SKU is OEM/SI channel)</span>"]
  ]);
}

function sectionCpu(m) {
  const rowsArr = [
    ["Total Physical Cores", fmt(m.totalPhysicalCores)],
    ["Total Logical Threads", fmt(m.totalThreads)],
    ["Compute Tiles", m.computeTiles],
    ["Total UHP Cores (Solar Eclipse)", m.computeTiles ? fmt(m.uhpTotal) : "Not present"],
    ["Total DP Cores (Sunset Cove)", m.computeTiles ? fmt(m.dpTotal) : "Not present"],
    ["Total SPE Cores (Venusmont)", m.computeTiles ? fmt(m.speTotal) : "Not present"],
    ["Total UHE Cores (Lunar Eclipse)", m.uheCores],
    ["Total LPE Cores (Darkmont)", m.lpeCores],
    ["UHP Base / Max Turbo", m.computeTiles ? `${m.uhpBase} GHz / ${m.uhpTurbo} GHz` : "—"],
    ["UHP V8 HyperBOOST (peak)", m.computeTiles ? `${m.hyperboost} GHz <span class="note">· all 8 UHP cores, Ford-inspired V8 firing sequence 1-4-6-3-8-5-7-2, 8–40ms burst window, Unleashed AFFINITY™ only — requires external PSU + cooler, auto-disabled on battery</span>` : "—"],
    ["DP Base / Max Turbo", m.computeTiles ? `${m.dpBase} GHz / ${m.dpTurbo} GHz` : "—"],
    ["SPE Base / Max Turbo", m.computeTiles ? `${m.speBase} GHz / ${m.speTurbo} GHz` : "—"],
    ["UHE Base / Max Turbo", `${m.uheBase} GHz / ${m.uheTurbo} GHz`],
    ["LPE Base / Max Turbo", `${m.lpeBase} GHz / ${m.lpeTurbo} GHz`],
    ["Overclocking", m.unlocked ? "Yes — UHP, DP, SPE; per-tile granular multiplier unlock" : "No — locked multiplier"],
    ["Instruction Set Extensions", "AVX2, AVX-512 (UHP/DP only), AMX-Tile, AMX-INT8, AMX-BF16, AES-NI, SHA-NI"],
    ["Instruction Set", "64-bit"],
    ["Intel® 64", "Yes"],
    ["Thread Director Scheduling Classes", "5 hardware classes (UHP/DP/SPE/UHE/LPE) + GPU-coupled RT/BVH dispatch class"],
    ["Total L2 Cache", round1(m.totalL2MB) + " MB"],
    ["Processor Base Power", m.tdp.balanced + "W"],
    ["Maximum Turbo Power", m.tdp.performance + "W"],
    ["Intel® Deep Learning Boost (CPU)", m.computeTiles ? "Yes — AMX-INT8, AMX-BF16" : "No"],
    ["AI Software Frameworks Supported (CPU)", "OpenVINO, DirectML, WindowsML, PyTorch, TensorFlow"]
  ];
  if (m.tier.line === "X") {
    rowsArr.push(
      ["Intel® UPI Speed", "24 GT/s"],
      ["Max # of UPI Links", "4"],
      ["High Priority Cores", fmt(Math.round(m.totalPhysicalCores * 0.25))],
      ["High Priority Core Frequency", m.uhpTurbo + " GHz"],
      ["Low Priority Cores", fmt(m.totalPhysicalCores - Math.round(m.totalPhysicalCores * 0.25))],
      ["Low Priority Core Frequency", m.speTurbo + " GHz"]
    );
  }
  return rows(rowsArr);
}

function sectionSupplemental(m) {
  return rows([
    ["Marketing Status", "Launched"],
    ["Embedded Options Available", "No"],
    ["Use Conditions", m.tier.line === "X" ? "Server / Workstation" : "PC / Client"],
    ["Datasheet", "Contact Intel / OEM"]
  ]);
}

function sectionComputeTile(m) {
  return intro(`Every Compute Tile on this SKU is identical — a single reticle carrying three purpose-built core designs side by side. This SKU carries ${m.computeTiles} of them.`) +
    rows([
      ["Tile Instances", m.computeTiles],
      ["Cores per Tile (UHP + DP + SPE)", `${m.uhpPerTile} + ${m.dpPerTile} + ${m.spePerTile} = ${m.uhpPerTile + m.dpPerTile + m.spePerTile}`],
      ["UHP (Solar Eclipse) per Tile", m.uhpPerTile],
      ["DP (Sunset Cove) per Tile", m.dpPerTile],
      ["SPE (Venusmont) per Tile", m.spePerTile],
      ["Process Node", "Intel 04A (0.4nm-class GaNSi GAA)"],
      ["L3 per Tile (shared)", m.l3PerComputeTile + " MB"],
      ["L3 Total (all tiles)", m.l3Total + " MB"],
      ["UHP Max Turbo / HyperBOOST", `${m.uhpTurbo} GHz / ${m.hyperboost} GHz`],
      ["Tile-to-Fabric Interconnect", "FOveros 2.0 photonic · direct link to Kache Kore™ and Thread Director"]
    ]);
}

function sectionLpIsland(m) {
  return intro("The LP Island is present on every Eventide SKU — even fanless, GPU-less parts — and is the last domain to power down. It bundles efficiency cores, the always-on Arc Druid iGPU, BionzXR media encode, and LPNPU inferencing into a single tile.") +
    rows([
      ["UHE Cores (Lunar Eclipse)", m.uheCores],
      ["LPE Cores (Darkmont)", m.lpeCores],
      ["UHE Base / Max Turbo", `${m.uheBase} GHz / ${m.uheTurbo} GHz`],
      ["LPE Base / Max Turbo", `${m.lpeBase} GHz / ${m.lpeTurbo} GHz`],
      ["Process Node", "Intel 06E (0.6nm-class FinFlex GAA)"],
      ["L3 (LP Island, shared)", m.l3LPIsland + " MB"],
      ["Integrated LP iGPU", `Arc® Druid ${m.druidModel} <span class="note">· see dedicated Graphics — Arc Druid section</span>`],
      ["Integrated Media Engine", `QuickSync BionzXR, ${m.bionzCores} cores <span class="note">· see Media & Imaging section</span>`],
      ["Integrated NPU", `LPNPU, ${m.lpnpuTOPS} TOPS <span class="note">· see AI — LPNPU section</span>`],
      ["Minimum Assured Power (Supersaver)", m.tdp.floor + "W"]
    ]);
}

function sectionCache(m) {
  return rows([
    ["L0 (UHP, per core)", m.computeTiles ? "96 KB instruction + 64 KB data" : "—"],
    ["L0 (DP, per core)", m.computeTiles ? "128 KB instruction + 80 KB data" : "—"],
    ["L0 (UHE, per core)", "48 KB instruction buffer"],
    ["L1 (UHP/DP, per core)", m.computeTiles ? "256 KB" : "—"],
    ["L1 (SPE, per 9-core cluster)", m.computeTiles ? "128 KB shared" : "—"],
    ["L1 (UHE, per core)", "128 KB"],
    ["L1 (LPE, per 4-core cluster)", "128 KB shared"],
    ["L2 (UHP, per core)", m.computeTiles ? "4 MB" : "—"],
    ["L2 (DP, per core)", m.computeTiles ? "6 MB" : "—"],
    ["L2 (SPE, per 9-core cluster)", m.computeTiles ? "2 MB shared" : "—"],
    ["L2 (UHE, per core)", "3 MB"],
    ["L2 (LPE, per 4-core cluster)", "1 MB shared"],
    ["L3 (Compute Tile, shared)", m.computeTiles ? `${m.l3PerComputeTile} MB per tile · ${m.l3Total} MB total (${m.computeTiles} tiles)` : "Not present"],
    ["L3 (LP Island, shared)", `${m.l3LPIsland} MB (Kache Kore™ shared)`],
    ["Kache Kore™ L4 / bLLC", `${(m.l4KacheGB + " GB")} <span class="note">· shared cache interposer at the physical center of the package</span>`],
    ["Total SRAM Cache (approx.)", `~${m.totalSRAM} MB SRAM + ${(m.l4KacheGB + " GB")} L4 bLLC`],
    ["Kache Kore™ Round-Trip Latency", `${round1(9 + (m.computeTiles ? 0 : 3))} ns typical`]
  ]);
}

function sectionMemory(m) {
  return rows([
    ["Primary Memory Type", "Intel® Z-Angle Memory (ZAM) · FOveros-mounted on-package memory · base config on every SKU"],
    ["ZAM Architecture", "Vertical-stack, TSV-interconnected chips mounted directly on the FOveros 2.0 substrate"],
    ["ZAM Controllers", m.zamControllers + " ZAM controllers, 2–3 TB/s each"],
    ["Max ZAM Capacity", gb(m.zamMaxCapacityGB) + " + inline ECC"],
    ["ZAM Bandwidth", fmt(m.zamBandwidthGBs) + " GB/s aggregate"],
    ["ZAM Latency (raw)", "~+40% vs GDDR7 <span class=\"note\">· masked for hot data by Kache Kore™ (~8ns)</span>"],
    ["DDR6 / LPDDR6X Support", m.ddr6MaxGB ? "3rd dual-channel controller — Core Ultra 500 / Xeon 500 only" : "Not present on this line — ZAM only"],
    ["Max DDR6 Capacity", m.ddr6MaxGB ? gb(m.ddr6MaxGB) : "Not applicable"],
    ["DDR6 Speed", m.ddr6MaxGB ? "DDR6-" + m.ddr6Speed + " / LPDDR6X-" + (m.ddr6Speed + 800) : "Not applicable"],
    ["Max Total Memory", m.ddr6MaxGB ? "Up to " + gb(m.zamMaxCapacityGB + m.ddr6MaxGB) + " unified (ZAM + DDR6)" : gb(m.zamMaxCapacityGB) + " unified (ZAM only)"],
    ["Max # of Memory Channels", m.ddr6MaxGB ? "2× ZAM + 1× DDR6/LPDDR6X (3 total)" : "2× ZAM"],
    ["Memory Coherency", "Hardware cache coherency across all tiles via FOveros 2.0 · <2ns signalling · zero-copy CPU↔GPU↔NPU"],
    ["Intel DirectStorage 2.0", "NVMe → DDR6 staging → ZAM runtime → Kache Kore™ bLLC hot data"],
    ["ECC Memory Support", "Yes — inline ECC correction on both ZAM and DDR6 paths"]
  ]);
}

function sectionGraphicsElementalist(m) {
  if (!m.gpuTiles) return null;
  return intro(`Arc® Elementalist ${m.gpuModel} — the primary high-performance graphics tile. This SKU carries ${m.gpuTiles} instance${m.gpuTiles > 1 ? "s" : ""}, presented to the OS as a single logical GPU over FOveros 2.0.`) +
    rows([
      ["Graphics Tile", `Intel® Arc® Elementalist ${m.gpuModel}`],
      ["Tile Instances", m.gpuTiles],
      ["Process Node", "Intel 04A"],
      ["Xe5-Cores per Tile", m.xe5PerTile],
      ["Total Xe5-Cores", fmt(m.xe5Total) + (m.gpuTiles > 1 ? ` (${m.gpuTiles}× ${m.xe5PerTile})` : "")],
      ["Shading Units (total)", fmt(m.shaderTotal)],
      ["GPU Boost Clock", m.gpuBoostClock + " GHz"],
      ["XMX5 AI Units (total)", fmt(m.xmx5Total) + ` <span class="note">· ${fmt(m.gpuTOPS)} AI TOPS combined</span>`],
      ["RTU5 Ray Tracing Units (total)", fmt(m.rtu5Total)],
      ["Render Slices (total)", fmt(Math.round(m.xe5Total / 8))],
      ["Xe Vector Engines (total)", fmt(m.xe5Total * 16)],
      ["Multi-Tile Presentation", m.gpuTiles > 1 ? `${m.gpuTiles}× ${m.gpuModel} appear as a single render device via FOveros 2.0 + Thread Director` : "Single tile — native presentation"],
      ["Device ID", "0xE1" + String(m.tier.n).padStart(2, "0") + String(m.gpuTiles).padStart(2, "0")],
      ["VR Support", "Yes — native VRV1 / VRV2 codec hardware"],
      ["DirectX Support", "DirectX 12 Ultimate (FL 12_2)"],
      ["OpenGL / Vulkan Support", "OpenGL 4.6 / Vulkan 1.4"],
      ["OpenCL Support", "OpenCL 3.0"],
      ["oneAPI Support", "Yes — Intel oneAPI / Level Zero"],
      ["OpenVINO Support", "Yes"],
      ["Intel® XeSS Support", "Yes — XeSS 3 (XMX5-accelerated)"],
      ["Media Profiles", "Same codec set as BionzXR — AV2, AV1, H.266/VVC, H.265, H.264, VP9 decode; hardware VR codec transport (VRV1/VRV2)"],
      ["VESA Adaptive Sync", "Yes — Full VRR"],
      ["Max Displays Supported", m.maxDisplays]
    ]);
}

function sectionGraphicsDruid(m) {
  return intro("Arc® Druid is the always-on, low-power iGPU built into every LP Island — capable of driving the full desktop and light 3D without ever spinning up a Compute Tile or an Elementalist GPU tile.") +
    rows([
      ["Graphics Tile", `Intel® Arc® Druid ${m.druidModel}`],
      ["Process Node", "Intel 06E"],
      ["Xe4E-Cores", m.druidXeCores],
      ["Shading Units", fmt(m.druidShaders)],
      ["Boost Clock", m.druidBoost + " GHz"],
      ["Function", "Always-on low-power 3D + desktop composition fallback"],
      ["DirectX Support", "DirectX 12 Ultimate (FL 12_1)"],
      ["Power Envelope", "Min 0.3W standby, max ~3W active"]
    ]);
}

function sectionGraphicsKanvas(m) {
  return intro("2DKanvas (2DKR) is purpose-built 2D silicon — zero 3D ALUs, zero shaders, zero Z-buffers. Every transistor is dedicated to rendering the desktop at sub-millisecond latency for well under a watt, so the 3D GPU tiles can power down entirely at idle.") +
    rows([
      ["Tile", "2DKanvas (2DKR)"],
      ["Process Node", "Intel 14A-E"],
      ["Function", "Dedicated 2D/GUI compositor; no 3D ALUs"],
      ["Blitter Engine", "Modernised hardware blend/scale/composite pipeline"],
      ["Typical Power", "< 1W sustained desktop composition"],
      ["Enables", "Full desktop responsiveness with every 3D GPU tile powered off"]
    ]);
}

function sectionDisplay(m) {
  return rows([
    ["Max Displays Supported", m.maxDisplays + " simultaneous native"],
    ["iDP (Intel Display Protocol) 1.0", `Up to ${fmt(m.maxResW)}×${fmt(m.maxResH)} @ ${m.maxResHz} Hz <span class="note">· in-house eDP derivative over ${m.pcieRev} ×16×3 · up to 2× ports</span>`],
    ["iDP Color Depth", "Up to 96-bit (RGB+MCY)"],
    ["DisplayPort", "DP 2.1b UHBR20"],
    ["eDP", "eDP 1.6"],
    ["HDMI", "HDMI 2.2"],
    ["Codec Transport", "VRV1 / VRV2 over iDP — carries resolutions exceeding raw link bandwidth compressed, without quality loss"],
    ["Variable Refresh Rate", "Full VRR · XCD-LED DIAC"],
    ["HDR Support", "HDR10+ Ultra, Dolby Vision 2 (via BionzXR tone-mapping)"],
    ["Display Stream Compression", "VESA DSC 1.2a"],
    ["Unified Display Engine", "Any GPU tile (Elementalist, Druid, 2DKanvas) can drive any output — no MUX switching, no GPU-to-GPU frame copy"]
  ]);
}

function sectionHnpu(m) {
  return intro("HNPU is the primary high-throughput AI inference tile, fabricated on Intel's leading-edge 04A node, separate from both CPU and GPU tiles.") +
    rows([
      ["Tile", "HNPU (High-Performance NPU)"],
      ["Process Node", "Intel 04A"],
      ["Peak Throughput", fmt(m.hnpuTOPS) + " TOPS"],
      ["Supported Datatypes", "INT2, INT4, INT8, FP8, BF16, FP16, FP32"],
      ["Function", "Primary system AI inference — generative models, vision, background tasks"],
      ["Coordination", "Scheduled by Thread Director alongside LPNPU and GPU XMX5 engines"]
    ]);
}

function sectionLpnpu(m) {
  return intro("LPNPU delivers always-on inferencing — wake-on-voice, presence sensing, and Thread Director's predictive co-pilot — within a sub-1.5W envelope, and never powers down.") +
    rows([
      ["Tile", "LPNPU (Always-On NPU)"],
      ["Process Node", "Intel 06E"],
      ["Peak Throughput", m.lpnpuTOPS + " TOPS"],
      ["Power Envelope", "< 1.5W, always-on"],
      ["Function", "Wake-on-voice, presence sensing, Thread Director predictive co-pilot"]
    ]);
}

function sectionGna(m) {
  return intro("GNA is a milliwatt-class always-on inference tile dedicated to audio intelligence — noise suppression, wake word, and speaker isolation.") +
    rows([
      ["Tile", "GNA 5.0 (Gaussian & Neural Accelerator)"],
      ["Process Node", "Intel 14A-E"],
      ["Peak Throughput", m.gnaTOPS + " TOPS"],
      ["Function", "Intel® Smart Sound Technology acceleration — noise suppression, wake word, speaker isolation"],
      ["Power Envelope", "< 100 mW typical"]
    ]);
}

function sectionKlangkerne(m) {
  return intro("Klangkerne is the base die of Eventide's audio stack — an 18mm² DSP die carrying the mixer/DSP grid, the Tiefton resonator bank and the Hallraum output stage, co-engineered with Bang & Olufsen's acoustic engineering group in Copenhagen.") +
    rows([
      ["Tile", "Klangkerne (Audio DSP Base Die)"],
      ["Die Size", "18 mm²"],
      ["Process Node", "Intel 14A-E"],
      ["Mixer / DSP Grid", "Multi-channel real-time mixing and effects DSP"],
      ["Tiefton Resonator Bank", "Physical-modeling resonance synthesis for spatial reverb"],
      ["Hallraum Output Stage", "Final transducer-matched rendering + codec bridge"],
      ["Stacked Die", `SoRT (Sound Ray Tracing) — hybrid-bonded on top <span class="note">· see dedicated SoRT section</span>`],
      ["Intel® Smart Sound Technology", "Yes — accelerated by the GNA tile"],
      ["Intel® High Definition Audio", "Yes"]
    ]);
}

function sectionSort(m) {
  return intro("SoRT (Sound Ray Tracing) is a dedicated 7.2mm² die hybrid-bonded onto Klangkerne via Foveros 2.0 — the world's first shipping consumer sound-ray-tracing silicon, computing real acoustic reflection and diffraction fields in hardware.") +
    rows([
      ["Tile", "SoRT (Sound Ray Tracing Die)"],
      ["Die Size", "7.2 mm²"],
      ["Process Node", "Intel 04A"],
      ["Bond to Klangkerne", "Foveros 2.0 hybrid bond · 0.4µm pitch · +38µm package height"],
      ["SoRT Clusters", `×${m.sortClusters} <span class="note">· fixed-function pipeline, no shader cores — feature-uniform across tiers, ray budget quantity-scaled</span>`],
      ["Traversal Engine (per cluster)", "96M ray-steps/s · 210 mW peak"],
      ["Diffraction Unit (per cluster)", "2.4M UTD edge-diffraction evaluations/s"],
      ["Binaural Divergence Unit (per cluster)", "512 paths/frame forked · 1.08× ray overhead"],
      ["IR Assembler (per cluster)", "8-frame history · 2,048-tap staging buffer"],
      ["Material LUT (per cluster)", "64 × 8 bands × 16-bit SRAM · 1-cycle access"],
      ["Ray Budget (total)", fmt(m.sortRayBudget) + " ray-paths per 128-sample audio block"],
      ["Max Concurrent Sources", fmt(m.sortMaxSources)],
      ["Real-Time Deadline", "2.67 ms hard deadline per acoustic block (Sonoral™ runtime contract)"],
      ["Typical Power", "~118 mW <span class=\"note\">· vs. 1.8W+ for a CPU-software approximation of the same field</span>"],
      ["Ray-Traced Frame Cost", "0.0% — never shares the GPU render path"],
      ["Hybrid-Bond Handoff Latency", "0.02 ms (SoRT parametric IR → Klangkerne convolution engine)"],
      ["Programmed By", "Sonoral™ runtime, under the AcoustX™ platform brand"]
    ]);
}

function sectionAudioPlatform(m) {
  return capGrid([
    capCard("🎧", "Sonoral™ Runtime", "The software/driver layer that programs the SoRT die — enforces the 2.67ms real-time acoustic block deadline and hands parametric impulse responses to Klangkerne."),
    capCard("🔊", "AcoustX™ Platform", "Intel's acoustic ray-tracing platform brand, covering SoRT hardware and the Sonoral runtime together — the marketed name for Eventide's spatial audio stack."),
    capCard("🎚️", "Intel® Smart Sound Technology", "Always-on audio DSP pipeline, accelerated by the GNA tile for continuous noise suppression and wake-word detection."),
    capCard("🎙️", "Intel® High Definition Audio", "Standard multi-channel HD audio codec interface, layered beneath Klangkerne's DSP pipeline.")
  ]);
}

function sectionMedia(m) {
  return rows([
    ["QuickSync BionzXR Cores", m.bionzCores + " cores (Intel 06E) — co-developed with Sony Semiconductor"],
    ["BionzXR Encode Codecs", "AV2 (world-first hardware encoder), AV1, H.266/VVC, H.265, H.264, VRV1, VRV2, ProRes"],
    ["BionzXR Decode Codecs", "All encode codecs + VP9, VP8, MPEG-4, VC-1"],
    ["Max Encode Resolution", "8K120 ProRes; 8K240 AV1; 4K480 AV2"],
    ["MFX QuickSync (Low-Power)", "AV2, AV1, H.266, H.265, H.264, VP9 decode <span class=\"note\">· ~35% lower power than BionzXR for sustained playback</span>"],
    ["IPU Version", "Intel IPU 8.2 (Intel 14A-E)"],
    ["Max Camera Input", fmt(m.ipuMp) + " MP — native USB-C / Thunderbolt sensor ingestion"],
    ["Intel® Gaussian & Neural Accelerator", "Yes (GNA 5.0) <span class=\"note\">· see AI — GNA section</span>"]
  ]);
}

function sectionExpansion(m) {
  const rowsArr = [
    ["PCIe Revision", m.pcieRev + (m.gpuTiles >= 4 ? " (primary GPU tile interconnect); PCIe 6.0 (storage / peripherals)" : "")],
    ["PCI Express Configurations", m.tier.line === "X" ? "1×16, 2×8, 4×4, 8×2" : m.computeTiles ? "1×16, 2×8" : "1×8, 2×4"],
    ["Max # of PCI Express Lanes", m.tier.line === "X" ? "64" : m.computeTiles ? "28" : "16"],
    ["Thunderbolt Version", m.tbVersion + " <span class=\"note\">· 160 Gbps symmetric / 240 Gbps boost; supports Intel×Sony eDP 2.0 tunnel</span>"],
    ["Thunderbolt Ports", m.tbVersion.includes("6") ? "Up to 4" : "—"],
    ["USB Specification", m.usbSpec + ", USB 3.2 Gen 2×2"],
    ["Intel® DirectStorage NVMe Path", "PCIe 6.0 NVMe · ~24 GB/s sustained via I/O tile"]
  ];
  if (m.tier.line === "X") rowsArr.push(["Scalability", "1S / 2S / 4S / 8S"]);
  return rows(rowsArr);
}

function sectionWireless(m) {
  return rows([
    ["WiFi Specification", m.wifiGen + (m.suffix.wifi ? " — via Killer SignalBoost S1" : "")],
    ["WiFi Chips", m.wifiChips],
    ["Bluetooth", m.bluetooth],
    ["Cellular", m.cellular],
    ["Antenna Support", m.suffix.wifi ? "Up to 2× 360° Intel LinkBoost antennae; SONAR user presence via WiFi signal" : "—"],
    ["Intel® Wake on Voice", "Yes (LPNPU-powered; always-on)"],
    ["Intel® Wake on Wi-Fi (SONAR)", m.suffix.wifi ? "Yes" : "Not present"]
  ]);
}

function sectionSecurity(m) {
  const cards = [
    capCard("🛡️", "Intel® vPro® Eligibility", m.tier.line === "X" ? "Hardware-rooted vPro for Xeon-class manageability and fleet security." : "Hardware-rooted manageability and security platform for business-class systems."),
    capCard("🕵️", "Intel® Threat Detection Technology (TDT)", "NPU + hardware performance-monitor anomaly detection on the PSM tile — 150+ MITRE ATT&CK behaviors, ransomware and cryptojacking detection below the OS."),
    capCard("📡", "Intel® Active Management Technology (AMT)", "Out-of-band remote management via CSME 2.0 — works even when the OS is crashed, hung, or powered off."),
    capCard("🔐", "Microsoft Pluton 2.1", "Hardware TPM 2.1 + Pluton security processor, integrated into the PSM tile as a root of trust below the OS — parallel to Alloy OS's EGP root."),
    capCard("🧩", "Eventide Guardian Protocol (EGP)", "Intel-developed silicon root of trust for Alloy OS — on-tile AES-256 key vault, per-app hardware attestation, anti-rollback firmware enforcement."),
    capCard("🔑", "Intel® Total Memory Encryption — Multi-Key", "Full-memory AES-XTS encryption across ZAM and DDR6 paths, keyed per boot; multi-key variant isolates VM/container memory domains."),
    capCard("🗝️", "Intel® Key Locker", "AES key handles stored in silicon — applications reference handles instead of plaintext keys, preventing memory-dump key extraction."),
    capCard("🧷", "Intel® Secure Key", "Hardware digital random number generator (RDRAND / RDSEED)."),
    capCard("🧱", "Intel® Control-Flow Enforcement Technology (CET)", "Hardware shadow stack + indirect branch tracking — blocks ROP / JOP exploitation."),
    capCard("🥾", "Intel® Boot Guard", "Cryptographically-verified UEFI boot — bootkits and unsigned firmware cannot execute."),
    capCard("🏛️", "Intel® Trusted Execution Technology (TXT)", "Hardware-measured launch environment, verified against the PSM root of trust."),
    capCard("🚫", "Execute Disable Bit", "Hardware NX enforcement, preventing code execution from data pages."),
    capCard("🛑", "Intel® OS Guard (SMEP/SMAP)", "Blocks kernel-mode execution of user-space code and unauthorized kernel access to user memory."),
    capCard("🎯", "Mode-based Execute Control (MBEC)", "Hypervisor-enforced per-page execute permissions, hardening VM-based security products."),
    capCard("⚙️", "Intel® VT-x / VT-d / VT-x with EPT", "Hardware virtualization, directed I/O (IOMMU) and extended page tables, exposed across all active Compute Tiles."),
    capCard("🛰️", "Intel® Virtualization Technology with Redirect Protection (VT-rp)", "Hardware protection against hypervisor-level redirection attacks."),
    capCard("🧮", "AES-NI / SHA-NI", "Hardware-accelerated cryptographic instruction extensions on UHP and DP cores."),
    capCard("🧰", "Intel® Stable IT Platform Program (SIPP)", "Guaranteed 15-month image-stability window for enterprise deployment.")
  ];
  if (m.tier.line === "X") {
    cards.push(
      capCard("🔒", "Intel® Trust Domain Extensions (Intel® TDX)", "Hardware-isolated confidential-computing VMs, encrypted and inaccessible to the hypervisor."),
      capCard("🏰", "Intel® Software Guard Extensions (Intel® SGX)", `Hardware enclaves for confidential workloads. Default max EPC size: ${m.tier.n >= 9 ? "1 TB" : "512 GB"}.`),
      capCard("🚑", "Intel® Run Sure Technology", "RAS feature set for mission-critical uptime — machine-check recovery, memory mirroring, and rank-sparing.")
    );
  }
  return capGrid(cards);
}

function sectionAdvancedTech(m) {
  const cards = [
    capCard("🧠", "Intel® Thread Director", "Dedicated in-fabric scheduling tile making sub-100-nanosecond core, GPU and NPU placement decisions — not a software layer."),
    capCard("⚡", "AFFINITY™ Power System", "Supersaver / Efficiency / Balanced / Performance / Unleashed profiles, hardware-enforced by Thread Director and the LPNPU co-pilot."),
    capCard("💡", "FOveros 2.0", "Photonic tile-to-tile interconnect, co-developed with Lightmatter (USA), replacing copper die-to-die links with on-package optical signaling."),
    capCard("🔗", "ASSI 2.0", "Advanced Stacked Silicon Interconnect — the 0.4µm-pitch hybrid bond used to stack SoRT on Klangkerne."),
    capCard("💾", "Intel DirectStorage 2.0", "Staged data path from DDR6 through ZAM to the Kache Kore bLLC for fast asset streaming."),
    capCard("🚀", "V8 HyperBOOST", m.computeTiles ? "All 8 UHP (Solar Eclipse) cores run a Ford Mustang V8-inspired offset firing sequence (1-4-6-3-8-5-7-2) to sustain an effective 10 GHz across 8–40ms burst windows — Unleashed AFFINITY™ only, requires external PSU + cooler, auto-disabled the instant the system goes on battery. Exclusive to UHP; no other core class supports it." : "Not applicable — no Compute Tile present on this SKU."),
    capCard("🎛️", "Intel® Speed Shift Technology", "Hardware-controlled P-state selection, removing OS DVFS latency."),
    capCard("🌙", "Idle States", "Full ACPI C-state support across all five core classes."),
    capCard("📉", "Enhanced Intel SpeedStep® Technology", "Dynamic voltage/frequency scaling per core class."),
    capCard("🌡️", "Thermal Monitoring Technologies", "Per-core and per-tile digital thermal sensors feeding Thread Director's burst and throttle decisions."),
    capCard("🧭", "Intel® Volume Management Device (VMD)", "Hardware-level NVMe RAID and hot-plug management via the I/O tile."),
    capCard("🎙️", "Intel® Gaussian & Neural Accelerator (GNA)", "Milliwatt-class always-on audio inference — see AI — GNA section."),
    capCard("🧩", "Intel® Deep Learning Boost", "AMX-INT8 / AMX-BF16 matrix acceleration on UHP/DP cores, complementing HNPU and XMX5.")
  ];
  if (m.tier.line === "X") {
    cards.push(
      capCard("🔗", "Intel® UPI (Ultra Path Interconnect)", "24 GT/s coherent socket-to-socket fabric for multi-socket Xeon 500 scale-out, up to 4 links per socket."),
      capCard("🚀", "Intel® QuickAssist Technology (QAT)", "Hardware-accelerated cryptography and lossless compression, offloaded from the compute tiles."),
      capCard("⚖️", "Intel® Dynamic Load Balancer (DLB)", "Hardware work-queue balancing across cores for packet-processing and event-driven workloads."),
      capCard("📊", "Intel® Data Streaming Accelerator (DSA)", "Hardware-accelerated data movement and transformation, offloading memcpy-class operations."),
      capCard("🔎", "Intel® In-Memory Analytics Accelerator (IAA)", "Hardware-accelerated analytics primitives — filtering, compression, decompression for in-memory databases."),
      capCard("🧮", "Intel® Advanced Matrix Extensions (AMX)", "Tile-based matrix multiply units on DP cores for INT8/BF16 inference and training acceleration."),
      capCard("🎚️", "Intel® Speed Select Technology — Performance Profile (SST-PP)", "Per-core-count, per-frequency performance profiles selectable at boot for workload-tuned configurations."),
      capCard("⚡", "Intel® Speed Select Technology — Core Power (SST-CP)", "Prioritized power allocation to high-priority core groups under contention."),
      capCard("🔺", "Intel® Speed Select Technology — Turbo Frequency (SST-TF)", "Elevated turbo ceilings for designated high-priority cores at the expense of the rest."),
      capCard("🧊", "Intel® Speed Select Technology — Base Frequency (SST-BF)", "Guaranteed base frequency for high-priority cores under sustained AVX-heavy load."),
      capCard("📐", "Intel® Resource Director Technology (Intel® RDT)", "Cache and memory-bandwidth allocation/monitoring per VM or container — prevents noisy-neighbor contention."),
      capCard("🔁", "Intel® Transactional Synchronization Extensions", "Hardware lock elision for high-concurrency data structures.")
    );
  }
  return capGrid(cards);
}

function sectionPackage(m) {
  const rowsArr = [
    ["Sockets Supported", m.tier.line === "X" ? "FCLGA-Eventide-X (workstation/server)" : "BGA (integrated, non-socketed)"],
    ["Package Carrier", m.tier.line === "X" ? "FCLGA" : "FCBGA"],
    ["Package Size", m.tier.line === "X" ? "58.5mm × 51mm" : "35mm × 30mm"],
    ["Thermal Solution Specification", m.tier.line === "X" ? "Datacenter liquid / air, OEM-specified" : m.unlocked ? "Unleashed dock (liquid-assisted) or OEM cooler" : "OEM-specified"],
    ["Max Operating Temperature", m.suffix.form === "Desktop" ? "100°C" : "105°C"],
    ["T Junction Max", m.suffix.form === "Desktop" ? "100°C" : "105°C"]
  ];
  if (m.tier.line === "X") {
    rowsArr.push(
      ["DTS Max", "105°C"], ["TCASE", "81°C"],
      ["Max CPU Configuration", "1S / 2S / 4S / 8S — see Scalability"],
      ["ECC Memory Supported", "Yes"]
    );
  }
  return rows(rowsArr);
}

function affinityChart(m) {
  const t = m.tdp;
  const tiers = [
    { label: "Supersaver", v: t.floor, ctx: "Battery" },
    { label: "Efficiency", v: t.efficiency, ctx: "Battery" },
    { label: "Balanced", v: t.balanced, ctx: "Adapter" },
    { label: "Performance", v: t.performance, ctx: "Adapter" },
    { label: "Unleashed", v: t.unleashed, ctx: "Docked" }
  ];
  const W = 860, rowH = 34, padL = 300, padR = 90, chartW = W - padL - padR;
  const logMin = Math.log10(0.35), logMax = Math.log10(2500);
  const xOf = (v) => padL + ((Math.log10(Math.max(v, 0.35)) - logMin) / (logMax - logMin)) * chartW;
  const H = rowH * tiers.length + 30;
  const gridVals = [1, 10, 100, 1000, 2000];
  const gridLines = gridVals.map((gv) => {
    const x = xOf(gv);
    return `<line x1="${round1(x)}" y1="10" x2="${round1(x)}" y2="${H - 20}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/><text x="${round1(x)}" y="${H - 6}" font-family="monospace" font-size="9" fill="rgba(255,255,255,0.35)" text-anchor="middle">${gv}W</text>`;
  }).join("");
  const bars = tiers.map((tier, i) => {
    const y = 16 + i * rowH;
    const active = tier.v != null;
    const x0 = xOf(0.35);
    const x1 = active ? xOf(tier.v) : x0;
    const color = i === 4 ? "#9333EA" : "#F0B848";
    return `
      <text x="${padL - 14}" y="${y + 14}" font-family="sans-serif" font-size="12" font-weight="600" fill="${active ? "#fff" : "rgba(255,255,255,0.35)"}" text-anchor="end">${tier.label}</text>
      <text x="${padL - 14}" y="${y + 26}" font-family="monospace" font-size="8.5" fill="rgba(255,255,255,0.4)" text-anchor="end" letter-spacing="0.06em">${tier.ctx.toUpperCase()}</text>
      ${active ? `<rect x="${round1(x0)}" y="${y + 2}" width="${round1(Math.max(2, x1 - x0))}" height="16" rx="4" fill="${color}" fill-opacity="0.85"/>
      <text x="${round1(x1 + 8)}" y="${y + 15}" font-family="monospace" font-size="11.5" font-weight="700" fill="${color}">${tier.v}W</text>`
      : `<rect x="${round1(x0)}" y="${y + 2}" width="6" height="16" rx="3" fill="rgba(255,255,255,0.12)"/><text x="${round1(x0 + 14)}" y="${y + 15}" font-family="monospace" font-size="10.5" fill="rgba(255,255,255,0.35)">locked</text>`}
    `;
  }).join("");
  return `<div class="ev-affinity-chart-wrap"><svg class="ev-affinity-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="AFFINITY power envelope by profile, logarithmic watt scale">${gridLines}${bars}</svg></div>`;
}

function affinityMatrix(m) {
  const cols = ["Supersaver", "Efficiency", "Balanced", "Performance", "Unleashed"];
  function cell(states) {
    return states.map((s) => `<td class="ev-affstate ev-affstate-${s[0]}"><span class="ev-affdot"></span>${s[1]}</td>`).join("");
  }
  const rows = [
    ["LP Island (UHE/LPE + Druid + BionzXR + LPNPU)", cell([["active", "Active"], ["active", "Active"], ["active", "Active"], ["active", "Active"], ["active", "Active"]])],
    ["Compute Tile" + (m.computeTiles > 1 ? "s ×" + m.computeTiles : ""), m.computeTiles
      ? cell([["off", "Parked"], ["off", "Parked"], ["active", "Active"], ["boost", "Turbo"], ["boost", "Max"]])
      : cell([["na", "—"], ["na", "—"], ["na", "—"], ["na", "—"], ["na", "—"]])],
    ["Elementalist GPU" + (m.gpuTiles > 1 ? " ×" + m.gpuTiles : ""), m.gpuTiles
      ? cell([["off", "Parked"], ["off", "Parked"], ["idle", "Idle"], ["active", "Active"], ["boost", "Max"]])
      : cell([["na", "—"], ["na", "—"], ["na", "—"], ["na", "—"], ["na", "—"]])],
    ["HNPU", cell([["off", "Parked"], ["idle", "Idle"], ["active", "Active"], ["active", "Active"], ["boost", "Max"]])],
    ["V8 HyperBOOST", m.computeTiles && m.unlocked
      ? cell([["off", "Off"], ["off", "Off"], ["off", "Off"], ["off", "Off"], ["boost", "10 GHz"]])
      : cell([["na", "—"], ["na", "—"], ["na", "—"], ["na", "—"], ["na", "—"]])]
  ];
  const head = `<tr><th>Tile / Domain</th>${cols.map((c) => `<th>${c}</th>`).join("")}</tr>`;
  const body = rows.map((r) => `<tr><td class="ev-affrow-label">${r[0]}</td>${r[1]}</tr>`).join("");
  return `<table class="ev-affinity-matrix"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

function affinityTable(m) {
  const t = m.tdp;
  const batteryWh = 70;
  const supersaverHrs = round1(batteryWh / t.floor);
  const efficiencyHrs = round1(batteryWh / t.efficiency);
  const trs = [
    ["Supersaver", t.floor + "W", "Battery", "LP Island only — UHE/LPE cores idle-parked, screen dimmed, Compute/GPU tiles fully power-gated. The assured minimum running power on battery.", `~${supersaverHrs}h on a 70Wh battery`, "Fanless"],
    ["Efficiency", t.efficiency + "W", "Battery", "LP Island active for everyday light use — Compute Tiles and GPU tiles stay parked unless woken by Thread Director.", `~${efficiencyHrs}h on a 70Wh battery`, "Fanless / passive"],
    ["Balanced", t.balanced + "W", "Adapter", "Sustained cTDP with Compute Tiles and iGPU active under typical mixed load.", "Plugged in — not battery-optimized", m.suffix.form === "Desktop" ? "Stock air cooler" : "Standard laptop fan"],
    ["Performance", t.performance + "W", "Adapter", "Sustained Max Turbo across all active tiles — Compute, GPU and HNPU boosted, thermally gated by Thread Director.", "Plugged in — sustained ceiling", m.suffix.form === "Desktop" ? "Tower air / AIO liquid" : "Active laptop cooling, fans audible"],
    ["Unleashed", t.unleashed ? t.unleashed + "W" : "Not available", "Docked", t.unlocked
      ? "Dock-fed ceiling with liquid-assisted cooling. Scales with Compute Tile and Elementalist GPU tile count — requires a compatible power-delivery dock."
      : "Locked multiplier — this SKU does not expose an Unleashed AFFINITY™ tier. Performance is the sustained ceiling.", t.unlocked ? "Dock power delivery only" : "Not applicable", t.unlocked ? "Liquid-assisted power-delivery dock required" : "—"]
  ].map((r) => `<tr><td>${r[0]}</td><td class="num">${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td>${r[5]}</td></tr>`).join("");
  return `${affinityChart(m)}
<table class="ev-tdp-table"><thead><tr><th>AFFINITY™ Profile</th><th>Package Power</th><th>Context</th><th>Behavior</th><th>Runtime / Duty</th><th>Cooling Requirement</th></tr></thead><tbody>${trs}</tbody></table>
<div class="ev-tdp-note">Package power is derived from tile composition (Compute Tiles, Elementalist GPU tiles, HNPU throughput) under Intel's AFFINITY™ power-profile model. Supersaver's ${m.tdp.floor}W floor is the assured minimum running power while on battery with the display active; it is not a full system-off state. Unleashed requires a compatible cooling + power-delivery dock and is only exposed on unlocked SKUs. Battery-life figures assume a representative 70Wh pack and do not model display or radio power.</div>
<div class="ev-affinity-matrix-title">Tile Power State by AFFINITY™ Profile</div>
${affinityMatrix(m)}`;
}

/* ---------------------------------------------------------------- Layout */

const SECTIONS = [
  { id: "essentials", label: "Essentials", body: sectionEssentials, open: true },
  { id: "supplemental", label: "Supplemental Information", body: sectionSupplemental },
  { id: "cpu", label: "CPU Specifications", body: sectionCpu, open: true },
  { id: "compute-tile", label: "Compute Tile — Solar Eclipse + Sunset Cove + Venusmont", body: sectionComputeTile, guard: (m) => m.computeTiles > 0 },
  { id: "lp-island", label: "LP Island Tile", body: sectionLpIsland },
  { id: "cache", label: "Cache Specifications", body: sectionCache },
  { id: "memory", label: "Memory Specifications", body: sectionMemory },
  { id: "gpu-elementalist", label: "Graphics — Elementalist GPU Tile", body: sectionGraphicsElementalist, guard: (m) => m.gpuTiles > 0 },
  { id: "gpu-druid", label: "Graphics — Arc Druid (LP)", body: sectionGraphicsDruid },
  { id: "gpu-kanvas", label: "Graphics — 2DKanvas (2D)", body: sectionGraphicsKanvas },
  { id: "display", label: "Display Engine", body: sectionDisplay },
  { id: "ai-hnpu", label: "AI — HNPU", body: sectionHnpu },
  { id: "ai-lpnpu", label: "AI — LPNPU", body: sectionLpnpu },
  { id: "ai-gna", label: "AI — GNA (Audio NPU)", body: sectionGna },
  { id: "audio-klangkerne", label: "Audio — Klangkerne", body: sectionKlangkerne },
  { id: "audio-sort", label: "Audio — SoRT (Sound Ray Tracing)", body: sectionSort },
  { id: "audio-platform", label: "Audio — Sonoral™ & AcoustX™ Platform", body: sectionAudioPlatform },
  { id: "media", label: "Media & Imaging", body: sectionMedia },
  { id: "expansion", label: "Expansion Options", body: sectionExpansion },
  { id: "wireless", label: "Wireless & Connectivity", body: sectionWireless },
  { id: "security", label: "Security & Manageability", body: sectionSecurity },
  { id: "advanced-tech", label: "Advanced Technologies", body: sectionAdvancedTech },
  { id: "package", label: "Package Specifications", body: sectionPackage },
  { id: "power", label: "Power & AFFINITY™", body: (m) => affinityTable(m) }
];

function buildTileConfig(m) {
  const tiles = [{ id: "kachekore" }];
  if (m.computeTiles > 0) tiles.push({ id: "compute", count: m.computeTiles, coresPerTile: m.uhpPerTile + m.dpPerTile + m.spePerTile });
  tiles.push(
    { id: "lpisland" },
    { id: "druid", xeCores: m.druidXeCores, model: m.druidModel },
    { id: "bionzxr" },
    { id: "hnpu" }
  );
  if (m.gpuTiles > 0) tiles.push({ id: "gpu", count: m.gpuTiles, xe5: m.xe5PerTile, model: m.gpuModel });
  tiles.push(
    { id: "kanvas2d" }, { id: "zam", capacityGB: m.zamMaxCapacityGB }, { id: "klangkerne" },
    { id: "io" }, { id: "psm" }, { id: "killers1" }, { id: "ipu" },
    { id: "mfx" }, { id: "gna" }, { id: "display" }, { id: "threaddirector" }
  );
  return tiles;
}

function buildTileSpecs(m) {
  const specs = {
    kachekore: [
      { label: "L4 / bLLC Capacity", val: (m.l4KacheGB + " GB") },
      { label: "L3 (LP Island share)", val: m.l3LPIsland + " MB" },
      { label: "Total SRAM + L4", val: `~${m.totalSRAM} MB SRAM + ${(m.l4KacheGB + " GB")}` },
      { label: "Fabric", val: "FOveros 2.0 · shared by every tile" }
    ],
    lpisland: [
      { label: "UHE Cores", val: m.uheCores }, { label: "LPE Cores", val: m.lpeCores },
      { label: "Min Island TDP", val: m.tdp.floor + "W" }
    ],
    druid: [
      { label: "Model", val: "Arc® Druid " + m.druidModel }, { label: "Xe4E-Cores", val: m.druidXeCores },
      { label: "Boost Clock", val: m.druidBoost + " GHz" }, { label: "Node", val: "Intel 06E" }
    ],
    bionzxr: [
      { label: "Cores", val: m.bionzCores }, { label: "Node", val: "Intel 06E" },
      { label: "Flagship Codec", val: "AV2 (hardware encode)" }
    ],
    hnpu: [{ label: "Throughput", val: m.hnpuTOPS + " TOPS" }, { label: "Node", val: "Intel 04A" }],
    kanvas2d: [{ label: "Node", val: "Intel 14A-E" }, { label: "Function", val: "2D compositor, no 3D ALUs" }],
    zam: [
      { label: "Max Capacity", val: gb(m.zamMaxCapacityGB) }, { label: "Bandwidth", val: m.zamBandwidthGBs + " GB/s" },
      { label: "Latency", val: m.zamLatencyNs + " ns" }
    ],
    klangkerne: [
      { label: "Base Die", val: "18 mm² · Intel 14A-E" }, { label: "Stack Partner", val: "SoRT (see separate tile)" },
      { label: "Function", val: "Mixer/DSP, Tiefton, Hallraum" }
    ],
    sort: [
      { label: "Die Size", val: "7.2 mm² · Intel 04A" }, { label: "Clusters", val: m.sortClusters },
      { label: "Ray Budget / Block", val: fmt(m.sortRayBudget) }, { label: "Frame Cost", val: "0.0%" },
      { label: "Power", val: "~118 mW" }, { label: "Deadline", val: "2.67 ms" }
    ],
    killers1: [{ label: "WiFi", val: m.wifiGen }, { label: "Chips", val: m.wifiChips }],
    ipu: [{ label: "Max Input", val: fmt(m.ipuMp) + " MP" }],
    mfx: [{ label: "Function", val: "Low-power decode" }],
    gna: [{ label: "Throughput", val: m.gnaTOPS + " TOPS" }],
    display: [{ label: "Max Displays", val: m.maxDisplays }, { label: "Max Resolution", val: `${fmt(m.maxResW)}×${fmt(m.maxResH)}@${m.maxResHz}Hz` }],
    threaddirector: [{ label: "Decision Latency", val: "<100 ns" }, { label: "Classes", val: "5 core + 1 GPU-coupled" }],
    io: [{ label: "PCIe", val: m.pcieRev }, { label: "Thunderbolt", val: m.tbVersion }],
    psm: [{ label: "Root of Trust", val: "Pluton + TPM 2.1" }]
  };
  if (m.computeTiles > 0) {
    specs.compute = [
      { label: "Instances", val: m.computeTiles },
      { label: "UHP / DP / SPE per tile", val: `${m.uhpPerTile} / ${m.dpPerTile} / ${m.spePerTile}` },
      { label: "UHP Max Turbo", val: m.uhpTurbo + " GHz" },
      { label: "HyperBOOST Peak", val: m.hyperboost + " GHz" },
      { label: "L3 per tile", val: m.l3PerComputeTile + " MB" }
    ];
  }
  if (m.gpuTiles > 0) {
    specs.gpu = [
      { label: "Instances", val: m.gpuTiles }, { label: "Model", val: m.gpuModel },
      { label: "Total Xe5-cores", val: fmt(m.xe5Total) }, { label: "Boost Clock", val: m.gpuBoostClock + " GHz" },
      { label: "XMX5 Units", val: fmt(m.xmx5Total) }, { label: "RTU5 Units", val: fmt(m.rtu5Total) }
    ];
  }
  return specs;
}

function render(dirName, m) {
  const badges = [
    { cls: "gold", text: BRAND_BADGE(m) },
    { cls: "orange", text: `${m.suffixKey} · ${m.suffix.label}` },
    { cls: "blue", text: "FOveros 2.0 Photonic" },
    { cls: "purple", text: fmt(m.totalSystemTOPS) + " TOPS AI (NPU)" }
  ];
  const badgesHtml = badges.map((b) => `<span class="ev-badge ${b.cls}">${b.text}</span>`).join("\n        ");

  const maxTurboStat = m.computeTiles ? m.uhpTurbo + " GHz" : m.uheTurbo + " GHz";
  const cacheStat = `~${m.totalSRAM} MB + ${(m.l4KacheGB + " GB")}`;

  const sectionsHtml = SECTIONS.map((s) => {
    if (s.guard && !s.guard(m)) return "";
    const body = s.body(m);
    if (body == null) return "";
    const openCls = s.open ? "open" : "";
    const icon = s.open ? "▲" : "▼";
    return `<div class="ev-section">
  <div class="ev-section-head"><span class="ev-section-head-label">${s.label}</span><span class="ev-section-head-icon ${openCls}">${icon}</span></div>
  <div class="ev-section-body ${openCls}">${body}</div>
</div>`;
  }).join("\n");

  const tileConfig = buildTileConfig(m);
  const tileSpecs = buildTileSpecs(m);
  const skuData = JSON.stringify({ tiles: tileConfig, tileSpecs: tileSpecs });

  const depth = "../../../../";
  const subtitle = `${m.collection.replace(" (Eventide)", "")} · Eventide Generation · ${m.l3Total || m.l3LPIsland}MB Cache, up to ${maxTurboStat}${m.computeTiles ? ` (${m.hyperboost} GHz HyperBOOST)` : ""}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${m.brand} — Eventide Deep Dive</title>
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
      <div class="ev-title">${m.brand}</div>
      <div class="ev-subtitle">${subtitle}</div>
      <div class="ev-badges">
        ${badgesHtml}
      </div>
    </div>

    <div class="ev-stats">
      <div class="ev-stat"><div class="ev-stat-num">${maxTurboStat}</div><div class="ev-stat-label">Max Turbo</div></div>
      <div class="ev-stat"><div class="ev-stat-num">${fmt(m.totalPhysicalCores)}</div><div class="ev-stat-label">Physical Cores</div></div>
      <div class="ev-stat"><div class="ev-stat-num">${fmt(m.totalSystemTOPS)}</div><div class="ev-stat-label">NPU AI TOPS</div></div>
      <div class="ev-stat"><div class="ev-stat-num">${cacheStat}</div><div class="ev-stat-label">Total Cache</div></div>
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
  <div class="ev-footer">Intel, the Intel logo, Core, Core Ultra, Xeon, Arc, Thunderbolt, Killer, vPro, QuickSync, Thread Director, PowerVia, Foveros, and Turbo Boost are trademarks of Intel Corporation or its subsidiaries. Klangkerne, SoRT, Sonoral and AcoustX are trademarks used under the Eventide co-engineering program.<br>Specifications subject to change. Performance and power numbers represent theoretical maximums under ideal conditions; AFFINITY™ power figures are derived from tile composition.<br>${m.brand} · Eventide Generation · Intel Corporation 2028 · All rights reserved.</div>
  <script type="application/json" id="ev-sku-data">${skuData}<\/script>
  <script src="../../assets/tile-catalog.js"><\/script>
  <script src="../../assets/tile-sizes.js"><\/script>
  <script src="../../assets/spec-engine.js"><\/script>
</div>
  </div>
</body>
</html>
`;
}

function BRAND_BADGE(m) {
  const label = { C: "Core", I: "Core i", U: "Core Ultra", X: "Core Xeon" }[m.tier.line];
  return `${label} 500`;
}

function main() {
  const dirs = fs.readdirSync(SKU_ROOT).filter((d) => fs.statSync(path.join(SKU_ROOT, d)).isDirectory());
  let ok = 0, fail = 0;
  dirs.forEach((dir) => {
    const file = path.join(SKU_ROOT, dir, "index.html");
    try {
      const m = buildModel(dir);
      const out = render(dir, m);
      fs.mkdirSync(path.dirname(file), { recursive: true });
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
