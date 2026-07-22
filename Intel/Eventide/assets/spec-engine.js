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
   * box from tile-sizes.js — no stretching, ever. (The previous version
   * used a proportional treemap that only consumed a tile's true area as
   * a splitting *weight*; the actual rendered rectangle came from
   * dividing up the parent's allocated space, which meant a fixed-size
   * tile like PSM or Thread Director rendered at a different literal
   * size on every SKU depending on what shared its row/column. That's
   * gone — this is real shelf-packing against exact boxes instead.)
   *
   * Two composition primitives:
   *   shelf(...cells) — lays cells left-to-right at their exact widths;
   *     shelf height = the tallest cell, shorter ones top-align (real
   *     gap below them, not stretched to fill).
   *   stack(...cells) — lays cells top-to-bottom at their exact heights;
   *     stack width = the widest cell, narrower ones left-align.
   * Both collapse to their single child when only one is non-null, so
   * absent tiles (SKUs that don't carry a given tile) disappear cleanly
   * without leaving a gap where they'd have been.
   *
   * Grouping mirrors the previous arrangement (GPU block on the left;
   * Kache-Kore/media column, cores/AI column, Compute/IO column to its
   * right) but every column's width/height is now just the true sum of
   * its real content — a sparse SKU produces a smaller die, not a
   * stretched one. Columns of different heights leave real (visible)
   * empty substrate at the bottom of the shorter ones, which is honestly
   * more realistic than forcing a perfect rectangle — real die shots
   * have plenty of visible scribe-line/interconnect area between blocks.
   *
   * ZAM/LPDDR6X renders as a row of real fixed-size modules below the
   * NoC, at its own true width (module count × the fixed module box) —
   * not stretched to match the NoC's width either. The package's outer
   * bounding box just grows to fit whichever of the two is wider.
   * ------------------------------------------------------------------ */
  var GAP = 6;   // real gap between adjacent tiles (substrate reveal)
  var M = 20;    // outer margin to the package substrate edge

  function shelf() {
    var cells = [].slice.call(arguments).filter(Boolean);
    if (!cells.length) return null;
    if (cells.length === 1) return cells[0];
    var w = 0, h = 0;
    cells.forEach(function (c, i) { w += c.w + (i > 0 ? GAP : 0); h = Math.max(h, c.h); });
    return {
      w: w, h: h,
      place: function (x, y) {
        var off = x;
        cells.forEach(function (c) { c.place(off, y); off += c.w + GAP; });
      }
    };
  }
  function stack() {
    var cells = [].slice.call(arguments).filter(Boolean);
    if (!cells.length) return null;
    if (cells.length === 1) return cells[0];
    var w = 0, h = 0;
    cells.forEach(function (c, i) { w = Math.max(w, c.w); h += c.h + (i > 0 ? GAP : 0); });
    return {
      w: w, h: h,
      place: function (x, y) {
        var off = y;
        cells.forEach(function (c) { c.place(x, off); off += c.h + GAP; });
      }
    };
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
        w: sz.w, h: sz.h,
        place: function (x, y) {
          placed.push({ id: id, meta: e.meta, model: e.t.model, index: 0, count: 1, x: x, y: y, w: sz.w, h: sz.h });
        }
      };
    }
    // multi-instance tile (gpu / compute / killers1) as a 2-column grid of exact-size leaves
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
        w: w, h: h,
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

    // ---- GPU block: 2x2 (or 1x1) grid of E1080s, the big block on the left ----
    var gpuCell = gridCell("gpu");

    // ---- Right block: Kache-Kore column | cores/AI column | Compute column ----
    var col1 = stack(
      shelf(leafCell("druid"), leafCell("kanvas2d")),  // media strip, above the cache
      leafCell("kachekore"),                           // centrepiece, centre of the column
      shelf(leafCell("klangkerne"), leafCell("mfx"))   // below the cache
    );
    var col2 = stack(
      shelf(leafCell("lpisland"), leafCell("hnpu")),   // cores/AI, upper-middle
      shelf(leafCell("bionzxr"), leafCell("io")),
      shelf(leafCell("psm"), gridCell("killers1"))     // killers1 renders 2 tiles on dual-ISP flagship SKUs
    );
    var col3 = stack(
      gridCell("compute"),                             // Compute tiles, top-right
      shelf(leafCell("ipu"), leafCell("gna")),         // fill beneath compute
      shelf(leafCell("display"), leafCell("threaddirector"))
    );
    var rightTree = shelf(col1, col2, col3);
    var fullTree = shelf(gpuCell, rightTree);

    var nocW = fullTree ? fullTree.w : 0;
    var nocH = fullTree ? fullTree.h : 0;
    if (fullTree) fullTree.place(M, M);

    // ---- ZAM/LPDDR6X: real fixed-size modules in a row below the NoC, at
    // their own true width. The Core ZAM box is calibrated so the flagship's
    // 8-module row exactly spans the tile grid; lower SKUs' shorter rows
    // simply cover less of the package, and the base-die fill below takes
    // the remainder — see tile-sizes.js. ----
    var zamEntry = byId.zam;
    var zamBox = S.zamModuleBox(zamEntry && zamEntry.t.model);
    var zamCount = zamEntry ? S.zamModules(zamEntry.t.capacityGB, zamEntry.t.moduleGB) : 0;
    if (zamEntry) {
      var zamY = M + nocH + GAP;
      for (var s = 0; s < zamCount; s++) {
        placed.push({
          id: "zam", meta: zamEntry.meta, model: zamEntry.t.model, index: s, count: zamCount,
          x: M + s * (zamBox.w + GAP), y: zamY, w: zamBox.w, h: zamBox.h
        });
      }
    }

    var zamRowW = zamCount ? zamCount * zamBox.w + (zamCount - 1) * GAP : 0;
    var totalW = Math.max(nocW, zamRowW) + M * 2;
    var totalH = nocH + (zamEntry ? GAP + zamBox.h : 0) + M * 2;

    /* ---- Base-die fill (the Foveros "magic") -------------------------------
       Real Foveros packages don't tessellate their functional tiles into a
       seamless rectangle — the tiles sit on a base die / interposer that IS
       the rectangle, and every square micron the tiles don't cover is passive
       structural silicon, not empty space. That's how you get all three at
       once: exact fixed tile sizes (no stretching), a perfect rectangle
       outline (the base die), and no visible voids (the base die fills the
       rest). We reproduce it here: after the true-size tiles are placed, we
       decompose every remaining rectangle inside the package into base-die
       cells. Grid-cut on every tile edge (so each grid cell is wholly covered
       or wholly empty), then greedily merge empty cells into maximal
       rectangles. Sub-GAP slivers between adjacent tiles are left to the
       substrate (they already read as base die); only meaningful leftover
       regions become explicit structural-silicon blocks. ---- */
    var fillers = computeBaseDie(placed, M, M, totalW - M, totalH - M);

    return { placed: placed, fillers: fillers, ghostSlots: [], width: totalW, height: totalH };
  }

  /* Decompose [x0,y0]-[x1,y1] minus every rect in `placed` into a small set of
     maximal empty rectangles (base-die fill). O(edges^2) — trivial for ~20
     tiles, runs once per render. */
  function computeBaseDie(placed, x0, y0, x1, y1) {
    var MIN_FILL = 12; // ignore inter-tile slivers this thin — substrate covers them
    var xsSet = {}, ysSet = {};
    xsSet[x0] = xsSet[x1] = true; ysSet[y0] = ysSet[y1] = true;
    placed.forEach(function (p) {
      if (p.x > x0) xsSet[p.x] = true;
      if (p.x + p.w < x1) xsSet[p.x + p.w] = true;
      if (p.y > y0) ysSet[p.y] = true;
      if (p.y + p.h < y1) ysSet[p.y + p.h] = true;
    });
    var xs = Object.keys(xsSet).map(Number).sort(function (a, b) { return a - b; });
    var ys = Object.keys(ysSet).map(Number).sort(function (a, b) { return a - b; });
    var nc = xs.length - 1, nr = ys.length - 1;
    if (nc < 1 || nr < 1) return [];

    function cellEmpty(i, j) {
      var cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
      for (var k = 0; k < placed.length; k++) {
        var p = placed[k];
        if (cx > p.x && cx < p.x + p.w && cy > p.y && cy < p.y + p.h) return false;
      }
      return true;
    }
    var empty = [], used = [];
    for (var j = 0; j < nr; j++) {
      empty[j] = []; used[j] = [];
      for (var i = 0; i < nc; i++) { empty[j][i] = cellEmpty(i, j); used[j][i] = false; }
    }

    var out = [];
    for (var jj = 0; jj < nr; jj++) {
      for (var ii = 0; ii < nc; ii++) {
        if (!empty[jj][ii] || used[jj][ii]) continue;
        // extend right along this row
        var i2 = ii;
        while (i2 + 1 < nc && empty[jj][i2 + 1] && !used[jj][i2 + 1]) i2++;
        // extend down while the whole [ii..i2] span stays empty+unused
        var j2 = jj, ok = true;
        while (ok && j2 + 1 < nr) {
          for (var k = ii; k <= i2; k++) { if (!empty[j2 + 1][k] || used[j2 + 1][k]) { ok = false; break; } }
          if (ok) j2++;
        }
        for (var a = jj; a <= j2; a++) for (var b = ii; b <= i2; b++) used[a][b] = true;
        var rx = xs[ii], ry = ys[jj], rw = xs[i2 + 1] - xs[ii], rh = ys[j2 + 1] - ys[jj];
        if (rw >= MIN_FILL && rh >= MIN_FILL) out.push({ x: rx, y: ry, w: rw, h: rh });
      }
    }
    return out;
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

    /* Base-die / structural-silicon fill: the passive interposer showing
       through wherever no functional tile sits. Drawn right on top of the
       substrate (behind every tile, ball and trace) so the whole package
       reads as one solid rectangle of silicon with the tiles mounted on it —
       no empty voids, exact tile sizes preserved. A faint diagonal hatch
       pattern sells it as real structural silicon rather than dead space. */
    var hatchId = "ev-basedie-hatch";
    var defs = el("defs", {});
    var pat = el("pattern", { id: hatchId, width: "7", height: "7", patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" });
    pat.appendChild(el("rect", { width: "7", height: "7", fill: "rgba(150,140,180,0.05)" }));
    pat.appendChild(el("line", { x1: "0", y1: "0", x2: "0", y2: "7", stroke: "rgba(255,255,255,0.06)", "stroke-width": "1" }));
    defs.appendChild(pat);
    svg.appendChild(defs);
    (layout.fillers || []).forEach(function (f) {
      svg.appendChild(el("rect", {
        class: "ev-basedie", x: f.x, y: f.y, width: f.w, height: f.h, rx: 3,
        fill: "url(#" + hatchId + ")", stroke: "rgba(255,255,255,0.05)", "stroke-width": "1"
      }));
    });

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
