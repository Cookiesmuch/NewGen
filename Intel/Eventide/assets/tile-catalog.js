/* ==========================================================================
   Eventide Tile Catalog
   Shared data source for the interactive die-map + spec-sheet engine used
   by every SKU page. One entry per physical tile TYPE (not per instance —
   repeated tiles like Compute or Elementalist are drawn N times from a
   single catalog entry).
   ========================================================================== */
(function (global) {
  "use strict";

  var TILE_CATALOG = {

    compute: {
      name: "Compute Tile",
      codename: "Solar Eclipse + Sunset Cove + Venusmont",
      category: "CPU",
      node: "Intel 04A (0.4nm-class GaNSi GAA)",
      color: "#F0B848",
      zone: "band1-right",
      repeatKey: "computeTiles",
      tagline: "The heterogeneous performance core cluster.",
      short: "One repeatable performance tile carrying three distinct core micro-architectures side by side.",
      detail: [
        "Each Compute Tile is a single reticle carrying three purpose-built core designs: Solar Eclipse (UHP — Ultra High Performance), Sunset Cove (DP — Dense Performance) and Venusmont (SPE — Scalar Parallel Engine).",
        "Solar Eclipse (UHP) is the flagship single-thread core, home to V8 HyperBOOST — all 8 UHP cores firing in a Ford Mustang V8-inspired offset sequence (1-4-6-3-8-5-7-2) to sustain an effective 10 GHz across 8–40ms burst windows. Unleashed AFFINITY™ only; auto-disabled on battery.",
        "Sunset Cove (DP) trades a fraction of peak clock for area efficiency, packing more cores per tile for throughput-bound multi-threaded work.",
        "Venusmont (SPE) is a scalar-parallel cluster design descended from Intel's E-core lineage, run in 9-wide clusters sharing L1/L2 for extreme core-count density.",
        "All three core types share a per-tile 24MB L3 slice and are scheduled as one fabric by the dedicated Thread Director tile."
      ]
    },

    lpisland: {
      name: "LP Island",
      codename: "Lunar Eclipse + Darkmont",
      category: "CPU · Efficiency",
      node: "Intel 06E (0.6nm-class FinFlex GAA)",
      color: "#4CC38A",
      zone: "band1-left",
      repeatKey: null,
      tagline: "Always-on. Always present. The tile that never sleeps.",
      short: "A self-contained low-power core tile — UHE + LPE cores only. Sits in a cluster of independent 06E/14A-E tiles (Arc Druid, BionzXR, LPNPU) that power up and down together but are physically separate dies.",
      detail: [
        "The LP Island is present on every Eventide SKU — even fanless, GPU-less parts — and is the last domain to power down.",
        "Lunar Eclipse (UHE — Ultra High Efficiency) cores handle background and idle-adjacent work at a fraction of Compute Tile power.",
        "Darkmont (LPE — Low Power Efficiency) cores run in 4-core clusters for the deepest idle states, waking the rest of the package on demand.",
        "The LP Island tile itself carries only these two core types — Arc® Druid (LP iGPU), QuickSync BionzXR (media) and LPNPU are separate, independently-clickable tiles that happen to share the LP power cluster."
      ]
    },

    druid: {
      name: "Arc Druid",
      codename: "LP iGPU · Xe4E",
      category: "GPU · Efficiency",
      node: "Intel 06E (0.6nm-class FinFlex GAA)",
      color: "#6FE3A6",
      zone: "band1-left",
      repeatKey: null,
      tagline: "Always-on. Never asked to spin up anything else.",
      short: "The always-on low-power iGPU — a dedicated Xe4E tile capable of driving the full desktop and light 3D without ever waking a Compute Tile or Elementalist GPU tile.",
      detail: [
        "Arc® Druid is a physically separate tile from LP Island, fabricated alongside it on Intel 06E, in the same low-power cluster.",
        "Runs the entire desktop compositing and light-3D workload set at idle-adjacent power, so heavier GPU tiles (Elementalist) can stay fully power-gated.",
        "Scales in Xe4E-core count and boost clock by SKU tier, always present regardless of whether an Elementalist GPU tile is also on package."
      ]
    },

    bionzxr: {
      name: "BionzXR",
      codename: "QuickSync BionzXR · Intel × Sony",
      category: "Media · Efficiency",
      node: "Intel 06E (0.6nm-class FinFlex GAA)",
      color: "#3FAE8C",
      zone: "band1-left",
      repeatKey: null,
      tagline: "The flagship media engine. AV2, first to ship.",
      short: "The primary hardware media encode/decode tile, co-developed with Sony Semiconductor — the industry's first shipping AV2 hardware encoder.",
      detail: [
        "A physically separate 06E tile from LP Island and Arc Druid, in the same low-power cluster — not merged silicon.",
        "Handles the platform's flagship encode workloads: AV2, AV1, H.266/VVC, H.265, H.264, plus VRV1/VRV2 for VR codec transport.",
        "Feeds directly from the IPU tile for camera pipelines, and works alongside the lower-power MFX tile, which handles sustained decode-only playback without waking BionzXR."
      ]
    },

    hnpu: {
      name: "HNPU",
      codename: "High-Performance Neural Processing Unit",
      category: "AI / NPU",
      node: "Intel 04A",
      color: "#9333EA",
      zone: "band2-right",
      repeatKey: null,
      tagline: "The world's most advanced node, built for matrix math.",
      short: "The high-throughput NPU tile — the primary AI inference engine on every Eventide part.",
      detail: [
        "HNPU is a dedicated matrix-multiply fabric fabricated on Intel's leading-edge 04A node, separate from both CPU and GPU tiles.",
        "Supports INT2/4/8, FP8, BF16, FP16 and FP32 datatypes with family-tier-scaled throughput — TOPS figures scale with SKU tier and power class.",
        "Works in concert with the LPNPU (always-on) and the GPU's XMX5 matrix engines under a single Thread Director-coordinated AI scheduling domain."
      ]
    },

    gpu: {
      name: "Elementalist GPU Tile",
      codename: "Arc® Elementalist (E-series)",
      category: "GPU",
      node: "Intel 04A",
      color: "#FF6B35",
      zone: "band2-left",
      repeatKey: "gpuTiles",
      tagline: "Discrete-class graphics, integrated on package.",
      short: "A repeatable high-performance graphics tile. Multiple instances present as one logical GPU via FOveros 2.0.",
      detail: [
        "Each Elementalist tile carries Xe5-cores, XMX5 matrix (AI) engines and RTU5 ray-tracing units.",
        "On multi-tile SKUs, up to four Elementalist tiles are stitched into a single logical render device over the FOveros 2.0 photonic interconnect — invisible to the OS and to games.",
        "VR-native output hardware (VRV1/VRV2 codec blocks) ships on every Elementalist tile — the first Arc generation designed around native VR from the silicon up."
      ]
    },

    kanvas2d: {
      name: "2DKanvas",
      codename: "2DKR — 2D Kanvas Renderer",
      category: "GPU · Ancillary",
      node: "Intel 14A-E",
      color: "#49B7FF",
      zone: "band2-far-right",
      repeatKey: null,
      tagline: "Purpose-built 2D silicon. Zero shaders. Zero waste.",
      short: "A dedicated desktop-compositing tile with no 3D ALUs at all — the entire chip exists to draw 2D UI at sub-millisecond latency for under a watt.",
      detail: [
        "2DKanvas takes over desktop composition, window management and static-UI rendering so the 3D GPU tiles can power all the way down.",
        "A modernised Blitter Engine handles blend, scale and composite operations natively — no shader cores are present on this die at all.",
        "Enables true zero-3D-GPU idle states: full desktop responsiveness with every Elementalist tile and Arc Druid completely powered off."
      ]
    },

    zam: {
      name: "ZAM",
      codename: "Z-Angle Memory",
      category: "Memory",
      node: "Foveros-mounted",
      color: "#4DD9EC",
      zone: "band3-a",
      repeatKey: null,
      tagline: "Memory, mounted vertically, on package.",
      short: "Intel's on-package, FOveros-stacked memory subsystem — the primary memory for every Eventide SKU, with optional DDR6 expansion.",
      detail: [
        "ZAM chips mount directly on the FOveros 2.0 substrate in a vertical stack, dramatically shortening the memory path versus off-package DIMMs.",
        "Dual-channel ZAM controllers feed the compute fabric directly; an optional DDR6/LPDDR6X controller allows external capacity expansion.",
        "Inline ECC correction runs across both the ZAM and DDR6 paths.",
        "Works alongside the Kache Kore™ L4 / bLLC cache pool as a latency-hiding layer for large working sets."
      ]
    },

    klangkerne: {
      name: "Klangkerne",
      codename: "Audio DSP Base Die",
      category: "Audio",
      node: "Intel 14A-E",
      color: "#C9A227",
      zone: "band3-b",
      repeatKey: null,
      stacked: true,
      stackTileId: "sort",
      tagline: "The base of Eventide's audio stack — DSP first, ray tracing bonded on top.",
      short: "An 18mm² audio DSP base die carrying the mixer/DSP grid, the Tiefton resonator bank and the Hallraum output stage, co-engineered with Bang & Olufsen's acoustic engineering group in Copenhagen.",
      detail: [
        "Klangkerne owns the full classical audio pipeline: mixing, the Tiefton resonator bank (physical-modeling resonance synthesis), and the Hallraum output stage (final transducer-matched rendering).",
        "SoRT — a separate sound-ray-tracing die — is hybrid-bonded directly on top of Klangkerne via Foveros 2.0; the two are physically stacked but function as independent tiles with independent specs.",
        "The hybrid-bond handoff from SoRT's parametric impulse response to Klangkerne's convolution engine costs just 0.02ms — Foveros 2.0 makes the two dies, for scheduling purposes, one.",
        "Klangkerne also hosts the codec bridge and transducer inversion stage, applying measured-transfer-function DSP to whichever acoustic field it receives — from SoRT, from software, or from a static preset."
      ]
    },

    sort: {
      name: "SoRT",
      codename: "Sound Ray Tracing Die",
      category: "Audio · Ray Tracing",
      node: "Intel 04A",
      color: "#8A6D1F",
      zone: "stack-on-klangkerne",
      repeatKey: null,
      tagline: "Real acoustic ray tracing, hybrid-bonded onto Klangkerne, for 0.0% frame cost.",
      short: "A 7.2mm² dedicated sound-ray-tracing die, stacked on Klangkerne via a 0.4µm-pitch Foveros 2.0 hybrid bond — the world's first shipping consumer sound-ray-tracing silicon.",
      detail: [
        "SoRT carries the Traversal Engine, Diffraction Unit, Binaural Divergence Unit and IR Assembler — a fixed-function pipeline computing real acoustic reflection, diffraction and occlusion, not a shader approximation.",
        "Every acoustic block is computed at a hard 2.67ms real-time deadline (the Sonoral™ runtime's scheduling contract) for roughly 118mW typical — versus 1.8W+ for a CPU-software approximation of the same field.",
        "Because SoRT never touches the GPU's render path, its ray tracing costs 0.0% GPU frame time — unlike time-slicing audio rays on the GPU's own RTU units, which steals ray-tracing hardware from frame rendering at exactly the wrong moments.",
        "Adds only 38 microns of package height over Klangkerne's base die, bonded at 0.4µm pitch — for scheduling purposes, Foveros 2.0 makes the two dies effectively one.",
        "Programmed by the Sonoral™ runtime and marketed under the AcoustX™ platform brand alongside Klangkerne."
      ]
    },

    io: {
      name: "I/O Tile",
      codename: "Platform I/O Controller",
      category: "I/O",
      node: "Intel 14A-E",
      color: "#8B95A5",
      zone: "band3-c",
      repeatKey: null,
      tagline: "Every wire, every protocol, one tile.",
      short: "Consolidates PCIe, Thunderbolt, USB4 and storage fan-out into a single controller die.",
      detail: [
        "Hosts the platform's PCIe 7.0/6.0 root complex, Thunderbolt 5 controller, and USB4 Gen 4×2 fan-out.",
        "Decouples high-speed I/O timing from the compute tiles, letting the CPU tiles power-gate independently of active external links."
      ]
    },

    psm: {
      name: "PSM Tile",
      codename: "Platform Security & Management",
      category: "Security",
      node: "Intel 14A-E",
      color: "#E0524A",
      zone: "band3-c",
      repeatKey: null,
      tagline: "Security beneath the software.",
      short: "Hosts the hardware root of trust, Pluton security processor and platform power management sequencing.",
      detail: [
        "Runs Microsoft Pluton and the TPM 2.1 hardware root of trust below the OS boundary.",
        "Owns platform-wide power sequencing for AFFINITY™ profile transitions and tile-level sleep/wake."
      ]
    },

    killers1: {
      name: "Killer SignalBoost S1",
      codename: "Killer™ S1 Wireless",
      category: "Wireless",
      node: "Intel 14A-E",
      color: "#2E86FF",
      zone: "band3-c",
      repeatKey: "killerS1Count",
      tagline: "Eight bands. One intelligence.",
      short: "Intel × OPPO co-engineered Wi-Fi 7 / Bluetooth / cellular tile with adaptive multi-band arbitration.",
      detail: [
        "Drives Intel® Killer™ Wi-Fi 7 (802.11be) across up to two X1 chips, quad-band each, for eight total simultaneous bands.",
        "Bluetooth Core 6.2 and 5G Sub-6/mmWave cellular share the same tile and antenna-steering logic.",
        "Powers SONAR — Wake-on-Wi-Fi presence sensing that detects a user approaching before they touch the device."
      ]
    },

    ipu: {
      name: "IPU Tile",
      codename: "Image Processing Unit 8.2",
      category: "Imaging",
      node: "Intel 14A-E",
      color: "#E85D9E",
      zone: "band3-c",
      repeatKey: null,
      tagline: "201 megapixels. Zero compromise.",
      short: "Intel × Sony co-engineered camera pipeline tile, native to USB-C/Thunderbolt sensor input.",
      detail: [
        "Supports up to 201MP sensor input with native USB-C/Thunderbolt camera ingestion — no external ISP required.",
        "Feeds directly into BionzXR for hardware encode of camera pipelines without round-tripping through system memory."
      ]
    },

    mfx: {
      name: "MFX Tile",
      codename: "MFX QuickSync (Low-Power)",
      category: "Media · LP",
      node: "Intel 14A-E",
      color: "#34B3A1",
      zone: "band3-c",
      repeatKey: null,
      tagline: "Streaming, without the power tax.",
      short: "A low-power decode-focused media tile that keeps video playback off the Compute and LP Island power budget.",
      detail: [
        "Handles AV2, AV1, H.266/VVC, H.265, H.264 and VP9 decode at roughly 35% lower power than prior-generation QuickSync blocks.",
        "Purpose-built for sustained video playback and conferencing without waking BionzXR or any Compute Tile."
      ]
    },

    gna: {
      name: "GNA Tile",
      codename: "Gaussian & Neural Accelerator 5.0",
      category: "AI · Audio",
      node: "Intel 14A-E",
      color: "#A78BFA",
      zone: "band3-c",
      repeatKey: null,
      tagline: "The engine that never sleeps.",
      short: "An ultra-low-power inference block dedicated to always-on audio intelligence — noise suppression, wake word, and voice isolation.",
      detail: [
        "Runs Intel® Smart Sound Technology's noise suppression and speaker-isolation models continuously at milliwatt-class power.",
        "Works alongside LPNPU as a co-pilot for Thread Director's audio-aware scheduling decisions."
      ]
    },

    display: {
      name: "Display Tile",
      codename: "Unified Display Engine",
      category: "Display",
      node: "Intel 14A-E",
      color: "#C9D1DB",
      zone: "band3-c",
      repeatKey: null,
      tagline: "One controller. Six displays. No limits.",
      short: "Decouples rendering from presentation — any GPU tile can output to any display, simultaneously, without MUX switching.",
      detail: [
        "A unified display architecture: any Elementalist tile, Arc Druid, or 2DKanvas can drive any output — no MUX switching, no added latency.",
        "Drives up to six native displays across eDP 1.5, Intel×Sony eDP 2.0 (over PCIe 7.0), DisplayPort 2.1 UHBR20 and HDMI 2.1 FRL."
      ]
    },

    threaddirector: {
      name: "Thread Director",
      codename: "Dedicated Scheduler Silicon",
      category: "Platform",
      node: "Intel 04A",
      color: "#0068B5",
      zone: "band3-c",
      repeatKey: null,
      tagline: "Intelligence that never waits.",
      short: "A dedicated in-fabric scheduling tile — not a software layer — making sub-100-nanosecond core, GPU and NPU placement decisions.",
      detail: [
        "Hardware-native 5-class core scheduling (UHP/DP/SPE/UHE/LPE) plus a sixth GPU-coupled dispatch class for RT/BVH work.",
        "Decisions are made in under 100 nanoseconds, in silicon — not polled by an OS scheduler.",
        "Co-pilots with LPNPU and GNA for predictive, AI-assisted task placement, and drives AFFINITY™ power-profile transitions across Battery / Adapter / Dock contexts."
      ]
    },

    kachekore: {
      name: "Kache Kore™",
      codename: "L4 / bLLC Shared Cache Interposer",
      category: "Cache · Fabric Hub",
      node: "Intel 04A / 06E hybrid interposer",
      color: "#F0B848",
      zone: "core",
      repeatKey: null,
      tagline: "Every tile's shortest path to everywhere else.",
      short: "The physical and logical center of the package — a shared L4/bLLC cache interposer that every other tile connects through over FOveros 2.0.",
      detail: [
        "Kache Kore sits at the physical center of the Eventide package. Every tile — Compute, LP Island, GPU, HNPU, ZAM, and every ancillary die — attaches to it directly over the FOveros 2.0 fabric, rather than routing through a neighbor tile.",
        "Placement on the package is not arbitrary: tiles that are most latency-sensitive to Kache Kore (Compute, LP Island, HNPU, ZAM) sit in the innermost ring around it. Tiles with looser latency budgets (wireless, camera, security, display) sit in the outer ring, furthest from the cache fabric.",
        "Acts as a latency-hiding cache layer for ZAM/DDR6 — hot working sets stay resident here instead of round-tripping to package memory.",
        "Shared across CPU, GPU and NPU tiles simultaneously, letting a texture written by a GPU tile or an activation written by HNPU be read by a Compute Tile without leaving the cache hierarchy."
      ]
    }
  };

  /* Ordered zone layout used by the floorplan renderer. */
  var ZONES = ["core", "top-right", "right", "top", "left", "far-left", "bottom", "bottom-left", "bottom-right"];

  /* Glossary of inline terms eligible for a (?) tooltip inside spec rows. */
  var GLOSSARY = {
    "FOveros 2.0": "Intel's photonic tile-to-tile interconnect, co-developed with Lightmatter (USA). Replaces copper die-to-die links with on-package optical signaling.",
    "HyperBOOST": "V8 HyperBOOST — all 8 UHP (Solar Eclipse) cores run a Ford Mustang V8-inspired offset firing sequence (1-4-6-3-8-5-7-2) to sustain an effective 10 GHz across 8–40ms burst windows. UHP-exclusive, Unleashed AFFINITY™ only, requires external PSU + cooler, auto-disabled on battery.",
    "Kache Kore": "A large shared L4 / bLLC cache pool acting as latency-hiding DRAM for hot working sets, shared across CPU, GPU and NPU tiles.",
    "AFFINITY": "Eventide's platform-wide power profile system — Supersaver / Efficiency / Balanced / Performance / Unleashed — enforced in hardware by Thread Director and the LPNPU co-pilot.",
    "ZAM": "Z-Angle Memory — Intel's on-package, FOveros-stacked memory subsystem.",
    "XMX5": "Fifth-generation Xe Matrix eXtensions — the matrix/AI acceleration units embedded in each Elementalist GPU tile.",
    "RTU5": "Fifth-generation Ray Tracing Units — dedicated BVH traversal and intersection hardware on each Elementalist GPU tile.",
    "SoRT": "Sound Ray Tracing — a dedicated die stacked on the Klangkerne audio tile via Foveros 2.0, computing hardware-accelerated acoustic reflection and diffraction.",
    "2DKR": "2D Kanvas Renderer — a shader-free 2D compositing tile that lets 3D GPU tiles power down entirely at idle.",
    "Pluton": "Microsoft Pluton security processor, integrated into the PSM tile as a hardware root of trust below the OS.",
    "vPro": "Intel's hardware-rooted manageability and security platform for business-class systems.",
    "Smart Sound Technology": "Intel's always-on audio DSP pipeline, accelerated by the GNA tile for noise suppression and wake-word detection.",
    "GNA": "Gaussian & Neural Accelerator — a milliwatt-class always-on inference tile dedicated to audio intelligence.",
    "IPU": "Image Processing Unit — Intel × Sony's camera pipeline tile, supporting up to 201MP native sensor input.",
    "BionzXR": "QuickSync BionzXR — Intel × Sony's flagship media encode/decode engine, including the industry's first shipping AV2 hardware encoder.",
    "Killer": "Intel × OPPO's Killer SignalBoost S1 wireless tile — Wi-Fi 7, Bluetooth 6.2 and 5G cellular with SONAR presence sensing.",
    "DirectStorage": "Intel DirectStorage 2.0 — a staged data path from DDR6 through ZAM to the Kache Kore bLLC for fast asset streaming.",
    "Sonoral": "Intel's audio ray-tracing platform brand — the software/driver layer that programs the SoRT die.",
    "Thread Director": "A dedicated in-fabric scheduling tile making hardware-native, sub-100ns core/GPU/NPU placement decisions."
  };

  global.EventideTiles = { CATALOG: TILE_CATALOG, ZONES: ZONES, GLOSSARY: GLOSSARY };
})(window);
