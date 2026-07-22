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
   * Gap-free true-area floorplan. Tiles are laid out with an area-
   * preserving treemap: the package is recursively split into rectangles,
   * each split partitioning its parent COMPLETELY and in proportion to
   * the true silicon area (from tile-sizes.js) of the tiles inside it. A
   * region is therefore never bigger than its contents, so nothing floats
   * over empty substrate — the result reads as a solid die, and each
   * tile's rendered AREA equals its true area (aspect ratio flexes to
   * tessellate, exactly like a real floorplan).
   *
   * Arrangement (per the 599HKX reference): GPU (2x2 E1080) is the big
   * block on the left; to its right, Kache Kore anchors the middle of a
   * left column with the D390/2DKanvas/media strip above it and
   * Klangkerne below; the Compute tiles sit in the top-right with the
   * remaining I/O tiles filling in beneath them. ZAM is the one tile that
   * spans the whole package width, as a module row along the bottom.
   * ------------------------------------------------------------------ */
  var INSET = 3;        // half of the ~6px substrate reveal between neighbours
  var M = 20;           // outer margin to the package substrate edge

  /* ---- treemap primitives: a node is a leaf {kind:'leaf',...} or a
     split {kind:'row'|'col', kids:[...]}; weight = total true area. ---- */
  function grp(kind, kids) {
    kids = kids.filter(Boolean);
    if (!kids.length) return null;
    if (kids.length === 1) return kids[0];
    var w = 0; kids.forEach(function (k) { w += k.weight; });
    return { kind: kind, kids: kids, weight: w };
  }
  function rowN() { return grp("row", [].slice.call(arguments)); }
  function colN() { return grp("col", [].slice.call(arguments)); }

  function buildLayout(tiles) {
    var S = window.EventideTileSizes;
    var byId = {};
    tiles.forEach(function (t) {
      var meta = window.EventideTiles.CATALOG[t.id];
      if (meta) byId[t.id] = { t: t, meta: meta };
    });

    function leaf(id, index, count) {
      var e = byId[id];
      if (!e) return null;
      var sz = S.sizeOf(id, e);
      return {
        kind: "leaf", id: id, meta: e.meta, model: e.t.model,
        index: index || 0, count: count || 1, weight: sz.w * sz.h
      };
    }
    // multi-instance tile (gpu / compute) as a 2-column grid of leaves
    function gridN(id) {
      var e = byId[id];
      if (!e) return null;
      var n = e.t.count || 1;
      var leaves = [];
      for (var i = 0; i < n; i++) leaves.push(leaf(id, i, n));
      if (n === 1) return leaves[0];
      var rows = [];
      for (var r = 0; r < Math.ceil(n / 2); r++) rows.push(rowN.apply(null, leaves.slice(r * 2, r * 2 + 2)));
      return colN.apply(null, rows);
    }

    var placed = [];
    function emit(node, r) {
      placed.push({
        id: node.id, meta: node.meta, index: node.index, count: node.count, model: node.model,
        x: r.x + INSET, y: r.y + INSET, w: Math.max(1, r.w - 2 * INSET), h: Math.max(1, r.h - 2 * INSET)
      });
    }
    function layoutNode(r, node) {
      if (!node) return;
      if (node.kind === "leaf") { emit(node, r); return; }
      var total = node.weight, off, i, k, ext;
      if (node.kind === "row") {
        off = r.x;
        for (i = 0; i < node.kids.length; i++) {
          k = node.kids[i]; ext = r.w * k.weight / total;
          layoutNode({ x: off, y: r.y, w: ext, h: r.h }, k); off += ext;
        }
      } else {
        off = r.y;
        for (i = 0; i < node.kids.length; i++) {
          k = node.kids[i]; ext = r.h * k.weight / total;
          layoutNode({ x: r.x, y: off, w: r.w, h: ext }, k); off += ext;
        }
      }
    }

    // ---- GPU block: 2x2 (or 1x1) grid of E1080s, the big block on the left ----
    var gpuNode = gridN("gpu");

    // ---- Right block tree: Kache-Kore column | I/O-media column | Compute column ----
    var col1 = colN(
      rowN(leaf("druid"), leaf("kanvas2d")),      // media strip, above the cache
      leaf("kachekore"),                          // centrepiece, centre of the column
      rowN(leaf("klangkerne"), leaf("mfx"))       // below the cache
    );
    var col2 = colN(
      rowN(leaf("lpisland"), leaf("hnpu")),       // cores/AI, upper-middle
      rowN(leaf("bionzxr"), leaf("io")),
      rowN(leaf("psm"), gridN("killers1"))        // killers1 renders 2 tiles on dual-ISP flagship SKUs
    );
    var col3 = colN(
      gridN("compute"),                           // Compute tiles, top-right
      rowN(leaf("ipu"), leaf("gna")),             // fill beneath compute
      rowN(leaf("display"), leaf("threaddirector"))
    );
    var rightTree = rowN(col1, col2, col3);

    // ---- One unified area-preserving treemap: GPU on the left, everything
    // else to its right. Every region gets width/height in proportion to its
    // true silicon area, partitioning the package completely — so the whole
    // NoC is gap-free at a stable landscape aspect no matter the GPU count
    // (a 1-GPU part is just a smaller, differently-proportioned die, not a
    // short-wide sliver). ----
    var fullTree = rowN(gpuNode, rightTree);
    var totalArea = fullTree ? fullTree.weight : 1;
    var ASPECT = 1.95; // NoC width : height
    var nocH = Math.sqrt(totalArea / ASPECT);
    var nocW = totalArea / nocH;

    var x0 = M, y0 = M;
    if (fullTree) layoutNode({ x: x0, y: y0, w: nocW, h: nocH }, fullTree);

    // ---- ZAM: a module row below the whole NoC. Module width is fixed at
    // nocW/4, so 1TB (4 modules) spans the full package width edge-to-edge,
    // and lower capacities are simply fewer modules of that same size,
    // left-aligned (no empty sockets drawn — less memory just means a
    // physically smaller memory strip). ----
    var zamEntry = byId.zam;
    var zamModuleCount = zamEntry ? Math.min(4, S.zamModules(zamEntry.t.capacityGB, zamEntry.t.moduleGB)) : 0;
    var zamRowH = zamEntry ? S.ZAM_ROW_H : 0;
    var zamModuleW = zamEntry ? nocW / 4 : 0;
    if (zamEntry) {
      var zamY = y0 + nocH;
      for (var s = 0; s < zamModuleCount; s++) {
        emit({ id: "zam", meta: zamEntry.meta, model: zamEntry.t.model, index: s, count: zamModuleCount },
          { x: x0 + s * zamModuleW, y: zamY, w: zamModuleW, h: zamRowH });
      }
    }

    var totalW = nocW + M * 2;
    var totalH = nocH + (zamEntry ? zamRowH : 0) + M * 2;
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
