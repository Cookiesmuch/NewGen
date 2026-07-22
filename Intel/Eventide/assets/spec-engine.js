/* ==========================================================================
   Eventide Spec Engine — interactive die-map + accordion wiring.
   Consumes: window.EventideTiles (tile-catalog.js) and a per-page JSON
   blob <script type="application/json" id="ev-sku-data"> containing the
   list of tiles physically present on that SKU (+ instance counts) and
   SKU-specific numbers for the tile focus card.
   ========================================================================== */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) { if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]); }
    return n;
  }

  /* ------------------------------------------------------------------
   * Real fixed-size floorplan. Every tile renders at its EXACT declared
   * box from tile-sizes.js — no stretching, ever — and the tiles are
   * packed as tightly as possible around a centre-pinned Kache Kore by a
   * MaxRects bin-packer (see below), then mounted on a continuous base
   * die / interposer that spans the whole package. Wherever no tile sits,
   * the textured base die shows through: that's real structural silicon,
   * exactly as on a Foveros package, not dead space — which is how the
   * die stays a clean rectangle with true tile sizes and no stretching.
   *
   * ZAM/LPDDR6X renders as a band of fixed-size modules below the tile
   * cluster; the package bounding box grows to fit whichever of the two
   * (cluster vs. memory band) is wider.
   * ------------------------------------------------------------------ */
  var GAP = 6;   // real gap between adjacent tiles (substrate reveal)
  var M = 20;    // outer margin to the package substrate edge

  /* MaxRects bin-packer (Best-Short-Side-Fit). Packs a set of {w,h} units into
     a bin as tightly as the free-rectangle heuristic allows, optionally around
     an already-placed unit (Kache Kore, pinned to the bin centre). Units are
     inflated by GAP during packing so a real substrate channel is left between
     neighbours; the returned coords use the true (un-inflated) size. Returns a
     placement list or null if something didn't fit (caller then grows the bin).
     ~20 units, runs once per render — cost is irrelevant. */
  function packMaxRects(units, pinned, binW, binH, pinX, pinY) {
    var free = [{ x: 0, y: 0, w: binW, h: binH }];
    var out = [];
    function contains(a, b) {
      return a.x <= b.x + 0.01 && a.y <= b.y + 0.01 &&
             a.x + a.w >= b.x + b.w - 0.01 && a.y + a.h >= b.y + b.h - 0.01;
    }
    function carve(u) { // u = {x,y,w,h} inflated footprint just consumed
      var next = [];
      for (var i = 0; i < free.length; i++) {
        var f = free[i];
        if (u.x >= f.x + f.w || u.x + u.w <= f.x || u.y >= f.y + f.h || u.y + u.h <= f.y) { next.push(f); continue; }
        if (u.x > f.x) next.push({ x: f.x, y: f.y, w: u.x - f.x, h: f.h });
        if (u.x + u.w < f.x + f.w) next.push({ x: u.x + u.w, y: f.y, w: (f.x + f.w) - (u.x + u.w), h: f.h });
        if (u.y > f.y) next.push({ x: f.x, y: f.y, w: f.w, h: u.y - f.y });
        if (u.y + u.h < f.y + f.h) next.push({ x: f.x, y: u.y + u.h, w: f.w, h: (f.y + f.h) - (u.y + u.h) });
      }
      var pruned = [];
      for (var i = 0; i < next.length; i++) {
        var c = false;
        for (var j = 0; j < next.length; j++) { if (i !== j && contains(next[j], next[i])) { c = true; break; } }
        if (!c) pruned.push(next[i]);
      }
      free = pruned;
    }

    if (pinned) {
      var kw = pinned.w + GAP, kh = pinned.h + GAP;
      var wantX = (pinX != null) ? pinX : (binW / 2 - kw / 2);
      var wantY = (pinY != null) ? pinY : (binH / 2 - kh / 2);
      var kx = Math.max(0, Math.min(wantX, binW - kw));
      var ky = Math.max(0, Math.min(wantY, binH - kh));
      out.push({ unit: pinned, x: kx, y: ky });
      carve({ x: kx, y: ky, w: kw, h: kh });
    }
    // largest-first — big blocks (GPU, Compute) anchor corners, smalls fill in
    var sorted = units.slice().sort(function (a, b) {
      return (b.w + GAP) * (b.h + GAP) - (a.w + GAP) * (a.h + GAP);
    });
    for (var s = 0; s < sorted.length; s++) {
      var it = sorted[s], iw = it.w + GAP, ih = it.h + GAP;
      var best = -1, bScore = Infinity, bLong = Infinity, bx = 0, by = 0;
      for (var i = 0; i < free.length; i++) {
        var f = free[i];
        if (iw <= f.w + 0.01 && ih <= f.h + 0.01) {
          var leftH = f.w - iw, leftV = f.h - ih;
          var shortS = Math.min(leftH, leftV), longS = Math.max(leftH, leftV);
          if (shortS < bScore - 0.01 || (Math.abs(shortS - bScore) <= 0.01 && longS < bLong)) {
            bScore = shortS; bLong = longS; best = i; bx = f.x; by = f.y;
          }
        }
      }
      if (best < 0) return null;
      out.push({ unit: it, x: bx, y: by });
      carve({ x: bx, y: by, w: iw, h: ih });
    }
    return out;
  }

  // visible extent of a packed result (un-inflated tile sizes)
  function clusterBounds(res) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    res.forEach(function (p) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + p.unit.w); maxY = Math.max(maxY, p.y + p.unit.h);
    });
    return { minX: minX, minY: minY, w: maxX - minX, h: maxY - minY };
  }

  function buildLayout(tiles) {
    var S = window.EventideTileSizes;
    var byId = {};
    tiles.forEach(function (t) {
      var meta = window.EventideTiles.CATALOG[t.id];
      if (meta) byId[t.id] = { t: t, meta: meta };
    });

    var placed = [];

    function leafCell(id) {
      var e = byId[id];
      if (!e) return null;
      var sz = S.sizeOf(id, e);
      return {
        id: id, w: sz.w, h: sz.h,
        place: function (x, y) {
          placed.push({ id: id, meta: e.meta, model: e.t.model, index: 0, count: 1, x: x, y: y, w: sz.w, h: sz.h });
        }
      };
    }
    // multi-instance tile (gpu / compute / killers1) as a compact grid block
    function gridCell(id) {
      var e = byId[id];
      if (!e) return null;
      var n = e.t.count || 1;
      var sz = S.sizeOf(id, e);
      var cols = n === 1 ? 1 : 2;
      var rows = Math.ceil(n / cols);
      var w = cols * sz.w + (cols - 1) * GAP;
      var h = rows * sz.h + (rows - 1) * GAP;
      return {
        id: id, w: w, h: h,
        place: function (x, y) {
          for (var i = 0; i < n; i++) {
            var c = i % cols, r = Math.floor(i / cols);
            placed.push({
              id: id, meta: e.meta, model: e.t.model, index: i, count: n,
              x: x + c * (sz.w + GAP), y: y + r * (sz.h + GAP), w: sz.w, h: sz.h
            });
          }
        }
      };
    }

    /* ---- Collect every functional tile as a packing unit. GPU / Compute /
       dual Killer S1 stay welded into their own grid blocks so related tiles
       read as one cluster; everything else is an individual unit. Kache Kore
       is pulled out and pinned to the die centre — it's the FOveros 2.0 fabric
       hub every other tile traces into, so it belongs dead-centre. ---- */
    var ids = ["gpu", "compute", "killers1", "druid", "lpisland", "hnpu", "bionzxr",
               "kanvas2d", "klangkerne", "mfx", "io", "psm", "ipu", "gna",
               "display", "threaddirector"];
    var units = [];
    ids.forEach(function (id) {
      var u = (id === "gpu" || id === "compute" || id === "killers1") ? gridCell(id) : leafCell(id);
      if (u) units.push(u);
    });
    var kache = leafCell("kachekore");

    var nocW = 0, nocH = 0;
    if (units.length || kache) {
      var packUnits = units;
      var totalArea = (kache ? (kache.w + GAP) * (kache.h + GAP) : 0);
      packUnits.forEach(function (u) { totalArea += (u.w + GAP) * (u.h + GAP); });
      // seed a bin at a chip-like ~1.5 aspect, sized with slack for packing loss
      var aspect = 1.5, eff = 0.68;
      var binW = Math.sqrt(totalArea * aspect / eff);
      var binH = binW / aspect;
      // never smaller than the largest single unit
      (kache ? packUnits.concat([kache]) : packUnits).forEach(function (u) {
        binW = Math.max(binW, u.w + GAP); binH = Math.max(binH, u.h + GAP);
      });

      var result = null;
      for (var attempt = 0; attempt < 60 && !result; attempt++) {
        result = packMaxRects(packUnits, kache, binW, binH, null, null);
        if (!result) { binW *= 1.05; binH *= 1.05; }
      }
      /* First pass pins Kache Kore to the bin centre, but the big GPU/Compute
         blocks skew the packed cluster off that centre. Iterate: re-pin Kache
         at the current cluster's true centre and repack, converging it to the
         middle of the die (it's the fabric hub — it should sit dead-centre). */
      if (result && kache) {
        for (var iter = 0; iter < 6; iter++) {
          var bb = clusterBounds(result);
          var kp = null;
          for (var q = 0; q < result.length; q++) if (result[q].unit === kache) kp = result[q];
          var kcx = kp.x + kache.w / 2, kcy = kp.y + kache.h / 2;
          var tcx = bb.minX + bb.w / 2, tcy = bb.minY + bb.h / 2;
          if (Math.abs(kcx - tcx) < 6 && Math.abs(kcy - tcy) < 6) break;
          var r2 = packMaxRects(packUnits, kache, binW, binH, tcx - (kache.w + GAP) / 2, tcy - (kache.h + GAP) / 2);
          if (!r2) break;
          result = r2;
        }
      }
      if (!result) { // pathological fallback: single row, no pinning
        result = []; var rx = 0;
        (kache ? [kache].concat(packUnits) : packUnits).forEach(function (u) { result.push({ unit: u, x: rx, y: 0 }); rx += u.w + GAP; });
      }

      var bbF = clusterBounds(result);
      result.forEach(function (p) {
        var px = p.x - bbF.minX, py = p.y - bbF.minY;
        nocW = Math.max(nocW, px + p.unit.w);
        nocH = Math.max(nocH, py + p.unit.h);
        p.unit.place(M + px, M + py);
      });
    }

    // ---- ZAM/LPDDR6X: fixed-size modules in a band below the tile cluster.
    // The Core ZAM box is calibrated so the flagship's 8-module row spans the
    // flagship's (now tightly-packed) cluster width; lower SKUs' shorter rows
    // cover less, with base die taking the remainder — see tile-sizes.js. ----
    var zamEntry = byId.zam;
    var zamBox = S.zamModuleBox(zamEntry && zamEntry.t.model);
    var zamCount = zamEntry ? S.zamModules(zamEntry.t.capacityGB, zamEntry.t.moduleGB) : 0;
    if (zamEntry) {
      var zamY = M + nocH + GAP;
      for (var s2 = 0; s2 < zamCount; s2++) {
        placed.push({
          id: "zam", meta: zamEntry.meta, model: zamEntry.t.model, index: s2, count: zamCount,
          x: M + s2 * (zamBox.w + GAP), y: zamY, w: zamBox.w, h: zamBox.h
        });
      }
    }

    var zamRowW = zamCount ? zamCount * zamBox.w + (zamCount - 1) * GAP : 0;
    var totalW = Math.max(nocW, zamRowW) + M * 2;
    var totalH = nocH + (zamEntry ? GAP + zamBox.h : 0) + M * 2;

    return { placed: placed, ghostSlots: [], width: totalW, height: totalH };
  }

  function typeText(node, text, speed) {
    node.textContent = "";
    var i = 0;
    clearInterval(node._typer);
    node._typer = setInterval(function () {
      i++;
      node.textContent = text.slice(0, i);
      if (i >= text.length) clearInterval(node._typer);
    }, speed || 16);
  }

  function renderDieMap(root, data) {
    var mount = root.querySelector(".ev-diemap-svg-wrap");
    var legend = root.querySelector(".ev-diemap-legend");
    var focusCard = root.querySelector(".ev-focus-card");
    var card = root.querySelector(".ev-diemap-card");
    var resetBtn = root.querySelector(".ev-diemap-reset");
    if (!mount) return;

    var layout = buildLayout(data.tiles);
    var svg = el("svg", {
      class: "ev-diemap-svg", width: layout.width, height: layout.height,
      viewBox: "0 0 " + layout.width + " " + layout.height, role: "img", "aria-label": "Interactive Eventide die map"
    });

    var callout = el("g", { class: "ev-callout" });
    var calloutPath = el("path", { class: "ev-callout-path" });
    var calloutText = el("text", { class: "ev-callout-text" });
    var calloutSub = el("text", { class: "ev-callout-sub" });
    callout.appendChild(calloutPath); callout.appendChild(calloutText); callout.appendChild(calloutSub);

    var seenLegend = {};
    var focusedId = null;

    function addLegend(id, meta, count) {
      if (seenLegend[id]) return;
      seenLegend[id] = true;
      var li = document.createElement("div");
      li.className = "ev-legend-item";
      var sw2 = document.createElement("span");
      sw2.className = "ev-legend-swatch";
      sw2.style.background = meta.color;
      li.appendChild(sw2);
      var txt = document.createElement("span");
      txt.textContent = meta.name + (count > 1 ? " ×" + count : "");
      li.appendChild(txt);
      if (legend) legend.appendChild(li);
    }

    function makeTileGroup(id, meta, x, y, w, h, labelText, subLabel) {
      var g = el("g", { class: "ev-tile-group", "data-tile": id, tabindex: "0" });
      var body = el("g", { class: "ev-tile-rect" });
      var rect = el("rect", {
        class: "ev-tile-fill",
        x: x, y: y, width: w, height: h, rx: 7,
        fill: meta.color, "fill-opacity": "0.20", stroke: meta.color, "stroke-width": "1.3"
      });
      body.appendChild(rect);
      var accentH = Math.min(8, h * 0.06);
      var accent = el("rect", {
        class: "ev-tile-accent", x: x + 1.3, y: y + 1.3, width: w - 2.6, height: accentH,
        rx: 3, fill: meta.color, "fill-opacity": "0.85"
      });
      body.appendChild(accent);
      /* Label sized to the tile, and estimated against tile width so it never
         spills past the tile edges; sublabel only on tiles big enough for two
         lines. Tiny tiles show no text at all — hover reveals the callout. */
      var minDim = Math.min(w, h);
      var fitFs = (w - 6) / (labelText.length * 0.56); // font size at which the label exactly fits the width
      var fs = Math.max(6, Math.min(13, minDim * 0.16, fitFs));
      // Only draw the label if it actually fits inside the tile at a legible
      // size — otherwise leave the tile clean and let hover reveal the callout.
      var showLabel = w > 24 && h > 16 && fitFs >= 5.5;
      var showSub = showLabel && subLabel && h > 46 && fs >= 8;
      var midY = y + h / 2 + accentH / 2;
      if (showLabel) {
        var label = el("text", { class: "ev-tile-label", x: x + w / 2, y: showSub ? midY - 2 : midY + fs * 0.34, "font-size": fs });
        label.textContent = labelText;
        body.appendChild(label);
        if (showSub) {
          var sub = el("text", { class: "ev-tile-sublabel", x: x + w / 2, y: midY + fs * 0.9 + 4, "font-size": Math.max(6, fs * 0.68) });
          sub.textContent = subLabel;
          body.appendChild(sub);
        }
      }
      g.appendChild(body);
      g._center = { x: x + w / 2, y: y };
      g._anchor = { x: x + w / 2, y: y + h / 2 };
      g._tileId = id;
      g._meta = meta;
      return g;
    }

    /* Package substrate + BGA ball ring, drawn first so every tile sits on top of it. */
    var pad = 14;
    var substrate = el("rect", {
      class: "ev-package-substrate", x: pad, y: pad, width: layout.width - pad * 2, height: layout.height - pad * 2, rx: 26
    });
    svg.appendChild(substrate);

    /* Continuous base die / active interposer. In a real Foveros package the
       tiles are mounted on ONE base die that spans the whole package; every
       spot the tiles don't cover is that base die showing through — structural,
       routed silicon, not dead space. So we draw it as one continuous layer
       across the package interior (behind every tile, ball and trace) with a
       micro-bump (TSV) dot field over faint metal-routing lines, so what shows
       reads as real silicon rather than empty substrate. Tighter tile packing
       means far less of it is exposed. */
    var viaId = "ev-basedie-vias";
    var defs = el("defs", {});
    var pat = el("pattern", { id: viaId, width: "10", height: "10", patternUnits: "userSpaceOnUse" });
    pat.appendChild(el("rect", { width: "10", height: "10", fill: "rgba(120,132,168,0.10)" }));
    pat.appendChild(el("path", { d: "M0 5 H10 M5 0 V10", stroke: "rgba(150,165,205,0.06)", "stroke-width": "0.6", fill: "none" }));
    pat.appendChild(el("circle", { cx: "2.5", cy: "2.5", r: "0.9", fill: "rgba(190,205,240,0.14)" }));
    pat.appendChild(el("circle", { cx: "7.5", cy: "7.5", r: "0.9", fill: "rgba(190,205,240,0.14)" }));
    defs.appendChild(pat);
    svg.appendChild(defs);
    svg.appendChild(el("rect", {
      class: "ev-basedie", x: pad + 3, y: pad + 3,
      width: layout.width - (pad + 3) * 2, height: layout.height - (pad + 3) * 2,
      rx: 20, fill: "url(#" + viaId + ")", stroke: "rgba(150,165,205,0.10)", "stroke-width": "1"
    }));

    var ballLayer = el("g", { class: "ev-package-balls" });
    var ballGap = 26;
    for (var bx = pad + 10; bx < layout.width - pad; bx += ballGap) {
      ballLayer.appendChild(el("circle", { class: "ev-package-ball", cx: bx, cy: pad + 4, r: 1.6 }));
      ballLayer.appendChild(el("circle", { class: "ev-package-ball", cx: bx, cy: layout.height - pad - 4, r: 1.6 }));
    }
    for (var by = pad + 10; by < layout.height - pad; by += ballGap) {
      ballLayer.appendChild(el("circle", { class: "ev-package-ball", cx: pad + 4, cy: by, r: 1.6 }));
      ballLayer.appendChild(el("circle", { class: "ev-package-ball", cx: layout.width - pad - 4, cy: by, r: 1.6 }));
    }
    svg.appendChild(ballLayer);

    /* Ghost ZAM module slots — empty sockets below the SKU's actual populated
       capacity, so 1TB (4 populated) vs. a lower-tier capacity (fewer) reads
       the way empty RAM slots do on a real board. */
    layout.ghostSlots.forEach(function (gs) {
      svg.appendChild(el("rect", {
        class: "ev-zam-ghost", x: gs.x, y: gs.y, width: gs.w, height: gs.h, rx: 6
      }));
    });

    /* Fabric bus traces — a static right-angle trace from every tile straight into
       Kache Kore, visualizing the FOveros 2.0 interconnect hub every tile shares. */
    var corePlaced = layout.placed.filter(function (p) { return p.id === "kachekore"; })[0];
    var coreAnchor = corePlaced ? { x: corePlaced.x + corePlaced.w / 2, y: corePlaced.y + corePlaced.h / 2 } : { x: 570, y: 460 };
    var fabricLayer = el("g", { class: "ev-fabric" });
    layout.placed.forEach(function (p) {
      if (p.id === "kachekore") return;
      var ax = p.x + p.w / 2, ay = p.y + p.h / 2;
      var midX = coreAnchor.x + (ax - coreAnchor.x) * 0.5;
      var d = "M " + ax + " " + ay + " L " + midX + " " + ay + " L " + midX + " " + coreAnchor.y + " L " + coreAnchor.x + " " + coreAnchor.y;
      fabricLayer.appendChild(el("path", { class: "ev-fabric-trace", "data-fabric-for": p.id, d: d }));
    });
    svg.appendChild(fabricLayer);
    if (corePlaced) {
      svg.appendChild(el("circle", { class: "ev-fabric-hub", cx: coreAnchor.x, cy: coreAnchor.y, r: Math.min(corePlaced.w, corePlaced.h) / 2 + 14 }));
    }

    var groups = [];
    layout.placed.forEach(function (p) {
      var baseLabel = p.model || p.meta.name.replace(" Tile", "");
      var labelText = p.count > 1 ? baseLabel + " " + (p.index + 1) : baseLabel;
      var subLabel = (p.meta.node.match(/Intel [\w.-]+/) || [p.meta.category])[0].replace("Intel ", "");
      var g = makeTileGroup(p.id, p.meta, p.x, p.y, p.w, p.h, labelText, subLabel);
      var legendMeta = p.model ? Object.assign({}, p.meta, { name: p.model }) : p.meta;
      addLegend(p.id, legendMeta, p.count);

      if (p.meta.stacked && p.meta.stackTileId) {
        var stackMeta = window.EventideTiles.CATALOG[p.meta.stackTileId];
        if (stackMeta) {
          var sx = p.x + p.w - p.w * 0.42, sy = p.y - p.h * 0.06, sw = p.w * 0.44, sh = p.h * 0.5;
          var sg = makeTileGroup(p.meta.stackTileId, stackMeta, sx, sy, sw, sh, stackMeta.name, null);
          sg.classList.add("ev-stack-top");
          var slab = sg.querySelector(".ev-tile-label");
          if (slab) slab.setAttribute("fill", "#0B0714");
          addLegend(p.meta.stackTileId, stackMeta, 1);
          svg.appendChild(g);
          svg.appendChild(sg);
          groups.push(g, sg);
          return;
        }
      }
      svg.appendChild(g);
      groups.push(g);
    });

    svg.appendChild(callout);
    mount.innerHTML = "";
    mount.appendChild(svg);

    function showCallout(g) {
      var c = g._center;
      var anchorY = Math.max(16, c.y - 26);
      calloutPath.setAttribute("d", "M " + c.x + " " + (c.y - 4) + " L " + c.x + " " + anchorY);
      calloutPath.classList.add("on");
      calloutText.setAttribute("x", c.x);
      calloutText.setAttribute("y", anchorY - 8);
      calloutText.setAttribute("text-anchor", c.x > 900 ? "end" : (c.x < 260 ? "start" : "middle"));
      calloutText.classList.add("on");
      calloutSub.setAttribute("x", c.x);
      calloutSub.setAttribute("y", anchorY - 20);
      calloutSub.setAttribute("text-anchor", calloutText.getAttribute("text-anchor"));
      calloutSub.classList.add("on");
      calloutSub.textContent = g._meta.category;
      typeText(calloutText, g._meta.name, 14);
    }
    function hideCallout() {
      calloutPath.classList.remove("on");
      calloutText.classList.remove("on");
      calloutSub.classList.remove("on");
      clearInterval(calloutText._typer);
    }

    function renderFocus(id) {
      var meta = window.EventideTiles.CATALOG[id];
      var skuSpecs = (data.tileSpecs && data.tileSpecs[id]) || [];
      var swatch = '<span class="ev-focus-swatch" style="background:' + meta.color + '"></span>';
      var specHtml = skuSpecs.map(function (s) {
        return '<div class="ev-focus-spec-item"><div class="ev-focus-spec-label">' + s.label + '</div><div class="ev-focus-spec-val">' + s.val + '</div></div>';
      }).join("");
      var detailHtml = meta.detail.map(function (d) { return '<div class="ev-focus-detail">' + d + '</div>'; }).join("");
      focusCard.innerHTML =
        '<div class="ev-focus-top">' + swatch +
        '<div><div class="ev-focus-name">' + meta.name + '</div>' +
        '<div class="ev-focus-meta">' + meta.codename + ' · ' + meta.node + '</div></div></div>' +
        '<div class="ev-focus-tagline">"' + meta.tagline + '"</div>' +
        detailHtml +
        (specHtml ? '<div class="ev-focus-specs">' + specHtml + '</div>' : '');
    }

    function setFocus(id) {
      focusedId = id;
      card.classList.add("ev-has-focus");
      groups.forEach(function (g) {
        g.classList.remove("ev-focused", "ev-dim");
        if (g._tileId === id) g.classList.add("ev-focused");
        else g.classList.add("ev-dim");
      });
      renderFocus(id);
      hideCallout();
    }
    function clearFocus() {
      focusedId = null;
      card.classList.remove("ev-has-focus");
      groups.forEach(function (g) { g.classList.remove("ev-focused", "ev-dim"); });
    }

    groups.forEach(function (g) {
      g.addEventListener("mouseenter", function () {
        if (focusedId) return;
        g.classList.add("ev-hover");
        showCallout(g);
        var trace = fabricLayer.querySelector('[data-fabric-for="' + g._tileId + '"]');
        if (trace) trace.classList.add("ev-fabric-lit");
      });
      g.addEventListener("mouseleave", function () {
        g.classList.remove("ev-hover");
        if (!focusedId) hideCallout();
        var trace = fabricLayer.querySelector('[data-fabric-for="' + g._tileId + '"]');
        if (trace) trace.classList.remove("ev-fabric-lit");
      });
      g.addEventListener("click", function () {
        if (focusedId === g._tileId) { clearFocus(); return; }
        setFocus(g._tileId);
      });
      g.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); g.click(); }
      });
    });

    if (resetBtn) resetBtn.addEventListener("click", clearFocus);
  }

  function wireAccordion(root) {
    root.querySelectorAll(".ev-section-head").forEach(function (head) {
      head.addEventListener("click", function () {
        var body = head.nextElementSibling;
        var icon = head.querySelector(".ev-section-head-icon");
        var open = body.classList.contains("open");
        body.classList.toggle("open", !open);
        if (icon) { icon.classList.toggle("open", !open); icon.textContent = open ? "▼" : "▲"; }
      });
    });
  }

  function wireHelp(root) {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest(".ev-help-btn") : null;
      root.querySelectorAll(".ev-help-btn.open").forEach(function (b) { if (b !== btn) b.classList.remove("open"); });
      if (btn && root.contains(btn)) {
        btn.classList.toggle("open");
        e.stopPropagation();
      }
    });
  }

  function init(root) {
    var dataNode = root.querySelector("#ev-sku-data");
    if (!dataNode) return;
    var data;
    try { data = JSON.parse(dataNode.textContent); } catch (e) { return; }
    renderDieMap(root, data);
    wireAccordion(root);
    wireHelp(root);
  }

  window.EventideSpecEngine = { init: init };

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".ev-spec").forEach(init);
  });
})();
