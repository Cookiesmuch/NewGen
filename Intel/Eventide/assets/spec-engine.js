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
   * Edge-to-edge mosaic floorplan — three contiguous bands subdivided into
   * abutting tile slots (2px reveal only, not a gapped grid), the way an
   * actual lithographed package or die-shot reads. Kache Kore sits at the
   * physical center of the middle band; distance from it still encodes
   * cache-latency sensitivity (Compute/LP top, GPU/HNPU flank the core,
   * ancillary I/O sits furthest away, bottom band). When a line has no
   * Compute Tile or no GPU tile (the C-line), the neighboring slot expands
   * to fill the freed space rather than leaving a blank rectangle.
   * ------------------------------------------------------------------ */
  var VIEW_W = 1180, VIEW_H = 760;
  var GAP = 3;
  var M = 20; // outer margin to the package substrate edge
  var PKG = { x: M, y: M, w: VIEW_W - M * 2, h: VIEW_H - M * 2 };
  var BAND_H = PKG.h / 3;

  /* Fills a sub-rect edge-to-edge with `n` items in a fixed column count,
     leaving only GAP px of substrate reveal between cells. */
  function fillGrid(rect, n, cols) {
    cols = Math.min(cols, n);
    var rows = Math.ceil(n / cols);
    var ch = (rect.h - (rows - 1) * GAP) / rows;
    var out = [];
    for (var i = 0; i < n; i++) {
      var col = i % cols, row = Math.floor(i / cols);
      // last row: if it isn't full, stretch remaining items to fill the width evenly
      var itemsInRow = (row === rows - 1) ? (n - cols * row) : cols;
      var ccw = (rect.w - (itemsInRow - 1) * GAP) / itemsInRow;
      out.push({
        x: rect.x + col * (ccw + GAP), y: rect.y + row * (ch + GAP), w: ccw, h: ch
      });
    }
    return out;
  }

  function buildLayout(tiles) {
    var byZone = {};
    tiles.forEach(function (t) {
      var meta = window.EventideTiles.CATALOG[t.id];
      if (!meta) return;
      var zone = meta.zone;
      byZone[zone] = byZone[zone] || [];
      var count = t.count == null ? 1 : t.count;
      for (var i = 0; i < count; i++) byZone[zone].push({ id: t.id, meta: meta, index: i, count: count });
    });

    var hasCompute = !!(byZone["band1-right"] && byZone["band1-right"].length);
    var gpuItems = byZone["band2-left"] || [];
    var hasGpu = !!gpuItems.length;
    var gpuTiles = gpuItems.length;

    /* The Elementalist GPU tile is physically large — a top E1080 config (×4 tiles)
       is meaningfully more silicon than a single small E-class tile, and it never
       shares a row with anything else: it runs the FULL height of the package on
       the left edge, tall, exactly like the actual die. Its width share of the
       package scales with tile count, so a 4-tile flagship visibly dominates the
       floorplan and everything else gets proportionally smaller — more silicon,
       more of the picture. Non-GPU content occupies whatever width is left. */
    var gpuColW = hasGpu ? PKG.w * Math.min(0.46, 0.22 + 0.06 * gpuTiles) : 0;
    var gpuRect = hasGpu ? { x: PKG.x, y: PKG.y, w: gpuColW, h: PKG.h } : null;

    var restX = PKG.x + (hasGpu ? gpuColW + GAP : 0);
    var restW = PKG.w - (hasGpu ? gpuColW + GAP : 0);
    var BAND1 = { x: restX, y: PKG.y, w: restW, h: BAND_H };
    var BAND2 = { x: restX, y: PKG.y + BAND_H, w: restW, h: BAND_H };
    var BAND3 = { x: restX, y: PKG.y + BAND_H * 2, w: restW, h: BAND_H };

    // Band 1: LP cluster (left) + Compute (right). Compute absent -> LP cluster fills the band.
    var band1Left = hasCompute ? { x: BAND1.x, y: BAND1.y, w: BAND1.w * 0.37, h: BAND1.h } : BAND1;
    var band1Right = { x: BAND1.x + band1Left.w + GAP, y: BAND1.y, w: BAND1.w - band1Left.w - GAP, h: BAND1.h };

    // Band 2: Kache Kore (center) + HNPU + 2DKanvas (right strip). GPU no longer
    // lives in this band (see above) — Kache Kore anchors the left of the row.
    var coreW = BAND2.w * 0.32;
    var coreRect = { x: BAND2.x, y: BAND2.y, w: coreW, h: BAND2.h };
    var hnpuW = BAND2.w * 0.20;
    var hnpuRect = { x: coreRect.x + coreRect.w + GAP, y: BAND2.y, w: hnpuW, h: BAND2.h };
    var kanvasX = hnpuRect.x + hnpuRect.w + GAP;
    var kanvasRect = { x: kanvasX, y: BAND2.y, w: BAND2.x + BAND2.w - kanvasX, h: BAND2.h };

    // Band 3: Klangkerne/SoRT stack, ZAM, then the ancillary I/O cluster.
    var b3StackW = BAND3.w * 0.24, b3ZamW = BAND3.w * 0.24;
    var stackRect = { x: BAND3.x, y: BAND3.y, w: b3StackW, h: BAND3.h };
    var zamRect = { x: BAND3.x + b3StackW + GAP, y: BAND3.y, w: b3ZamW, h: BAND3.h };
    var ancillaryX = zamRect.x + zamRect.w + GAP;
    var ancillaryRect = { x: ancillaryX, y: BAND3.y, w: BAND3.x + BAND3.w - ancillaryX, h: BAND3.h };

    var placed = [];

    function placeZone(zoneKey, rect, cols) {
      var items = byZone[zoneKey];
      if (!items || !items.length || !rect) return;
      var slots = fillGrid(rect, items.length, cols || items.length);
      items.forEach(function (it, i) {
        placed.push({ id: it.id, meta: it.meta, index: it.index, count: it.count, x: slots[i].x, y: slots[i].y, w: slots[i].w, h: slots[i].h });
      });
    }

    placeZone("band1-left", band1Left, 3);
    placeZone("band1-right", band1Right, 2);
    placeZone("band2-left", gpuRect, 1);
    placeZone("core", coreRect, 1);
    placeZone("band2-right", hnpuRect, 1);
    placeZone("band2-far-right", kanvasRect, 1);
    placeZone("band3-b", stackRect, 1);
    placeZone("band3-a", zamRect, 1);
    placeZone("band3-c", ancillaryRect, 4);

    return { placed: placed, height: VIEW_H };
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
    var svg = el("svg", { class: "ev-diemap-svg", viewBox: "0 0 1180 " + layout.height, role: "img", "aria-label": "Interactive Eventide die map" });

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
      var accentH = Math.min(5, h * 0.09);
      var accent = el("rect", {
        class: "ev-tile-accent", x: x + 1.3, y: y + 1.3, width: w - 2.6, height: accentH,
        rx: 3, fill: meta.color, "fill-opacity": "0.85"
      });
      body.appendChild(accent);
      var midY = y + h / 2 + accentH / 2;
      var label = el("text", { class: "ev-tile-label", x: x + w / 2, y: subLabel ? midY - 2 : midY + 3 });
      label.textContent = labelText;
      body.appendChild(label);
      if (subLabel) {
        var sub = el("text", { class: "ev-tile-sublabel", x: x + w / 2, y: midY + 12 });
        sub.textContent = subLabel;
        body.appendChild(sub);
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
      class: "ev-package-substrate", x: pad, y: pad, width: 1180 - pad * 2, height: layout.height - pad * 2, rx: 26
    });
    svg.appendChild(substrate);
    var ballLayer = el("g", { class: "ev-package-balls" });
    var ballGap = 26;
    for (var bx = pad + 10; bx < 1180 - pad; bx += ballGap) {
      ballLayer.appendChild(el("circle", { class: "ev-package-ball", cx: bx, cy: pad + 4, r: 1.6 }));
      ballLayer.appendChild(el("circle", { class: "ev-package-ball", cx: bx, cy: layout.height - pad - 4, r: 1.6 }));
    }
    for (var by = pad + 10; by < layout.height - pad; by += ballGap) {
      ballLayer.appendChild(el("circle", { class: "ev-package-ball", cx: pad + 4, cy: by, r: 1.6 }));
      ballLayer.appendChild(el("circle", { class: "ev-package-ball", cx: 1180 - pad - 4, cy: by, r: 1.6 }));
    }
    svg.appendChild(ballLayer);

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
      var labelText = p.count > 1 ? p.meta.name.replace(" Tile", "") + " " + (p.index + 1) : p.meta.name.replace(" Tile", "");
      var subLabel = p.h >= 60 ? (p.meta.node.match(/Intel [\w.-]+/) || [p.meta.category])[0].replace("Intel ", "") : null;
      var g = makeTileGroup(p.id, p.meta, p.x, p.y, p.w, p.h, labelText, subLabel);
      addLegend(p.id, p.meta, p.count);

      if (p.meta.stacked && p.meta.stackTileId) {
        var stackMeta = window.EventideTiles.CATALOG[p.meta.stackTileId];
        if (stackMeta) {
          var sx = p.x + p.w - p.w * 0.42, sy = p.y - p.h * 0.06, sw = p.w * 0.44, sh = p.h * 0.5;
          var sg = makeTileGroup(p.meta.stackTileId, stackMeta, sx, sy, sw, sh, stackMeta.name, null);
          sg.classList.add("ev-stack-top");
          sg.querySelector(".ev-tile-label").setAttribute("fill", "#0B0714");
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
