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

  var ROWS = [
    { zones: ["compute", "lp", "ai"], h: 120, gap: 14 },
    { zones: ["gpu", "gpu-aux"], h: 116, gap: 14 },
    { zones: ["mem", "audio"], h: 108, gap: 18 },
    { zones: ["anc"], h: 62, gap: 10 }
  ];
  var SIZES = {
    compute: [118, 118], lp: [150, 118], ai: [104, 118],
    gpu: [118, 112], "gpu-aux": [96, 84],
    mem: [140, 104], audio: [156, 104],
    anc: [108, 58]
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
    var y = 30;
    var VIEW_W = 1180;
    ROWS.forEach(function (row) {
      var items = [];
      row.zones.forEach(function (z) { if (byZone[z]) items = items.concat(byZone[z]); });
      if (!items.length) return;
      var size = SIZES[items[0].meta.zone];
      // total width for centering
      var widths = items.map(function (it) { return SIZES[it.meta.zone][0]; });
      var totalW = widths.reduce(function (a, b) { return a + b; }, 0) + row.gap * (items.length - 1);
      var x = Math.max(20, (VIEW_W - totalW) / 2);
      items.forEach(function (it, i) {
        var w = SIZES[it.meta.zone][0], h = SIZES[it.meta.zone][1];
        placed.push({ id: it.id, meta: it.meta, index: it.index, count: it.count, x: x, y: y + (row.h - h) / 2, w: w, h: h });
        x += w + row.gap;
      });
      y += row.h + row.gap + 10;
    });
    return { placed: placed, height: y + 10 };
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

    var groups = layout.placed.map(function (p) {
      var g = el("g", { class: "ev-tile-group", "data-tile": p.id, tabindex: "0" });
      var body = el("g", { class: "ev-tile-rect" });
      var rect = el("rect", {
        x: p.x, y: p.y, width: p.w, height: p.h, rx: 8,
        fill: p.meta.color, "fill-opacity": "0.16", stroke: p.meta.color, "stroke-width": "1.3"
      });
      body.appendChild(rect);
      var label = el("text", { class: "ev-tile-label", x: p.x + p.w / 2, y: p.y + p.h / 2 + 3 });
      label.textContent = p.count > 1 ? p.meta.name.replace(" Tile", "") + " " + (p.index + 1) : p.meta.name.replace(" Tile", "");
      body.appendChild(label);
      g.appendChild(body);

      if (p.meta.stacked) {
        var sx = p.x + p.w - p.w * 0.42, sy = p.y - p.h * 0.06, sw = p.w * 0.44, sh = p.h * 0.5;
        var stackTop = el("g", { class: "ev-stack-top" });
        var srect = el("rect", { x: sx, y: sy, width: sw, height: sh, rx: 6, fill: p.meta.stackColor, "fill-opacity": "0.85", stroke: "#fff", "stroke-width": "0.6", "stroke-opacity": "0.3" });
        var slabel = el("text", { class: "ev-tile-label", x: sx + sw / 2, y: sy + sh / 2 + 3 });
        slabel.textContent = p.meta.stackLabel;
        slabel.setAttribute("fill", "#0B0714");
        stackTop.appendChild(srect); stackTop.appendChild(slabel);
        g.appendChild(stackTop);
        g._stackNode = { x: sx + sw / 2, y: sy, w: sw, name: p.meta.stackLabel };
      }

      g._center = { x: p.x + p.w / 2, y: p.y };
      g._tileId = p.id;
      g._meta = p.meta;

      if (!seenLegend[p.id]) {
        seenLegend[p.id] = true;
        var li = document.createElement("div");
        li.className = "ev-legend-item";
        var sw2 = document.createElement("span");
        sw2.className = "ev-legend-swatch";
        sw2.style.background = p.meta.color;
        li.appendChild(sw2);
        var txt = document.createElement("span");
        txt.textContent = p.meta.name + (p.count > 1 ? " ×" + p.count : "");
        li.appendChild(txt);
        if (legend) legend.appendChild(li);
      }

      svg.appendChild(g);
      return g;
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
