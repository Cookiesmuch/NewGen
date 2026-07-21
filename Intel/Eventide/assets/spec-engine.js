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
   * Compass floorplan around the central Kache Kore die. Region distance
   * from the core encodes cache-latency sensitivity: Compute, LP Island,
   * HNPU and ZAM sit in the innermost ring; GPU sits to the left in a
   * second ring; low-bandwidth ancillary I/O sits furthest out, bottom
   * right. Positions are fixed (schematic, not to scale).
   * ------------------------------------------------------------------ */
  var VIEW_W = 1180, VIEW_H = 920;
  var REGIONS = {
    core:           { x: 460, y: 360, w: 220, h: 200 },
    "top-right":    { x: 700, y: 40,  w: 440, h: 260, itemW: 150, itemH: 108, gap: 14 },
    right:          { x: 700, y: 330, w: 150, h: 140, itemW: 150, itemH: 140, gap: 14 },
    top:            { x: 460, y: 140, w: 220, h: 180, itemW: 220, itemH: 170, gap: 14 },
    left:           { x: 40,  y: 280, w: 380, h: 340, itemW: 150, itemH: 150, gap: 16 },
    "far-left":     { x: 40,  y: 650, w: 210, h: 130, itemW: 190, itemH: 120, gap: 14 },
    bottom:         { x: 460, y: 580, w: 220, h: 140, itemW: 220, itemH: 130, gap: 14 },
    "bottom-left":  { x: 190, y: 740, w: 260, h: 150, itemW: 210, itemH: 130, gap: 14 },
    "bottom-right": { x: 700, y: 500, w: 440, h: 340, itemW: 100, itemH: 78,  gap: 12 }
  };

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

    var placed = [];
    Object.keys(REGIONS).forEach(function (zoneKey) {
      var items = byZone[zoneKey];
      if (!items || !items.length) return;
      var region = REGIONS[zoneKey];

      if (zoneKey === "core") {
        var it = items[0];
        placed.push({ id: it.id, meta: it.meta, index: 0, count: 1, x: region.x, y: region.y, w: region.w, h: region.h });
        return;
      }

      var iw = region.itemW, ih = region.itemH, gap = region.gap;
      var cols = Math.max(1, Math.min(items.length, Math.floor((region.w + gap) / (iw + gap))));
      var rows = Math.ceil(items.length / cols);
      var gridW = cols * iw + (cols - 1) * gap;
      var gridH = rows * ih + (rows - 1) * gap;
      var startX = region.x + Math.max(0, (region.w - gridW) / 2);
      var startY = region.y + Math.max(0, (region.h - gridH) / 2);

      items.forEach(function (it, i) {
        var col = i % cols, row = Math.floor(i / cols);
        placed.push({
          id: it.id, meta: it.meta, index: it.index, count: it.count,
          x: startX + col * (iw + gap), y: startY + row * (ih + gap), w: iw, h: ih
        });
      });
    });

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

    function makeTileGroup(id, meta, x, y, w, h, labelText) {
      var g = el("g", { class: "ev-tile-group", "data-tile": id, tabindex: "0" });
      var body = el("g", { class: "ev-tile-rect" });
      var rect = el("rect", {
        x: x, y: y, width: w, height: h, rx: 8,
        fill: meta.color, "fill-opacity": "0.16", stroke: meta.color, "stroke-width": "1.3"
      });
      body.appendChild(rect);
      var label = el("text", { class: "ev-tile-label", x: x + w / 2, y: y + h / 2 + 3 });
      label.textContent = labelText;
      body.appendChild(label);
      g.appendChild(body);
      g._center = { x: x + w / 2, y: y };
      g._tileId = id;
      g._meta = meta;
      return g;
    }

    var groups = [];
    layout.placed.forEach(function (p) {
      var labelText = p.count > 1 ? p.meta.name.replace(" Tile", "") + " " + (p.index + 1) : p.meta.name.replace(" Tile", "");
      var g = makeTileGroup(p.id, p.meta, p.x, p.y, p.w, p.h, labelText);
      addLegend(p.id, p.meta, p.count);

      if (p.meta.stacked && p.meta.stackTileId) {
        var stackMeta = window.EventideTiles.CATALOG[p.meta.stackTileId];
        if (stackMeta) {
          var sx = p.x + p.w - p.w * 0.42, sy = p.y - p.h * 0.06, sw = p.w * 0.44, sh = p.h * 0.5;
          var sg = makeTileGroup(p.meta.stackTileId, stackMeta, sx, sy, sw, sh, stackMeta.name);
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
      });
      g.addEventListener("mouseleave", function () {
        g.classList.remove("ev-hover");
        if (!focusedId) hideCallout();
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
