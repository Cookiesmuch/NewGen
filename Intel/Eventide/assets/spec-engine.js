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
   * True-size floorplan, built bottom-up from Intel/Eventide/assets/
   * tile-sizes.js — every tile is drawn at its actual relative footprint
   * (an E1080 is always the same size everywhere it appears; a 12-core
   * Compute Tile is visibly smaller than an 86-core one), and the overall
   * package canvas is sized to fit its real content rather than tiles
   * being stretched to fill a fixed frame. Kache Kore + HNPU + 2DKanvas
   * and the LP cluster + Compute grid form two stacked rows to the right
   * of the GPU column; the GPU column spans exactly that two-row height
   * (two E1080s stacked 2x2 span the whole NoC, by definition — see
   * tile-sizes.js). Klangkerne/SoRT + the ancillary I/O cluster sit in
   * their own full-width row below the NoC, and ZAM is its own full-width
   * row of up to 4 module slots below that, matching "1TB spans the full
   * package width" (lower capacities simply populate fewer of the 4
   * slots, like empty RAM sockets).
   * ------------------------------------------------------------------ */
  var GAP = 6;
  var M = 22; // outer margin to the package substrate edge

  function rowOf(items, gap) {
    // lays `items` (each {w,h}) left-to-right, top-aligned to the tallest —
    // a shorter tile reads as "a smaller die sharing this row," not as a
    // floating box with padding above and below it.
    var h = 0;
    items.forEach(function (it) { h = Math.max(h, it.h); });
    var x = 0;
    var out = [];
    items.forEach(function (it) {
      out.push({ x: x, y: 0, w: it.w, h: it.h });
      x += it.w + gap;
    });
    return { items: out, w: Math.max(0, x - gap), h: h };
  }

  function gridOf(cellW, cellH, n, cols) {
    cols = Math.min(cols, n);
    var rows = Math.ceil(n / cols);
    var out = [];
    for (var i = 0; i < n; i++) {
      var col = i % cols, row = Math.floor(i / cols);
      out.push({ x: col * (cellW + GAP), y: row * (cellH + GAP), w: cellW, h: cellH });
    }
    return { items: out, w: cols * cellW + (cols - 1) * GAP, h: rows * cellH + (rows - 1) * GAP };
  }

  function buildLayout(tiles) {
    var S = window.EventideTileSizes;
    var byId = {};
    tiles.forEach(function (t) {
      var meta = window.EventideTiles.CATALOG[t.id];
      if (meta) byId[t.id] = { t: t, meta: meta };
    });

    var placed = [];
    function place(id, meta, index, count, x, y, w, h) {
      placed.push({ id: id, meta: meta, index: index, count: count, x: x, y: y, w: w, h: h });
    }

    // ---- GPU column (2-wide grid; 1 tile is just a 1x1 "grid") ----
    var gpuEntry = byId.gpu;
    var gpuCount = gpuEntry ? gpuEntry.t.count : 0;
    var gpuCell = gpuEntry ? S.elementalistSize(gpuEntry.t.xe5) : { w: 0, h: 0 };
    var gpuGrid = gpuCount ? gridOf(gpuCell.w, gpuCell.h, gpuCount, 2) : { w: 0, h: 0, items: [] };

    // ---- Row 1: LP cluster (LP Island + Arc Druid + BionzXR) + Compute grid ----
    var lpEntry = byId.lpisland, druidEntry = byId.druid, bionzEntry = byId.bionzxr;
    var lpRowItems = [];
    if (lpEntry) lpRowItems.push({ id: "lpisland", meta: lpEntry.meta, w: S.LP_CLUSTER_SIZE.w, h: S.LP_CLUSTER_SIZE.h });
    if (druidEntry) { var ds = S.druidSize(druidEntry.t.xeCores); lpRowItems.push({ id: "druid", meta: druidEntry.meta, w: ds.w, h: ds.h }); }
    if (bionzEntry) lpRowItems.push({ id: "bionzxr", meta: bionzEntry.meta, w: S.LP_CLUSTER_SIZE.w, h: S.LP_CLUSTER_SIZE.h });
    var lpRow = rowOf(lpRowItems, GAP);

    var computeEntry = byId.compute;
    var computeCount = computeEntry ? computeEntry.t.count : 0;
    var computeCols = Math.min(2, computeCount);
    var computeRows = computeCount ? Math.ceil(computeCount / computeCols) : 1;
    var computeCell = computeEntry ? S.computeTileSize(computeEntry.t.coresPerTile, computeRows) : { w: 0, h: 0 };
    var computeGrid = computeCount ? gridOf(computeCell.w, computeCell.h, computeCount, 2) : { w: 0, h: 0, items: [] };

    var row1H = Math.max(lpRow.h, computeGrid.h);
    var row1W = lpRow.w + (computeGrid.w ? GAP + computeGrid.w : 0);

    // ---- Row 2: Kache Kore + HNPU + 2DKanvas ----
    var coreEntry = byId.kachekore, hnpuEntry = byId.hnpu, kanvasEntry = byId.kanvas2d;
    var coreSize = { w: S.HNPU_SIZE.w * 1.3, h: S.HNPU_SIZE.h };
    var row2Items = [];
    if (coreEntry) row2Items.push({ id: "kachekore", meta: coreEntry.meta, w: coreSize.w, h: coreSize.h });
    if (hnpuEntry) row2Items.push({ id: "hnpu", meta: hnpuEntry.meta, w: S.HNPU_SIZE.w, h: S.HNPU_SIZE.h });
    if (kanvasEntry) row2Items.push({ id: "kanvas2d", meta: kanvasEntry.meta, w: S.KANVAS_MIN.w, h: S.KANVAS_MIN.h });
    var row2 = rowOf(row2Items, GAP);

    var rightStackW = Math.max(row1W, row2.w);
    var rightStackH = row1H + GAP + row2.h;
    var nocH = Math.max(gpuGrid.h, rightStackH);
    var nocW = (gpuGrid.w ? gpuGrid.w + GAP : 0) + rightStackW;

    // ---- Row 3: Klangkerne/SoRT stack + ancillary I/O cluster ----
    var klEntry = byId.klangkerne;
    var klSize = S.KLANGKERNE_SIZE;
    var ancillaryIds = ["io", "psm", "killers1", "ipu", "mfx", "gna", "display", "threaddirector"];
    var ancillaryPresent = ancillaryIds.filter(function (id) { return byId[id]; });
    var ancGrid = ancillaryPresent.length ? gridOf(S.ANCILLARY_SIZE.w, S.ANCILLARY_SIZE.h, ancillaryPresent.length, 4) : { w: 0, h: 0, items: [] };
    var row3H = Math.max(klEntry ? klSize.h : 0, ancGrid.h);
    var row3W = (klEntry ? klSize.w + GAP : 0) + ancGrid.w;

    // ---- Row 4: ZAM — 4 fixed module slots, populated left-to-right by capacity ----
    var zamEntry = byId.zam;
    var zamModuleCount = zamEntry ? Math.min(4, S.zamModules(zamEntry.t.capacityGB)) : 0;
    var zamSlots = 4;
    var zamRowW = zamSlots * S.ZAM_MODULE_SIZE.w + (zamSlots - 1) * GAP;
    var zamRowH = S.ZAM_MODULE_SIZE.h;

    var totalW = Math.max(nocW, row3W, zamEntry ? zamRowW : 0);
    var totalH = nocH + (row3H ? GAP + row3H : 0) + (zamEntry ? GAP + zamRowH : 0);

    // ---- Place everything ----
    var x0 = M, y0 = M;

    if (gpuGrid.items.length) {
      gpuGrid.items.forEach(function (it, i) {
        place("gpu", gpuEntry.meta, i, gpuCount, x0 + it.x, y0 + it.y, it.w, it.h);
      });
    }
    var stackX = x0 + (gpuGrid.w ? gpuGrid.w + GAP : 0);
    lpRow.items.forEach(function (it, i) {
      place(lpRowItems[i].id, lpRowItems[i].meta, 0, 1, stackX + it.x, y0 + it.y, it.w, it.h);
    });
    if (computeGrid.items.length) {
      var computeX = stackX + lpRow.w + GAP;
      computeGrid.items.forEach(function (it, i) {
        place("compute", computeEntry.meta, i, computeCount, computeX + it.x, y0 + it.y, it.w, it.h);
      });
    }
    var row2Y = y0 + row1H + GAP;
    row2.items.forEach(function (it, i) {
      place(row2Items[i].id, row2Items[i].meta, 0, 1, stackX + it.x, row2Y + it.y, it.w, it.h);
    });

    var row3Y = y0 + nocH + GAP;
    if (klEntry) place("klangkerne", klEntry.meta, 0, 1, x0, row3Y, klSize.w, klSize.h);
    var ancX = x0 + (klEntry ? klSize.w + GAP : 0);
    ancGrid.items.forEach(function (it, i) {
      var id = ancillaryPresent[i];
      place(id, byId[id].meta, 0, 1, ancX + it.x, row3Y + it.y, it.w, it.h);
    });

    var ghostSlots = [];
    if (zamEntry) {
      var zamY = row3Y + (row3H ? GAP + row3H : 0);
      for (var s = 0; s < zamSlots; s++) {
        var sx = x0 + s * (S.ZAM_MODULE_SIZE.w + GAP);
        if (s < zamModuleCount) {
          place("zam", zamEntry.meta, s, zamModuleCount, sx, zamY, S.ZAM_MODULE_SIZE.w, S.ZAM_MODULE_SIZE.h);
        } else {
          ghostSlots.push({ x: sx, y: zamY, w: S.ZAM_MODULE_SIZE.w, h: S.ZAM_MODULE_SIZE.h });
        }
      }
    }

    return { placed: placed, ghostSlots: ghostSlots, width: totalW + M * 2, height: totalH + M * 2 };
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
      class: "ev-package-substrate", x: pad, y: pad, width: layout.width - pad * 2, height: layout.height - pad * 2, rx: 26
    });
    svg.appendChild(substrate);
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
