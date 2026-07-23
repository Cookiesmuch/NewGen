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
   * packed as tightly as possible by a MaxRects bin-packer (see below),
   * then mounted on a continuous base die / interposer that spans the
   * whole package. Wherever no tile sits,
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
     a bin as tightly as the free-rectangle heuristic allows. Units are inflated
     by GAP during packing so a real substrate channel is left between
     neighbours; the returned coords use the true (un-inflated) size. Returns a
     placement list or null if something didn't fit (caller then grows the bin).
     `preOccupied` (optional) is a list of inflated {x,y,w,h} regions already
     taken (e.g. hand-placed anchor blocks) — carved out of the bin before the
     units are packed, so the units flow around them.
     ~20 units, runs once per render — cost is irrelevant. */
  function packMaxRects(units, binW, binH, preOccupied) {
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

    if (preOccupied) preOccupied.forEach(function (r) { carve(r); });

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

  /* Pack `units` into a fixed-height-`binH` strip around the carved `pre`
     regions, at the MINIMUM feasible width — so the cluster is as narrow/dense
     as the tiles allow, with no dead margin on the right. Grows a bin until
     everything fits, then binary-searches the width down. */
  function packStripMinWidth(units, binH, pre, minW) {
    if (!units.length) return { res: [] };
    var area = 0;
    units.forEach(function (u) { area += (u.w + GAP) * (u.h + GAP); });
    var hi = Math.max(minW, area / binH);
    var top = null;
    for (var g = 0; g < 40 && !top; g++) { top = packMaxRects(units, hi, binH, pre); if (!top) hi *= 1.12; }
    if (!top) { // couldn't fit at all — fall back to a single row
      var res = [], rx = minW; units.forEach(function (u) { res.push({ unit: u, x: rx, y: 0 }); rx += u.w + GAP; });
      return { res: res };
    }
    var lo = minW, best = top, hiW = hi;
    for (var it = 0; it < 22; it++) {
      var mid = (lo + hiW) / 2;
      if (mid <= minW + 0.5) break;
      var r = packMaxRects(units, mid, binH, pre);
      if (r) { best = r; hiW = mid; } else { lo = mid; }
    }
    return { res: best };
  }

  /* Densest free-form pack: sweeps a range of bin heights, min-widths each, and
     keeps whichever gives the smallest bounding box (highest fill). Used for the
     GPU-less clusters, where nothing pins the aspect ratio. */
  /* Ranking cost for a candidate bounding box: mostly its area, but with a
     penalty for extreme aspect ratios (and a mild one for portrait) so the
     densest pack isn't a skinny tower — the die map card wants a landscape-ish
     rectangle. */
  function boxCost(w, h) {
    if (w <= 0 || h <= 0) return Infinity;
    var ar = Math.max(w, h) / Math.min(w, h);
    var pen = 1 + 0.6 * Math.max(0, ar - 3.0); // only rein in skinny 3:1+ towers
    return w * h * pen;
  }

  function packDense(units, pre) {
    pre = pre || [];
    if (!units.length) return { res: [], w: 0, h: 0 };
    var maxH = 0, maxW = 0, sumH = 0, preRight = 0, preBottom = 0;
    units.forEach(function (u) { maxH = Math.max(maxH, u.h + GAP); maxW = Math.max(maxW, u.w + GAP); sumH += u.h + GAP; });
    pre.forEach(function (r) { preRight = Math.max(preRight, r.x + r.w); preBottom = Math.max(preBottom, r.y + r.h); sumH += r.h; });
    maxH = Math.max(maxH, preBottom); maxW = Math.max(maxW, preRight);
    var best = null, N = 16;
    for (var i = 0; i < N; i++) {
      var binH = Math.max(preBottom, maxH + (sumH - maxH) * (i / (N - 1)));
      var r = packStripMinWidth(units, binH, pre, maxW).res;
      if (!r || !r.length) continue;
      var w = preRight, h = preBottom;
      r.forEach(function (p) { w = Math.max(w, p.x + p.unit.w); h = Math.max(h, p.y + p.unit.h); });
      var A = boxCost(w, h);
      if (!best || A < best.A) best = { res: r, w: w, h: h, A: A };
    }
    return best || { res: [], w: 0, h: 0 };
  }

  // one tile of a multi-instance block (GPU / Compute) as a placement unit, so
  // the block can be arranged manually (GPU grid; Compute split above/below Kache)
  function tileUnit(id, entry, sz, index, count, placed) {
    return {
      w: sz.w, h: sz.h,
      place: function (x, y) {
        placed.push({ id: id, meta: entry.meta, model: entry.t.model, index: index, count: count, x: x, y: y, w: sz.w, h: sz.h });
      }
    };
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
       read as one cluster; everything else is an individual unit. Every tile
       and the whole cluster is a deliberate wide floorplan on the Core lines:
       the GPU block anchors the full-height left edge, Kache Kore sits against
       its right edge vertically centred, the Compute block sits top-right with
       its corner against Kache, and every other tile is packed by the MaxRects
       heuristic into the remaining height-bounded strip. Atom (no GPU) just
       packs everything generically. ---- */
    var gpuEntry = byId.gpu;
    var compute = gridCell("compute");
    var kache = leafCell("kachekore");
    var smallIds = ["killers1", "druid", "lpisland", "hnpu", "bionzxr", "kanvas2d",
                    "klangkerne", "mfx", "io", "psm", "ipu", "gna", "display", "threaddirector"];
    var smalls = [];
    smallIds.forEach(function (id) {
      var u = (id === "killers1") ? gridCell(id) : leafCell(id);
      if (u) smalls.push(u);
    });

    var nocW = 0, nocH = 0;
    var placements = []; // {unit, x, y} in cluster coords (origin 0,0)

    /* ---- ZAM/LPDDR6X modules, computed up front so tiles can be packed
       around them. A ZAM "block" is `zamCount` fixed modules arranged in
       `cols` columns; a single full-width row (cols == count) is the classic
       memory band, but on SKUs whose RAM is narrower than the tile cluster we
       pack tiles into the strip beside it, and on RAM-heavy Atom parts we wrap
       the modules into a squarer block so tiles fit around it — both cut the
       dead space the fixed-size RAM used to leave. ---- */
    var zamEntry = byId.zam;
    var zamBox = S.zamModuleBox(zamEntry && zamEntry.t.model);
    var zamCount = zamEntry ? S.zamModules(zamEntry.t.capacityGB, zamEntry.t.moduleGB) : 0;
    var zamRowW = zamCount ? zamCount * zamBox.w + (zamCount - 1) * GAP : 0;
    function zamBlockUnit(cols) {
      cols = Math.max(1, Math.min(zamCount, cols || zamCount));
      var perRow = Math.min(zamCount, cols);
      var rows = Math.ceil(zamCount / cols);
      return {
        w: perRow * zamBox.w + (perRow - 1) * GAP,
        h: rows * zamBox.h + (rows - 1) * GAP,
        place: function (x, y) {
          for (var s = 0; s < zamCount; s++) {
            var c = s % cols, r = Math.floor(s / cols);
            placed.push({ id: "zam", meta: zamEntry.meta, model: zamEntry.t.model, index: s, count: zamCount,
              x: x + c * (zamBox.w + GAP), y: y + r * (zamBox.h + GAP), w: zamBox.w, h: zamBox.h });
          }
        }
      };
    }
    var zamHandledInPack = false; // set when ZAM is placed inside the packing (not as a band below)

    if (gpuEntry) {
      /* ---- Structured wide Core floorplan ----
         GPU block on the left (defines the chip height). Kache Kore sits against
         its right edge, vertically centred between the E1080 rows. The Compute
         tiles split into a row ABOVE Kache and a row BELOW it — each compute
         tile is ~the height of the gap the centred cache leaves above/below
         itself, so this fills that column snugly. Every remaining tile is then
         dense-packed (minimum width) into the height-bounded strip to the right,
         flowing into the notch beside Kache too. ---- */
      var gpuTile = S.sizeOf("gpu", gpuEntry);
      var gN = gpuEntry.t.count || 1;
      var computeEntry = byId.compute;
      var cTile = computeEntry ? S.sizeOf("compute", computeEntry) : null;
      var cN = computeEntry ? (computeEntry.t.count || 1) : 0;
      var cTopN = Math.ceil(cN / 2), cBotN = cN - cTopN;
      var kW = kache ? kache.w : 0, kH = kache ? kache.h : 0;

      // chip height is driven by the centred-Kache + compute-rows column…
      var H = Math.max(kH, cTile ? cTile.h : 0);
      if (cTile && kache) H = Math.max(H, 2 * (cTile.h + GAP) + kH);
      // …and the GPU tiles are arranged into a grid whose stacked height matches
      // it (so a 2-tile GPU stacks 1×2 tall instead of sitting short and wide)
      var gpuRows = Math.max(1, Math.min(gN, Math.round(H / (gpuTile.h + GAP)) || 1));
      var gpuCols = Math.ceil(gN / gpuRows);
      var gpuW = gpuCols * gpuTile.w + (gpuCols - 1) * GAP;
      var gpuH = gpuRows * gpuTile.h + (gpuRows - 1) * GAP;
      H = Math.max(H, gpuH);

      var gpuY0 = (H - gpuH) / 2;
      for (var gi = 0; gi < gN; gi++) {
        var gc = gi % gpuCols, gr = Math.floor(gi / gpuCols);
        placements.push({ unit: tileUnit("gpu", gpuEntry, gpuTile, gi, gN, placed),
                          x: gc * (gpuTile.w + GAP), y: gpuY0 + gr * (gpuTile.h + GAP) });
      }

      var bx = gpuW + GAP;       // bin = everything right of the GPU
      var pre = [];              // inflated regions carved out before packing smalls

      if (kache) {
        var ky = (H - kH) / 2;   // vertically centred → between the E1080 rows
        placements.push({ unit: kache, x: bx, y: ky });
        pre.push({ x: 0, y: ky, w: kW + GAP, h: kH + GAP });
      }
      if (cTile) {
        for (var ci = 0; ci < cN; ci++) {
          var top = ci < cTopN;
          var col = top ? ci : (ci - cTopN);
          var cxp = col * (cTile.w + GAP);
          var cyp = top ? 0 : (H - cTile.h);
          placements.push({ unit: tileUnit("compute", computeEntry, cTile, ci, cN, placed), x: bx + cxp, y: cyp });
          pre.push({ x: cxp, y: cyp, w: cTile.w + GAP, h: cTile.h + GAP });
        }
      }

      var minBinW = Math.max(kW + GAP,
                             cTopN ? cTopN * cTile.w + (cTopN - 1) * GAP + GAP : 0,
                             cBotN ? cBotN * cTile.w + (cBotN - 1) * GAP + GAP : 0);
      var packed = packStripMinWidth(smalls, H, pre, minBinW);
      packed.res.forEach(function (p) { placements.push({ unit: p.unit, x: bx + p.x, y: p.y }); });

      /* ---- Fill beside the RAM ------------------------------------------
         If the RAM row is narrower than this cluster it would leave a dead
         strip beside it. Re-pack the small tiles into an L-region — the
         height-H strip PLUS the band beside the bottom-left RAM row — so the
         die packs into 2D instead of one wide short strip, flowing tiles in
         beside the RAM and narrowing the whole package. The full-width-ZAM
         flagship (RAM already spans the cluster) skips this and is untouched. */
      if (zamCount) {
        var clusterW0 = 0;
        placements.forEach(function (p) { clusterW0 = Math.max(clusterW0, p.x + p.unit.w); });
        // RAM columns, capped so the block never exceeds the cluster width: a
        // narrow RAM stays a single row (fill beside it); a RAM that's wider
        // than the cluster (the flagship-calibrated module makes lower X-parts'
        // 8-module row overhang) wraps into rows instead of a too-wide band.
        // The true flagship — RAM row == cluster width — keeps its single row.
        var zCols = Math.max(1, Math.min(zamCount, Math.floor((clusterW0 + GAP + 0.5) / (zamBox.w + GAP))));
        var singleRowFull = (zCols === zamCount) && (zamRowW >= clusterW0 - 1);
        if (!singleRowFull) {
          function areaOf(pl) { var w = 0, h = 0; pl.forEach(function (p) { w = Math.max(w, p.x + p.unit.w); h = Math.max(h, p.y + p.unit.h); }); return boxCost(w, h); }
          function gpuPre() {
            var pl = [], pr = [];
            for (var g = 0; g < gN; g++) {
              var gc = g % gpuCols, gr = Math.floor(g / gpuCols);
              var gx = gc * (gpuTile.w + GAP), gy = gr * (gpuTile.h + GAP);
              pl.push({ unit: tileUnit("gpu", gpuEntry, gpuTile, g, gN, placed), x: gx, y: gy });
              pr.push({ x: gx, y: gy, w: gpuTile.w + GAP, h: gpuTile.h + GAP });
            }
            return { pl: pl, pre: pr };
          }
          /* Candidate A — flagship-style: GPU left, Kache centred, compute rows
             flanking it, RAM as a band below, small tiles L-packed beside it.
             Candidate B — GPU pinned, everything else dense-packed around it.
             Both are tried across a few RAM-block shapes; the tightest wins. */
          function buildA(cols) {
            var g = gpuPre(), cand = g.pl.slice(), pre = g.pre.slice();
            if (kache) { cand.push({ unit: kache, x: bx, y: ky }); pre.push({ x: bx, y: ky, w: kW + GAP, h: kH + GAP }); }
            if (cTile) for (var c = 0; c < cN; c++) {
              var t = c < cTopN, col = t ? c : (c - cTopN);
              var cx = bx + col * (cTile.w + GAP), cy = t ? 0 : (H - cTile.h);
              cand.push({ unit: tileUnit("compute", computeEntry, cTile, c, cN, placed), x: cx, y: cy });
              pre.push({ x: cx, y: cy, w: cTile.w + GAP, h: cTile.h + GAP });
            }
            var zu = zamBlockUnit(cols);
            cand.push({ unit: zu, x: 0, y: H + GAP });
            pre.push({ x: 0, y: H + GAP, w: zu.w + GAP, h: zu.h });
            var minW = 0; pre.forEach(function (r) { minW = Math.max(minW, r.x + r.w); });
            packStripMinWidth(smalls, H + GAP + zu.h, pre, minW).res.forEach(function (p) { cand.push({ unit: p.unit, x: p.x, y: p.y }); });
            return cand;
          }
          function buildB(cols) {
            var g = gpuPre(), cand = g.pl.slice();
            var rest = [];
            if (kache) rest.push(kache);
            if (cTile) for (var c = 0; c < cN; c++) rest.push(tileUnit("compute", computeEntry, cTile, c, cN, placed));
            smalls.forEach(function (u) { rest.push(u); });
            rest.push(zamBlockUnit(cols));
            packDense(rest, g.pre).res.forEach(function (p) { cand.push({ unit: p.unit, x: p.x, y: p.y }); });
            return cand;
          }
          var colOpts = {};
          [zCols, Math.ceil(zamCount / 2), Math.ceil(zamCount / 3), Math.round(Math.sqrt(zamCount)), zamCount]
            .forEach(function (c) { colOpts[Math.max(1, Math.min(zamCount, c))] = 1; });
          var best = null;
          Object.keys(colOpts).forEach(function (cs) {
            [buildA(+cs), buildB(+cs)].forEach(function (cand) {
              var a = areaOf(cand);
              if (!best || a < best.a) best = { pl: cand, a: a };
            });
          });
          placements = best.pl;
          zamHandledInPack = true;
        }
      }
    } else {
      /* ---- Atom / i-series (any GPU-less config): densest free-form pack.
         The RAM joins the tile set as one block (a single row when it's small,
         wrapped squarer when it's a RAM-heavy part) so the height-sweep packs
         everything — tiles and memory — into the tightest bounding box. ---- */
      var units = [];
      if (kache) units.push(kache);
      if (compute) units.push(compute);
      smalls.forEach(function (u) { units.push(u); });

      if (zamCount && units.length) {
        // try a few RAM-block shapes (1 row … few rows) and keep whichever
        // packs the whole die tightest
        var colOpts = {};
        [zamCount, Math.round(Math.sqrt(zamCount)), Math.ceil(zamCount / 2), Math.ceil(zamCount / 3), Math.ceil(zamCount / 4)]
          .forEach(function (c) { colOpts[Math.max(1, Math.min(zamCount, c))] = 1; });
        var bestPD = null;
        Object.keys(colOpts).forEach(function (cs) {
          var pd = packDense(units.concat([zamBlockUnit(+cs)]));
          var A = boxCost(pd.w, pd.h);
          if (!bestPD || A < bestPD.A) bestPD = { res: pd.res, A: A };
        });
        bestPD.res.forEach(function (p) { placements.push({ unit: p.unit, x: p.x, y: p.y }); });
        zamHandledInPack = true;
      } else if (zamCount) {
        var zug = zamBlockUnit(Math.max(1, Math.round(Math.sqrt(zamCount))));
        placements.push({ unit: zug, x: 0, y: 0 });
        zamHandledInPack = true;
      } else if (units.length) {
        packDense(units).res.forEach(function (p) { placements.push({ unit: p.unit, x: p.x, y: p.y }); });
      }
    }

    if (placements.length) {
      var minX = Infinity, minY = Infinity;
      placements.forEach(function (p) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); });
      placements.forEach(function (p) {
        var px = p.x - minX, py = p.y - minY;
        nocW = Math.max(nocW, px + p.unit.w);
        nocH = Math.max(nocH, py + p.unit.h);
        p.unit.place(M + px, M + py);
      });
    }

    /* ---- ZAM/LPDDR6X band below the cluster — ONLY for the full-width-RAM
       case (the flagship, whose calibrated 8-module row spans the cluster).
       Everywhere else the RAM was packed inside the cluster above (beside the
       tiles), so there's nothing to append here. ---- */
    if (zamEntry && !zamHandledInPack) {
      var zamY = M + nocH + GAP;
      for (var s2 = 0; s2 < zamCount; s2++) {
        placed.push({
          id: "zam", meta: zamEntry.meta, model: zamEntry.t.model, index: s2, count: zamCount,
          x: M + s2 * (zamBox.w + GAP), y: zamY, w: zamBox.w, h: zamBox.h
        });
      }
    }

    var bandBelow = (zamEntry && !zamHandledInPack) ? GAP + zamBox.h : 0;
    var totalW = Math.max(nocW, zamHandledInPack ? 0 : zamRowW) + M * 2;
    var totalH = nocH + bandBelow + M * 2;

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
