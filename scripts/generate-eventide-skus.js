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
  return rows([
    ["Total Physical Cores", fmt(m.totalPhysicalCores)],
    ["Total Logical Threads", fmt(m.totalThreads)],
    ["Compute Tiles", m.computeTiles],
    ["Total UHP Cores (Solar Eclipse)", m.computeTiles ? fmt(m.uhpTotal) : "Not present"],
    ["Total DP Cores (Sunset Cove)", m.computeTiles ? fmt(m.dpTotal) : "Not present"],
    ["Total SPE Cores (Venusmont)", m.computeTiles ? fmt(m.speTotal) : "Not present"],
    ["Total UHE Cores (Lunar Eclipse)", m.uheCores],
    ["Total LPE Cores (Darkmont)", m.lpeCores],
    ["UHP Base / Max Turbo", m.computeTiles ? `${m.uhpBase} GHz / ${m.uhpTurbo} GHz` : "—"],
    ["UHP V8 HyperBOOST (peak)", m.computeTiles ? `${m.hyperboost} GHz <span class="note">· 8–40ms burst window; thermally gated; hardware-scheduled</span>` : "—"],
    ["DP Base / Max Turbo", m.computeTiles ? `${m.dpBase} GHz / ${m.dpTurbo} GHz` : "—"],
    ["SPE Base / Max Turbo", m.computeTiles ? `${m.speBase} GHz / ${m.speTurbo} GHz` : "—"],
    ["UHE Base / Max Turbo", `${m.uheBase} GHz / ${m.uheTurbo} GHz`],
    ["LPE Base / Max Turbo", `${m.lpeBase} GHz / ${m.lpeTurbo} GHz`],
    ["Overclocking", m.unlocked ? "Yes — UHP, DP, SPE; per-tile granular multiplier unlock" : "No — locked multiplier"],
    ["Instruction Set Extensions", "AVX2, AVX-512 (UHP/DP only), AMX-Tile, AMX-INT8, AMX-BF16, AES-NI, SHA-NI"],
    ["Thread Director Scheduling Classes", "5 hardware classes (UHP/DP/SPE/UHE/LPE) + GPU-coupled RT/BVH dispatch class"]
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
    ["Kache Kore™ L4 / bLLC", `${mbfmt(m.l4KacheGB)} <span class="note">· shared cache interposer at the physical center of the package</span>`],
    ["Total SRAM Cache (approx.)", `~${m.totalSRAM} MB SRAM + ${mbfmt(m.l4KacheGB)} L4 bLLC`],
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
      ["Multi-Tile Presentation", m.gpuTiles > 1 ? `${m.gpuTiles}× ${m.gpuModel} appear as a single render device via FOveros 2.0 + Thread Director` : "Single tile — native presentation"],
      ["VR Support", "Yes — native VRV1 / VRV2 codec hardware"],
      ["DirectX Support", "DirectX 12 Ultimate (FL 12_2)"],
      ["OpenGL / Vulkan Support", "OpenGL 4.6 / Vulkan 1.4"],
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
    ["Max Displays Supported", m.maxDisplays],
    ["Display Outputs", "eDP 1.5, Intel×Sony eDP 2.0 (over " + m.pcieRev + "), DisplayPort 2.1 UHBR20, HDMI 2.1 FRL"],
    ["Max Resolution (eDP 2.0)", `${fmt(m.maxResW)} × ${fmt(m.maxResH)} @ ${m.maxResHz} Hz`],
    ["HDR Support", "HDR10, Dolby Vision (via BionzXR tone-mapping)"],
    ["Display Stream Compression", "VESA DSC 1.2a"],
    ["Unified Display Engine", "Any GPU tile (Elementalist, Druid, 2DKanvas) can drive any output — no MUX switching"]
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
      ["Pipeline Blocks", "Traversal Engine, Diffraction Unit, Binaural Divergence Unit, IR Assembler"],
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
  return rows([
    ["PCIe Revision", m.pcieRev + (m.gpuTiles >= 4 ? " (primary GPU tile interconnect); PCIe 6.0 (storage / peripherals)" : "")],
    ["Thunderbolt Version", m.tbVersion + " <span class=\"note\">· 120 Gbps; supports Intel×Sony eDP 2.0 tunnel</span>"],
    ["USB Specification", m.usbSpec + ", USB 3.2 Gen 2×2"],
    ["Max PCIe Lanes (platform)", m.tier.line === "X" ? "64" : m.computeTiles ? "28" : "16"]
  ]);
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
  return capGrid([
    capCard("🛡️", "Intel® vPro®", m.tier.line === "X" ? "Hardware-rooted vPro for Xeon-class manageability and fleet security." : "Hardware-rooted manageability and security platform for business-class systems."),
    capCard("🔐", "Microsoft Pluton", "Hardware TPM 2.1 + Pluton security processor, integrated into the PSM tile as a root of trust below the OS."),
    capCard("🧩", "PSM Tile", "Platform Security & Management — owns platform-wide power sequencing and the hardware root of trust."),
    capCard("🔑", "Intel® Total Memory Encryption", "Full-memory AES-XTS encryption across ZAM and DDR6 paths, keyed per boot."),
    capCard("⚙️", "Intel® VT-x / VT-d", "Hardware virtualization and directed I/O, exposed across all active Compute Tiles."),
    capCard("🧮", "AES-NI / SHA-NI", "Hardware-accelerated cryptographic instruction extensions on UHP and DP cores.")
  ]);
}

function sectionAdvancedTech(m) {
  return capGrid([
    capCard("🧠", "Intel® Thread Director", "Dedicated in-fabric scheduling tile making sub-100-nanosecond core, GPU and NPU placement decisions — not a software layer."),
    capCard("⚡", "AFFINITY™ Power System", "Supersaver / Efficiency / Balanced / Performance / Unleashed profiles, hardware-enforced by Thread Director and the LPNPU co-pilot."),
    capCard("💡", "FOveros 2.0", "Photonic tile-to-tile interconnect, co-developed with Lightmatter (USA), replacing copper die-to-die links with on-package optical signaling."),
    capCard("🔗", "ASSI 2.0", "Advanced Stacked Silicon Interconnect — the 0.4µm-pitch hybrid bond used to stack SoRT on Klangkerne."),
    capCard("💾", "Intel DirectStorage 2.0", "Staged data path from DDR6 through ZAM to the Kache Kore bLLC for fast asset streaming."),
    capCard("🚀", "V8 HyperBOOST", m.computeTiles ? "8–40ms hardware-scheduled burst clock above sustained Max Turbo, thermally gated and scheduled entirely by Thread Director." : "Not applicable — no Compute Tile present on this SKU.")
  ]);
}

function sectionPackage(m) {
  const rowsArr = [
    ["Sockets Supported", m.tier.line === "X" ? "FCLGA-Eventide-X (workstation/server)" : "BGA (integrated, non-socketed)"],
    ["Package Size", m.tier.line === "X" ? "58.5mm × 51mm" : "35mm × 30mm"],
    ["T Junction Max", m.suffix.form === "Desktop" ? "100°C" : "105°C"]
  ];
  if (m.tier.line === "X") {
    rowsArr.push(["Max CPU Configuration", "1"], ["ECC Memory Supported", "Yes"]);
  }
  return rows(rowsArr);
}

function affinityTable(m) {
  const t = m.tdp;
  const trs = [
    ["Supersaver", t.floor + "W", "LP Island only — UHE/LPE cores idle-parked, screen dimmed, all Compute/GPU tiles powered off. The assured minimum running power on battery."],
    ["Efficiency", t.efficiency + "W", "LP Island active for everyday light use — Compute Tiles and GPU tiles stay parked unless woken by Thread Director."],
    ["Balanced", t.balanced + "W", "Sustained cTDP with Compute Tiles and iGPU active under typical mixed load."],
    ["Performance", t.performance + "W", "Sustained Max Turbo across all active tiles — Compute, GPU and HNPU boosted, thermally gated by Thread Director."],
    ["Unleashed", t.unleashed ? t.unleashed + "W" : "Not available", t.unlocked
      ? "Dock-fed ceiling with liquid-assisted cooling. Scales with Compute Tile and Elementalist GPU tile count — requires a compatible power-delivery dock."
      : "Locked multiplier — this SKU does not expose an Unleashed AFFINITY™ tier. Performance is the sustained ceiling."]
  ].map((r) => `<tr><td>${r[0]}</td><td class="num">${r[1]}</td><td>${r[2]}</td></tr>`).join("");
  return `<table class="ev-tdp-table"><thead><tr><th>AFFINITY™ Profile</th><th>Package Power</th><th>Behavior</th></tr></thead><tbody>${trs}</tbody></table>
<div class="ev-tdp-note">Package power is derived from tile composition (Compute Tiles, Elementalist GPU tiles, HNPU throughput) under Intel's AFFINITY™ power-profile model. Supersaver's ${m.tdp.floor}W floor is the assured minimum running power while on battery with the display active; it is not a full system-off state. Unleashed requires a compatible cooling + power-delivery dock and is only exposed on unlocked SKUs.</div>`;
}

/* ---------------------------------------------------------------- Layout */

const SECTIONS = [
  { id: "essentials", label: "Essentials", body: sectionEssentials, open: true },
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
  if (m.computeTiles > 0) tiles.push({ id: "compute", count: m.computeTiles });
  tiles.push({ id: "lpisland" }, { id: "hnpu" });
  if (m.gpuTiles > 0) tiles.push({ id: "gpu", count: m.gpuTiles });
  tiles.push(
    { id: "kanvas2d" }, { id: "zam" }, { id: "klangkerne" },
    { id: "io" }, { id: "psm" }, { id: "killers1" }, { id: "ipu" },
    { id: "mfx" }, { id: "gna" }, { id: "display" }, { id: "threaddirector" }
  );
  return tiles;
}

function buildTileSpecs(m) {
  const specs = {
    kachekore: [
      { label: "L4 / bLLC Capacity", val: mbfmt(m.l4KacheGB) },
      { label: "L3 (LP Island share)", val: m.l3LPIsland + " MB" },
      { label: "Total SRAM + L4", val: `~${m.totalSRAM} MB SRAM + ${mbfmt(m.l4KacheGB)}` },
      { label: "Fabric", val: "FOveros 2.0 · shared by every tile" }
    ],
    lpisland: [
      { label: "UHE Cores", val: m.uheCores }, { label: "LPE Cores", val: m.lpeCores },
      { label: "LP iGPU", val: "Arc® Druid " + m.druidModel }, { label: "LPNPU", val: m.lpnpuTOPS + " TOPS" },
      { label: "Min Island TDP", val: m.tdp.floor + "W" }
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
      { label: "Die Size", val: "7.2 mm² · Intel 04A" }, { label: "Frame Cost", val: "0.0%" },
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
  const cacheStat = `~${m.totalSRAM} MB + ${mbfmt(m.l4KacheGB)}`;

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
