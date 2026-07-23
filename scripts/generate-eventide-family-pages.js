#!/usr/bin/env node
/* ==========================================================================
   Generates the 6 Eventide "Family" deep-dive pages — one per product
   family (Core 500, Core i500, Core Ultra 500, Core Xeon 500, Atom 500,
   Atom Ultra 500). Unlike the CPU/GPU/Tile deep dives (a full ARK-style
   spec sheet), these are small, animated overview pages: what defines the
   tier, its tile composition, and links out to the individual component
   deep dives it's built from.
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "Intel", "Eventide", "Family");

const FAMILIES = [
  {
    slug: "Core500",
    prefix: "c5",
    name: "Core 500",
    eyebrow: "Product Family · Essential / Mainstream",
    headline: "Fanless by design.<br>Nothing to spare.",
    sub: "The entry point into Eventide — LP Island only, Arc Druid iGPU, and a die small enough to go fanless.",
    accent: "#F0B848", accent2: "#9333EA", bg1: "#1A0A2E", bg2: "#0B0714",
    logo: "core500.svg",
    stats: [["0", "Compute Tiles"], ["2", "Cores present (UHE + LPE)"], ["88T", "LPNPU AI"]],
    features: [
      ["no", "No Compute Tile — LP Island only"],
      ["no", "No high-performance iGPU (no Elementalist)"],
      ["yes", "Low Power Island: Lunar Eclipse (UHE) + Darkmont (LPE)"],
      ["yes", "Arc® Druid low-power iGPU + 2DKanvas compositor"],
      ["yes", "LPNPU AI, 88 TOPS always-on"],
      ["partial", "HNPU present in a low-power configuration"],
      ["no", "No BionzXR media cores"],
      ["yes", "Z-Angle Memory (ZAM), on-package, fanless"]
    ],
    links: [
      ["Lunar Eclipse (UHE)", "/Intel/Eventide/CPU/LunarEclipse"],
      ["Darkmont (LPE)", "/Intel/Eventide/CPU/Darkmont"],
      ["Arc Druid", "/Intel/Eventide/GPU/Druid"],
      ["2DKanvas", "/Intel/Eventide/GPU/2DKanvas"],
      ["ZAM", "/Intel/Eventide/Tile/ZAM"]
    ],
    use: "Fanless ultra-thin designs, extreme battery life, everyday computing."
  },
  {
    slug: "CoreI500",
    prefix: "ci5",
    name: "Core i500",
    eyebrow: "Product Family · Mid to Enthusiast",
    headline: "The classic tier.<br>No LP complexity.",
    sub: "A conventional high-clock CPU tier — Compute Tile only, no LP Island, no NPU, no ZAM. Gaming and workstation performance without the efficiency architecture.",
    accent: "#0068B5", accent2: "#F0B848", bg1: "#0A1A2E", bg2: "#04101E",
    logo: "corei500.svg",
    stats: [["1", "Compute Tile"], ["UHP+DP", "Core mix, no SPE"], ["DDR6", "Conventional memory"]],
    features: [
      ["yes", "Compute Tile — Solar Eclipse (UHP) + Sunset Cove (DP) only"],
      ["no", "No SPE (Venusmont) cores in the Compute Tile"],
      ["no", "No Low Power Island — classic always-on design"],
      ["partial", "Arc Druid iGPU only — no Elementalist (F-suffix removes it entirely)"],
      ["no", "No NPU — HNPU and LPNPU both disabled"],
      ["yes", "2DKanvas, MFX QuickSync, IPU camera pipeline"],
      ["no", "No BionzXR"],
      ["yes", "Conventional DDR6 — no Z-Angle Memory"]
    ],
    links: [
      ["Solar Eclipse (UHP)", "/Intel/Eventide/CPU/SolarEclipse"],
      ["Sunset Cove (DP)", "/Intel/Eventide/CPU/SunsetCove"],
      ["Arc Druid", "/Intel/Eventide/GPU/Druid"],
      ["MFX Tile", "/Intel/Eventide/Tile/MFX"],
      ["IPU Tile", "/Intel/Eventide/Tile/IPU"]
    ],
    use: "Classic Intel performance tier — gaming and workstation without LP Island complexity."
  },
  {
    slug: "CoreUltra500",
    prefix: "cu5",
    name: "Core Ultra 500",
    eyebrow: "Product Family · High to Enthusiast",
    headline: "The everyday<br>Eventide flagship.",
    sub: "Everything, at once — Compute Tile, full LP Island, Elementalist GPU, BionzXR, and the complete AFFINITY™ system.",
    accent: "#9333EA", accent2: "#F0B848", bg1: "#1A0A2E", bg2: "#0B0714",
    logo: "coreultra500.svg",
    stats: [["1", "Compute Tile + full LP Island"], ["1×", "Arc E1080 (X-suffix)"], ["256T", "HNPU AI"]],
    features: [
      ["yes", "Single Compute Tile with limited SPE cores"],
      ["yes", "Full Low Power Island — UHE + LPE"],
      ["yes", "Up to ×1 Arc® Elementalist E1080 (X-suffix only)"],
      ["yes", "Arc® Druid LP iGPU always present"],
      ["yes", "HNPU up to 256 TOPS + LPNPU always-on"],
      ["yes", "BionzXR media cores (up to 4)"],
      ["yes", "Full AFFINITY™ power system, Supersaver → Unleashed"],
      ["yes", "Z-Angle Memory + optional DDR6 expansion"]
    ],
    links: [
      ["Solar Eclipse (UHP)", "/Intel/Eventide/CPU/SolarEclipse"],
      ["Venusmont (SPE)", "/Intel/Eventide/CPU/Venusmont"],
      ["Elementalist GPU", "/Intel/Eventide/GPU/Elementalist"],
      ["Arc Druid", "/Intel/Eventide/GPU/Druid"],
      ["Thread Director", "/Intel/Eventide/Technology/ThreadDirector"]
    ],
    use: "The everyday Eventide experience. Flagship laptop tier."
  },
  {
    slug: "CoreXeon500",
    prefix: "cx5",
    name: "Core Xeon 500",
    eyebrow: "Product Family · X500 · Ultimate",
    headline: "No compromise.<br>Mobile supercomputer.",
    sub: "Up to 4× Compute Tiles, 4× Arc E1080, 288+ SPE cores. The top of the Eventide stack — vPro, Pluton, full AFFINITY™.",
    accent: "#F0B848", accent2: "#9333EA", bg1: "#1A0A2E", bg2: "#0B0714",
    logo: "corexeon500.svg",
    stats: [["4×", "Compute Tiles (max)"], ["4×", "Arc E1080 (max)"], ["2000W", "Unleashed, docked"]],
    features: [
      ["yes", "Up to 4× Compute Tiles"],
      ["yes", "288+ SPE (Venusmont) cores"],
      ["yes", "Full Low Power Island"],
      ["yes", "Up to 4× Arc® Elementalist E1080"],
      ["yes", "Arc® Druid LP iGPU always present"],
      ["yes", "HNPU 256 TOPS + LPNPU 88 TOPS"],
      ["yes", "8× BionzXR media cores"],
      ["yes", "Full AFFINITY™ + vPro + Pluton, up to 2,000W docked"]
    ],
    links: [
      ["Solar Eclipse (UHP)", "/Intel/Eventide/CPU/SolarEclipse"],
      ["Venusmont (SPE)", "/Intel/Eventide/CPU/Venusmont"],
      ["Elementalist GPU", "/Intel/Eventide/GPU/Elementalist"],
      ["Kache Kore", "/Intel/Eventide/Technology/ThreadDirector"],
      ["Killer S1", "/Intel/Eventide/Tile/KillerS1"]
    ],
    use: "No-compromise. Mobile supercomputer, OEM/SI workstation channel."
  },
  {
    slug: "Atom500",
    prefix: "a5",
    name: "Atom 500",
    eyebrow: "Product Family · Phone · Mainstream",
    headline: "Eventide,<br>rescaled for your pocket.",
    sub: "The Eventide architecture in a phone SoC — LP Island, Arc Druid, 2DKanvas, Thread Director — with no Compute Tile, no Elementalist, and no Kache Kore.",
    accent: "#3B82F6", accent2: "#22D3EE", bg1: "#0A1628", bg2: "#050B14",
    logo: "atom500.svg",
    stats: [["2.6-4.0", "GHz clock ladder (A3→A9)"], ["0.05W", "Idle floor"], ["88T", "LPNPU AI"]],
    features: [
      ["no", "No Compute Tile, no Elementalist GPU, no Kache Kore"],
      ["yes", "0-2× Lunar Eclipse (UHE) + 6-8× Darkmont (LPE)"],
      ["partial", "A3 is LPE-only — no UHE cores at all, the floor of the whole Atom stack"],
      ["yes", "Arc® Druid LP iGPU + 2DKanvas frame-level routing"],
      ["yes", "LPNPU AI, 88 TOPS always-on — the phone tier's sole NPU"],
      ["no", "No HNPU — the 04A-node NPU complex has no home on this die"],
      ["yes", "LPDDR6X primary memory — no ZAM, no DDR6"],
      ["yes", "BionzXR + QuickSync ISP camera pipeline"],
      ["partial", "Single Killer S1 tile — quad-band WiFi 7"]
    ],
    links: [
      ["Lunar Eclipse (UHE)", "/Intel/Eventide/CPU/LunarEclipse"],
      ["Darkmont (LPE)", "/Intel/Eventide/CPU/Darkmont"],
      ["Arc Druid", "/Intel/Eventide/GPU/Druid"],
      ["2DKanvas", "/Intel/Eventide/GPU/2DKanvas"],
      ["Thread Director", "/Intel/Eventide/Technology/ThreadDirector"]
    ],
    use: "Everyday mainstream phones — extreme battery life, from the LPE-only budget floor up to A9."
  },
  {
    slug: "AtomUltra500",
    prefix: "au5",
    name: "Atom Ultra 500",
    eyebrow: "Product Family · Phone · Flagship",
    headline: "Two radios.<br>One phone.",
    sub: "Atom's flagship tier adds a bigger Arc Druid class, UHE clocks up to 5.0GHz, and the signature DX suffix: dual Killer S1 controllers running independent quad-band WiFi 7 MLO stacks — 8 bands total.",
    accent: "#22D3EE", accent2: "#3B82F6", bg1: "#0A1628", bg2: "#050B14",
    logo: "atomultra500.svg",
    stats: [["5.0", "GHz peak (P9 flagship)"], ["7", "cores on P7 (foldable)"], ["8", "WiFi 7 bands, DX suffix"]],
    features: [
      ["no", "No Compute Tile, no Elementalist GPU, no Kache Kore"],
      ["yes", "2× Lunar Eclipse (UHE, 4.3-5.0GHz) + 5-8× Darkmont (LPE)"],
      ["partial", "P7 is a dedicated 7-core config (2 UHE + 5 LPE) tuned for foldables"],
      ["yes", "Bigger Arc® Druid class than Atom 500 + 2DKanvas"],
      ["yes", "LPNPU AI, 88 TOPS always-on"],
      ["no", "No HNPU on this line"],
      ["yes", "LPDDR6X primary memory, higher capacity than Atom 500"],
      ["yes", "BionzXR + QuickSync ISP camera pipeline"],
      ["yes", "DX suffix: 2× Killer S1 controllers, independent quad-band MLO — 8 bands total, phone appears as two devices"]
    ],
    links: [
      ["Killer S1", "/Intel/Eventide/Tile/KillerS1"],
      ["Arc Druid", "/Intel/Eventide/GPU/Druid"],
      ["2DKanvas", "/Intel/Eventide/GPU/2DKanvas"],
      ["Thread Director", "/Intel/Eventide/Technology/ThreadDirector"],
      ["Darkmont (LPE)", "/Intel/Eventide/CPU/Darkmont"]
    ],
    use: "The top phone tier — dual-ISP WiFi bonding is the signature, headline feature."
  }
];

function render(f) {
  const p = f.prefix;
  const statsHtml = f.stats.map(([num, label], i) =>
    `<div class="${p}-stat" style="animation-delay:${0.5 + i * 0.08}s"><div class="${p}-stat-num">${num}</div><div class="${p}-stat-label">${label}</div></div>`
  ).join("\n        ");
  const featuresHtml = f.features.map(([kind, text], i) =>
    `<div class="${p}-feature-wrap" style="transition-delay:${i * 0.05}s"><div class="${p}-feature"><div class="${p}-dot ${kind}"></div>${text}</div></div>`
  ).join("\n        ");
  const linksHtml = f.links.map(([label, dpath], i) =>
    `<div class="${p}-chip" data-deepdive-path="${dpath}" style="transition-delay:${i * 0.05}s">${label} <span class="${p}-chip-arrow">→</span></div>`
  ).join("\n        ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${f.name} — Eventide Family Overview</title>
<link rel="stylesheet" href="../../../../assets/nav.css">
<script src="../../../../assets/nav.js" defer><\/script>
<link rel="stylesheet" href="../../deepdive.css">
<style>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
:root {
  --${p}-bg1: ${f.bg1}; --${p}-bg2: ${f.bg2};
  --${p}-accent: ${f.accent}; --${p}-accent2: ${f.accent2};
}
body { background: var(--${p}-bg2); }
.${p}-wrap {
  min-height: 100vh;
  padding: 100px 8vw 80px;
  background: radial-gradient(120% 90% at 15% 0%, ${f.accent}22 0%, var(--${p}-bg1) 55%, var(--${p}-bg2) 100%);
  color: #fff;
  font-family: 'Space Grotesk', sans-serif;
  overflow: hidden;
}
.${p}-logo { width: 72px; height: 72px; border-radius: 16px; opacity: 0; animation: ${p}-fadeScale 0.7s ease forwards; }
@keyframes ${p}-fadeScale { from { opacity: 0; transform: scale(0.7) rotate(-8deg); } to { opacity: 1; transform: scale(1) rotate(0); } }
.${p}-eyebrow {
  font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--${p}-accent); margin: 22px 0 10px; opacity: 0; animation: ${p}-riseIn 0.6s ease 0.15s forwards;
}
.${p}-headline {
  font-family: 'Bebas Neue', sans-serif; font-size: clamp(38px, 6vw, 74px); line-height: 0.98; letter-spacing: 0.01em;
  max-width: 780px; opacity: 0; animation: ${p}-riseIn 0.6s ease 0.28s forwards;
}
.${p}-sub {
  max-width: 640px; margin-top: 18px; font-size: 15px; line-height: 1.7; color: rgba(255,255,255,0.72);
  opacity: 0; animation: ${p}-riseIn 0.6s ease 0.42s forwards;
}
@keyframes ${p}-riseIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }

.${p}-stats { display: flex; flex-wrap: wrap; gap: 28px; margin-top: 40px; }
.${p}-stat { opacity: 0; animation: ${p}-riseIn 0.55s ease forwards; }
.${p}-stat-num { font-family: 'Bebas Neue', sans-serif; font-size: 34px; color: var(--${p}-accent); line-height: 1; }
.${p}-stat-label { font-size: 11px; color: rgba(255,255,255,0.55); margin-top: 4px; max-width: 140px; }

.${p}-section-label {
  font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase;
  color: rgba(255,255,255,0.4); margin: 64px 0 18px;
}
.${p}-feature-grid { display: grid; grid-template-columns: repeat(2, minmax(240px, 1fr)); gap: 6px 32px; max-width: 900px; }
.${p}-feature-wrap { }
.${p}-feature {
  display: flex; align-items: flex-start; gap: 10px; font-size: 13.5px; color: rgba(255,255,255,0.82);
  padding: 9px 0; border-bottom: 1px solid rgba(255,255,255,0.06);
  opacity: 0; transform: translateX(-10px); transition: opacity 0.5s ease, transform 0.5s ease;
}
.${p}-feature.on { opacity: 1; transform: translateX(0); }
.${p}-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
.${p}-dot.yes { background: #16A34A; box-shadow: 0 0 8px #16A34A88; }
.${p}-dot.no { background: #DC2626; }
.${p}-dot.partial { background: var(--${p}-accent); }

.${p}-chip-row { display: flex; flex-wrap: wrap; gap: 10px; max-width: 900px; }
.${p}-chip {
  font-family: 'IBM Plex Mono', monospace; font-size: 12px; padding: 10px 16px; border-radius: 30px; cursor: pointer;
  border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.04); color: #fff;
  transition: background 0.2s ease, border-color 0.2s ease, opacity 0.5s ease, transform 0.5s ease;
  opacity: 0; transform: translateY(8px);
}
.${p}-chip.on { opacity: 1; transform: translateY(0); }
.${p}-chip:hover { background: var(--${p}-accent); border-color: var(--${p}-accent); color: #0B0714; }
.${p}-chip-arrow { opacity: 0.6; }

.${p}-use {
  margin-top: 56px; max-width: 700px; padding: 20px 24px; border-left: 3px solid var(--${p}-accent);
  background: rgba(255,255,255,0.03); font-size: 14px; color: rgba(255,255,255,0.75); line-height: 1.6;
  opacity: 0; transition: opacity 0.6s ease;
}
.${p}-use.on { opacity: 1; }

@media (max-width: 720px) {
  .${p}-feature-grid { grid-template-columns: 1fr; }
}
</style>
</head>
<body>
  <a class="back-button" href="../../">← Back to Overview</a>
  <div id="deepdive-container" class="deepdive-container">
    <div class="${p}-wrap">
      <img class="${p}-logo" src="../../assets/logos/${f.logo}" alt="${f.name} logo">
      <div class="${p}-eyebrow">${f.eyebrow}</div>
      <div class="${p}-headline">${f.headline}</div>
      <div class="${p}-sub">${f.sub}</div>

      <div class="${p}-stats">
        ${statsHtml}
      </div>

      <div class="${p}-section-label">Tile Composition</div>
      <div class="${p}-feature-grid" id="${p}-features">
        ${featuresHtml}
      </div>

      <div class="${p}-section-label">Built From</div>
      <div class="${p}-chip-row" id="${p}-chips">
        ${linksHtml}
      </div>

      <div class="${p}-use" id="${p}-use">${f.use}</div>
    </div>
  </div>
  <script>
  (function () {
    "use strict";
    function navigateToDeepdive(path) {
      var rel = path.replace(/^\\/Intel\\/Eventide\\//, '');
      if (!rel.endsWith('/')) rel += '/';
      window.location.href = '../../' + rel;
    }
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-deepdive-path]');
      if (el) navigateToDeepdive(el.getAttribute('data-deepdive-path'));
    });
    function reveal(t) {
      t.classList.add('on');
      var feat = t.querySelector('.${p}-feature');
      if (feat) feat.classList.add('on');
    }
    var targets = document.querySelectorAll('#${p}-features > *, #${p}-chips > *, #${p}-use');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { reveal(entry.target); io.unobserve(entry.target); }
        });
      }, { threshold: 0.15 });
      targets.forEach(function (t) { io.observe(t); });
    } else {
      targets.forEach(reveal);
    }
  })();
  <\/script>
</body>
</html>
`;
}

function main() {
  let ok = 0;
  FAMILIES.forEach((f) => {
    const dir = path.join(ROOT, f.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), render(f), "utf8");
    ok++;
  });
  console.log(`Generated ${ok} Family deep-dive pages.`);
}

main();
