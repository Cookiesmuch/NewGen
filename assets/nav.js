/*
 * NewGen global navigator — injected sidebar shared by every page.
 *
 * Pages include this once (with assets/nav.css). Routes map 1:1 to real
 * folders on disk (e.g. /Intel/Eventide/ is Intel/Eventide/index.html), so
 * every nav entry is a plain <a> link and each click is a normal page load.
 * The site root is derived from this script's own URL, which keeps links
 * correct on the custom domain, on *.github.io project pages, and locally.
 */
(function () {
  'use strict';

  const scriptSrc = document.currentScript && document.currentScript.src;
  const SITE_ROOT = scriptSrc ? new URL('..', scriptSrc).href : new URL('/', window.location.href).href;
  const SITE_ROOT_PATH = new URL(SITE_ROOT).pathname;

  // Route ids use the historical loader paths ('/Intel/Eventide'); each maps
  // to the real folder SITE_ROOT + 'Intel/Eventide/'.
  function routeHref(routePath) {
    if (routePath === '/') return SITE_ROOT;
    return SITE_ROOT + routePath.replace(/^\//, '') + '/';
  }

  function currentRoute() {
    let p = window.location.pathname;
    if (p.startsWith(SITE_ROOT_PATH)) {
      p = '/' + p.slice(SITE_ROOT_PATH.length);
    }
    p = p.replace(/\/index\.html?$/i, '/');
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p || '/';
  }

  const ICONS = {
    companies: {
      'Intel': '🔷',
      'Sony': '📷',
      'ASUS': '💎',
      'Bang & Olufsen': '🎵',
      'Aerospace division': '🚀'
    },
    categories: {
      'CPU Architectures': '🖥️',
      'CPU SKUs': '🧾',
      'Products': '🧭',
      'Core 500': '📦',
      'Core i500': '🧩',
      'Core u500': '🚀',
      'Core x500': '🏁',
      'GPU Architectures': '🎨',
      'Tiles': '🧩',
      'Technologies': '⚡'
    },
    pages: {
      'Eventide': '📘',
      'Alpha 0 (a0)': '📸',
      'XCD-LED': '🎥',
      'CRT-VR': '📺',
      'Ceralumenesium Sapphire': '💠',
      'wH105': '🎶',
      'STARSCRAMMER™': '🛸',
      // CPU Architecture icons
      'Solar Eclipse': '☀️',
      'Sunset Cove': '🌅',
      'Venusmont': '🌋',
      'Lunar Eclipse': '🌑',
      'Darkmont': '🌙',
      // GPU Architecture icons
      'Elementalist': '✨',
      'Druid': '🌿',
      '2D Kanvas': '🎭',
      // Tile icons
      'ZAM': '🧠',
      'HNPU': '🎯',
      'LPNPU': '💡',
      'GNA': '🔊',
      'BionzXR': '📹',
      'MFX': '🎬',
      'IPU': '🖼️',
      'Klangkerne': '🎵',
      'Display': '🖥️',
      'KillerS1': '📡',
      'IO': '🔌',
      'PSM': '🔋',
      // Technology icons
      'Thread Director': '🎛️'
    }
  };

  const PRODUCT_HIGHLIGHT_COLORS = {
    // Choose based on the page's vibe.
    '/Intel/Eventide': {
      soft: 'rgba(140, 112, 255, 0.10)',
      row: 'rgba(140, 112, 255, 0.12)',
      border: 'rgba(140, 112, 255, 0.45)'
    },
    '/Sony/ILCE-0': {
      soft: 'rgba(184, 148, 42, 0.10)',
      row: 'rgba(184, 148, 42, 0.12)',
      border: 'rgba(184, 148, 42, 0.46)'
    },
    '/Sony/XCD-LED': {
      soft: 'rgba(0, 180, 255, 0.10)',
      row: 'rgba(0, 180, 255, 0.12)',
      border: 'rgba(255, 45, 32, 0.52)'
    },
    '/Sony/CRT-VR': {
      soft: 'rgba(0, 255, 153, 0.10)',
      row: 'rgba(0, 255, 153, 0.12)',
      border: 'rgba(0, 255, 153, 0.48)'
    },
    '/ASUS/Ceralumenesium': {
      soft: 'rgba(182, 246, 255, 0.10)',
      row: 'rgba(182, 246, 255, 0.12)',
      border: 'rgba(182, 246, 255, 0.46)'
    },
    '/BangOlufsen/wH105': {
      soft: 'rgba(0, 180, 220, 0.10)',
      row: 'rgba(0, 180, 220, 0.12)',
      border: 'rgba(0, 180, 220, 0.46)'
    },
    '/Aerospace/STARSCRAMMER': {
      soft: 'rgba(232, 88, 60, 0.10)',
      row: 'rgba(232, 88, 60, 0.12)',
      border: 'rgba(232, 88, 60, 0.46)'
    }
  };

  const NAV_STRUCTURE = {
    'Intel': [
      {
        label: 'Eventide',
        path: '/Intel/Eventide',
        subCategories: {
          'CPU Architectures': [
            { label: 'Solar Eclipse', path: '/Intel/Eventide/CPU/SolarEclipse' },
            { label: 'Sunset Cove', path: '/Intel/Eventide/CPU/SunsetCove' },
            { label: 'Venusmont', path: '/Intel/Eventide/CPU/Venusmont' },
            { label: 'Lunar Eclipse', path: '/Intel/Eventide/CPU/LunarEclipse' },
            { label: 'Darkmont', path: '/Intel/Eventide/CPU/Darkmont' }
          ],
          'Products': [
            {
              label: 'Core 500',
              items: [
                { label: 'Core™ 3 533U', path: '/Intel/Eventide/SKU/C3-533U' },
                { label: 'Core™ 3 534H', path: '/Intel/Eventide/SKU/C3-534H' },
                { label: 'Core™ 3 535V', path: '/Intel/Eventide/SKU/C3-535V' },
                { label: 'Core™ 5 553U', path: '/Intel/Eventide/SKU/C5-553U' },
                { label: 'Core™ 5 554H', path: '/Intel/Eventide/SKU/C5-554H' },
                { label: 'Core™ 5 555V', path: '/Intel/Eventide/SKU/C5-555V' },
                { label: 'Core™ 7 573U', path: '/Intel/Eventide/SKU/C7-573U' },
                { label: 'Core™ 7 574H', path: '/Intel/Eventide/SKU/C7-574H' },
                { label: 'Core™ 7 575V', path: '/Intel/Eventide/SKU/C7-575V' },
                { label: 'Core™ 9 593U', path: '/Intel/Eventide/SKU/C9-593U' },
                { label: 'Core™ 9 594H', path: '/Intel/Eventide/SKU/C9-594H' },
                { label: 'Core™ 9 595V', path: '/Intel/Eventide/SKU/C9-595V' }
              ]
            },
            {
              label: 'Core i500',
              items: [
                { label: 'Core™ i3 533H', path: '/Intel/Eventide/SKU/I3-533H' },
                { label: 'Core™ i3 534HX', path: '/Intel/Eventide/SKU/I3-534HX' },
                { label: 'Core™ i3 535HK', path: '/Intel/Eventide/SKU/I3-535HK' },
                { label: 'Core™ i3 536F', path: '/Intel/Eventide/SKU/I3-536F' },
                { label: 'Core™ i3 537T', path: '/Intel/Eventide/SKU/I3-537T' },
                { label: 'Core™ i5 553H', path: '/Intel/Eventide/SKU/I5-553H' },
                { label: 'Core™ i5 554HX', path: '/Intel/Eventide/SKU/I5-554HX' },
                { label: 'Core™ i5 555HK', path: '/Intel/Eventide/SKU/I5-555HK' },
                { label: 'Core™ i5 556F', path: '/Intel/Eventide/SKU/I5-556F' },
                { label: 'Core™ i5 557T', path: '/Intel/Eventide/SKU/I5-557T' },
                { label: 'Core™ i7 573H', path: '/Intel/Eventide/SKU/I7-573H' },
                { label: 'Core™ i7 574HX', path: '/Intel/Eventide/SKU/I7-574HX' },
                { label: 'Core™ i7 575HK', path: '/Intel/Eventide/SKU/I7-575HK' },
                { label: 'Core™ i7 576F', path: '/Intel/Eventide/SKU/I7-576F' },
                { label: 'Core™ i7 577T', path: '/Intel/Eventide/SKU/I7-577T' },
                { label: 'Core™ i9 593H', path: '/Intel/Eventide/SKU/I9-593H' },
                { label: 'Core™ i9 594HX', path: '/Intel/Eventide/SKU/I9-594HX' },
                { label: 'Core™ i9 595HK', path: '/Intel/Eventide/SKU/I9-595HK' },
                { label: 'Core™ i9 596F', path: '/Intel/Eventide/SKU/I9-596F' },
                { label: 'Core™ i9 597T', path: '/Intel/Eventide/SKU/I9-597T' }
              ]
            },
            {
              label: 'Core u500',
              items: [
                { label: 'Core™ Ultra 3 533U', path: '/Intel/Eventide/SKU/U3-533U' },
                { label: 'Core™ Ultra 3 534H', path: '/Intel/Eventide/SKU/U3-534H' },
                { label: 'Core™ Ultra 3 535HX', path: '/Intel/Eventide/SKU/U3-535HX' },
                { label: 'Core™ Ultra 3 536HK', path: '/Intel/Eventide/SKU/U3-536HK' },
                { label: 'Core™ Ultra 3 537V', path: '/Intel/Eventide/SKU/U3-537V' },
                { label: 'Core™ Ultra 5 553U', path: '/Intel/Eventide/SKU/U5-553U' },
                { label: 'Core™ Ultra 5 554H', path: '/Intel/Eventide/SKU/U5-554H' },
                { label: 'Core™ Ultra 5 555HX', path: '/Intel/Eventide/SKU/U5-555HX' },
                { label: 'Core™ Ultra 5 556HK', path: '/Intel/Eventide/SKU/U5-556HK' },
                { label: 'Core™ Ultra 5 557V', path: '/Intel/Eventide/SKU/U5-557V' },
                { label: 'Core™ Ultra 7 573U', path: '/Intel/Eventide/SKU/U7-573U' },
                { label: 'Core™ Ultra 7 574H', path: '/Intel/Eventide/SKU/U7-574H' },
                { label: 'Core™ Ultra 7 575HX', path: '/Intel/Eventide/SKU/U7-575HX' },
                { label: 'Core™ Ultra 7 576HK', path: '/Intel/Eventide/SKU/U7-576HK' },
                { label: 'Core™ Ultra 7 577V', path: '/Intel/Eventide/SKU/U7-577V' },
                { label: 'Core™ Ultra 9 593U', path: '/Intel/Eventide/SKU/U9-593U' },
                { label: 'Core™ Ultra 9 594H', path: '/Intel/Eventide/SKU/U9-594H' },
                { label: 'Core™ Ultra 9 595HX', path: '/Intel/Eventide/SKU/U9-595HX' },
                { label: 'Core™ Ultra 9 596HK', path: '/Intel/Eventide/SKU/U9-596HK' },
                { label: 'Core™ Ultra 9 597V', path: '/Intel/Eventide/SKU/U9-597V' }
              ]
            },
            {
              label: 'Core x500',
              items: [
                { label: 'Core™ Xeon® 7 577HX', path: '/Intel/Eventide/SKU/X7-577HX' },
                { label: 'Core™ Xeon® 7 578HK', path: '/Intel/Eventide/SKU/X7-578HK' },
                { label: 'Core™ Xeon® 7 579HKX', path: '/Intel/Eventide/SKU/X7-579HKX' },
                { label: 'Core™ Xeon® 9 597HX', path: '/Intel/Eventide/SKU/X9-597HX' },
                { label: 'Core™ Xeon® 9 598HK', path: '/Intel/Eventide/SKU/X9-598HK' },
                { label: 'Core™ Xeon® 9 599HKX', path: '/Intel/Eventide/SKU/X9-599HKX' }
              ]
            }
          ],
          'GPU Architectures': [
            { label: 'Elementalist', path: '/Intel/Eventide/GPU/Elementalist' },
            { label: 'Druid', path: '/Intel/Eventide/GPU/Druid' },
            { label: '2D Kanvas', path: '/Intel/Eventide/GPU/2DKanvas' }
          ],
          'Tiles': [
            { label: 'ZAM', path: '/Intel/Eventide/Tile/ZAM' },
            { label: 'HNPU', path: '/Intel/Eventide/Tile/HNPU' },
            { label: 'LPNPU', path: '/Intel/Eventide/Tile/LPNPU' },
            { label: 'GNA', path: '/Intel/Eventide/Tile/GNA' },
            { label: 'BionzXR', path: '/Intel/Eventide/Tile/BionzXR' },
            { label: 'MFX', path: '/Intel/Eventide/Tile/MFX' },
            { label: 'IPU', path: '/Intel/Eventide/Tile/IPU' },
            { label: 'Klangkerne', path: '/Intel/Eventide/Tile/Klangkerne' },
            { label: 'Display', path: '/Intel/Eventide/Tile/Display' },
            { label: 'KillerS1', path: '/Intel/Eventide/Tile/KillerS1' },
            { label: 'IO', path: '/Intel/Eventide/Tile/IO' },
            { label: 'PSM', path: '/Intel/Eventide/Tile/PSM' }
          ],
          'Technologies': [
            { label: 'Thread Director', path: '/Intel/Eventide/Technology/ThreadDirector' }
          ]
        }
      }
    ],
    'Sony': [
      { label: 'Alpha 0 (a0)', path: '/Sony/ILCE-0' },
      { label: 'XCD-LED', path: '/Sony/XCD-LED' },
      { label: 'CRT-VR', path: '/Sony/CRT-VR' }
    ],
    'ASUS': [
      { label: 'Ceralumenesium Sapphire', path: '/ASUS/Ceralumenesium' }
    ],
    'Bang & Olufsen': [
      { label: 'wH105', path: '/BangOlufsen/wH105' }
    ],
    'Aerospace division': [
      { label: 'STARSCRAMMER™', path: '/Aerospace/STARSCRAMMER' }
    ]
  };

  const NAV_INDICATOR_DOT_SIZE_PX = 10;
  const NAV_INDICATOR_LOADING_SIZE_PX = 12;
  const NAV_INDICATOR_LINE_TOP_OFFSET_PX = 2;
  const NAV_INDICATOR_LINE_VERTICAL_PADDING_PX = 4;
  const SIDEBAR_COLLAPSE_DELAY_MS = 120;
  const SIDEBAR_EXPAND_TRANSITION_MS = 360;

  let sidebar = null;
  let menuToggle = null;
  let navStateIndicator = null;
  let indicatorHoverTarget = null;
  let indicatorLoadingTarget = null;
  let navIsLoading = false;
  let suppressIndicatorUpdate = false;
  let sidebarFocusCollapseTimer = null;
  let sidebarExpandIndicatorTimer = null;

  function buildNavigationHtml() {
    let html = `
      <div class="sidebar-home">
        <a class="nav-item" data-path="/" href="${routeHref('/')}" aria-label="Navigate to NewGen home page"><span class="nav-item-icon">🏠</span> NewGen Conglomerate</a>
      </div>
    `;
    for (const [company, items] of Object.entries(NAV_STRUCTURE)) {
      const companyIcon = ICONS.companies[company] || '📁';
      html += `
        <div class="nav-category">
          <button type="button" class="cat-header" data-company="${company}" aria-expanded="false">
            <span><span class="nav-item-icon">${companyIcon}</span> ${company}</span>
            <span class="cat-icon">▶</span>
          </button>
          <div class="cat-items">
            ${items.map((item) => {
              const pageIcon = ICONS.pages[item.label] || '📄';
              let itemHtml = `<a class="nav-item" data-path="${item.path}" href="${routeHref(item.path)}"><span class="nav-item-icon">${pageIcon}</span> ${item.label}</a>`;

              if (item.subCategories) {
                let subCategoriesHtml = '';
                for (const [subCatName, subItems] of Object.entries(item.subCategories)) {
                  const categoryIcon = ICONS.categories[subCatName] || '📂';
                  subCategoriesHtml += `
                    <div class="sub-category">
                      <button type="button" class="sub-cat-header" data-product-path="${item.path}" data-subcat="${subCatName}" aria-expanded="false">
                        <span><span class="nav-item-icon">${categoryIcon}</span> ${subCatName}</span>
                        <span class="sub-cat-icon">▶</span>
                      </button>
                      <div class="sub-cat-items">
                        ${subItems.map((subItem) => {
                          if (Array.isArray(subItem.items)) {
                            const miniName = subItem.label;
                            return `
                              <div class="mini-sub-category">
                                <button type="button" class="mini-sub-cat-header" data-product-path="${item.path}" data-subcat="${subCatName}" data-minicat="${miniName}" aria-expanded="false">
                                  <span><span class="nav-item-icon">${ICONS.categories[miniName] || '•'}</span> ${miniName}</span>
                                  <span class="mini-sub-cat-icon">▶</span>
                                </button>
                                <div class="mini-sub-cat-items">
                                  ${subItem.items.map((leafItem) => {
                                    const subIcon = ICONS.pages[leafItem.label] || '•';
                                    return `<a class="nav-item nested deep-nested" data-path="${leafItem.path}" href="${routeHref(leafItem.path)}"><span class="nav-item-icon">${subIcon}</span> ${leafItem.label}</a>`;
                                  }).join('')}
                                </div>
                              </div>
                            `;
                          }
                          const subIcon = ICONS.pages[subItem.label] || '•';
                          return `<a class="nav-item nested" data-path="${subItem.path}" href="${routeHref(subItem.path)}"><span class="nav-item-icon">${subIcon}</span> ${subItem.label}</a>`;
                        }).join('')}
                      </div>
                    </div>
                  `;
                }
                const productSubcatsId = `product-subcats-${item.path.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
                itemHtml = `
                  <div class="product-group" data-product-path="${item.path}">
                    <div class="product-row">
                      <a class="nav-item product-main" data-path="${item.path}" href="${routeHref(item.path)}"><span class="nav-item-icon">${pageIcon}</span> ${item.label}</a>
                      <button type="button" class="product-toggle" data-product-path="${item.path}" aria-expanded="false" aria-label="Expand ${item.label} subcategories" aria-controls="${productSubcatsId}">
                        <span class="product-toggle-icon">▶</span>
                      </button>
                    </div>
                    <div class="product-subcats" id="${productSubcatsId}">
                      ${subCategoriesHtml}
                    </div>
                  </div>
                `;
              }
              return itemHtml;
            }).join('')}
          </div>
        </div>
      `;
    }
    return html;
  }

  function buildPageLookup() {
    const lookup = {};
    for (const [company, items] of Object.entries(NAV_STRUCTURE)) {
      const companyIcon = ICONS.companies[company] || '📁';
      for (const item of items) {
        lookup[item.path] = { label: item.label, icon: ICONS.pages[item.label] || companyIcon };
        if (item.subCategories) {
          for (const subItems of Object.values(item.subCategories)) {
            for (const subItem of subItems) {
              if (Array.isArray(subItem.items)) {
                for (const leafItem of subItem.items) {
                  lookup[leafItem.path] = { label: leafItem.label, icon: ICONS.pages[leafItem.label] || '📄' };
                }
              } else {
                lookup[subItem.path] = { label: subItem.label, icon: ICONS.pages[subItem.label] || '📄' };
              }
            }
          }
        }
      }
    }
    return lookup;
  }

  function extractProductPath(pathname) {
    if (!pathname) return '';
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length < 2) return '';
    return `/${parts[0]}/${parts[1]}`;
  }

  function ensureNavStateIndicator() {
    if (navStateIndicator) return navStateIndicator;
    navStateIndicator = document.createElement('div');
    navStateIndicator.className = 'nav-state-indicator';
    navStateIndicator.setAttribute('aria-hidden', 'true');
    sidebar.appendChild(navStateIndicator);
    return navStateIndicator;
  }

  function moveNavIndicatorToButton(button, mode) {
    const indicator = ensureNavStateIndicator();
    if (!button || !sidebar.classList.contains('ng-expanded')) {
      indicator.style.opacity = '0';
      indicator.classList.remove('dot', 'line', 'loading');
      return;
    }
    const sidebarRect = sidebar.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const indicatorSize = mode === 'loading' ? NAV_INDICATOR_LOADING_SIZE_PX : NAV_INDICATOR_DOT_SIZE_PX;
    const top = buttonRect.top - sidebarRect.top + sidebar.scrollTop + (
      mode === 'line'
        ? NAV_INDICATOR_LINE_TOP_OFFSET_PX
        : (buttonRect.height - indicatorSize) / 2
    );
    indicator.style.top = `${Math.max(0, top)}px`;
    indicator.style.height = mode === 'line'
      ? `${Math.max(14, buttonRect.height - NAV_INDICATOR_LINE_VERTICAL_PADDING_PX)}px`
      : `${indicatorSize}px`;
    indicator.style.opacity = '1';
    indicator.classList.toggle('dot', mode === 'dot');
    indicator.classList.toggle('line', mode === 'line');
    indicator.classList.toggle('loading', mode === 'loading');
  }

  function updateNavStateIndicator() {
    if (navIsLoading && indicatorLoadingTarget) {
      moveNavIndicatorToButton(indicatorLoadingTarget, 'loading');
      return;
    }
    if (suppressIndicatorUpdate) {
      moveNavIndicatorToButton(null, 'dot');
      return;
    }
    const hoveredButton = indicatorHoverTarget && indicatorHoverTarget.matches('.nav-item') ? indicatorHoverTarget : null;
    if (hoveredButton) {
      moveNavIndicatorToButton(hoveredButton, 'dot');
      return;
    }
    const activeButton = sidebar.querySelector('.nav-item.active');
    if (activeButton) {
      moveNavIndicatorToButton(activeButton, 'line');
      return;
    }
    moveNavIndicatorToButton(null, 'dot');
  }

  function clearSidebarExpandIndicatorTimer() {
    window.clearTimeout(sidebarExpandIndicatorTimer);
    sidebarExpandIndicatorTimer = null;
  }

  function suppressIndicatorUntilSidebarExpandSettles() {
    suppressIndicatorUpdate = true;
    updateNavStateIndicator();
    clearSidebarExpandIndicatorTimer();
    sidebarExpandIndicatorTimer = window.setTimeout(() => {
      suppressIndicatorUpdate = false;
      updateNavStateIndicator();
      sidebarExpandIndicatorTimer = null;
    }, SIDEBAR_EXPAND_TRANSITION_MS);
  }

  function openSection(itemsEl, headerEl) {
    if (!itemsEl || !headerEl) return;
    itemsEl.classList.add('open');
    headerEl.classList.add('active');
    headerEl.setAttribute('aria-expanded', 'true');
  }

  // Expand every collapsible section that contains the active nav item so
  // the current page is visible in the tree when the sidebar opens.
  function expandAncestorsOf(activeButton) {
    const companyItems = activeButton.closest('.cat-items');
    if (companyItems) {
      const companyHeader = companyItems.previousElementSibling;
      if (companyHeader && companyHeader.classList.contains('cat-header')) {
        openSection(companyItems, companyHeader);
      }
    }

    const productGroup = activeButton.closest('.product-group');
    if (productGroup) {
      const productSubcats = productGroup.querySelector('.product-subcats');
      const productToggle = productGroup.querySelector('.product-toggle');
      if (productSubcats && productToggle && activeButton.closest('.product-subcats')) {
        productSubcats.classList.add('open');
        productToggle.classList.add('active');
        productToggle.setAttribute('aria-expanded', 'true');
      }
    }

    const subCategoryItems = activeButton.closest('.sub-cat-items');
    if (subCategoryItems) {
      const subCategoryHeader = subCategoryItems.previousElementSibling;
      if (subCategoryHeader && subCategoryHeader.classList.contains('sub-cat-header')) {
        openSection(subCategoryItems, subCategoryHeader);
      }
    }

    const miniItems = activeButton.closest('.mini-sub-cat-items');
    if (miniItems) {
      const miniHeader = miniItems.previousElementSibling;
      if (miniHeader && miniHeader.classList.contains('mini-sub-cat-header')) {
        openSection(miniItems, miniHeader);
      }
    }
  }

  function applyActiveState() {
    const route = currentRoute();
    const activeProductPath = extractProductPath(route);

    sidebar.querySelectorAll('.nav-item').forEach((btn) => {
      const isActive = btn.dataset.path === route;
      btn.classList.toggle('active', isActive);
      if (isActive) btn.setAttribute('aria-current', 'page');
      const navProductPath = extractProductPath(btn.dataset.path || '');
      btn.classList.toggle('active-page-highlight', !!activeProductPath && navProductPath === activeProductPath);
    });

    sidebar.querySelectorAll('.product-group').forEach((group) => {
      group.classList.toggle('active-product', !!activeProductPath && group.dataset.productPath === activeProductPath);
    });

    const activeButton = sidebar.querySelector('.nav-item.active');
    if (activeButton) {
      expandAncestorsOf(activeButton);
    }

    const collapsedPageIcon = sidebar.querySelector('#ng-collapsed-page-icon');
    const collapsedPageName = sidebar.querySelector('#ng-collapsed-page-name');
    const pageLookup = buildPageLookup();
    const info = pageLookup[route] || { label: 'NewGen', icon: '🏠' };
    if (collapsedPageIcon) collapsedPageIcon.textContent = info.icon;
    if (collapsedPageName) collapsedPageName.textContent = info.label;
  }

  function attachHandlers() {
    sidebar.querySelectorAll('.cat-header').forEach((header) => {
      header.addEventListener('click', () => {
        header.classList.toggle('active');
        const items = header.nextElementSibling;
        items.classList.toggle('open');
        header.setAttribute('aria-expanded', items.classList.contains('open') ? 'true' : 'false');
      });
    });

    sidebar.querySelectorAll('.product-toggle').forEach((toggle) => {
      toggle.addEventListener('click', () => {
        const productSubcats = toggle.closest('.product-group')?.querySelector('.product-subcats');
        if (!productSubcats) return;
        productSubcats.classList.toggle('open');
        toggle.classList.toggle('active', productSubcats.classList.contains('open'));
        const expanded = productSubcats.classList.contains('open');
        toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        const productMain = toggle.closest('.product-group')?.querySelector('.product-main');
        const productLabel = productMain ? productMain.textContent.trim() : 'product';
        toggle.setAttribute('aria-label', `${expanded ? 'Collapse' : 'Expand'} ${productLabel} subcategories`);
      });
    });

    sidebar.querySelectorAll('.sub-cat-header, .mini-sub-cat-header').forEach((header) => {
      header.addEventListener('click', () => {
        header.classList.toggle('active');
        const items = header.nextElementSibling;
        if (!items) return;
        items.classList.toggle('open');
        header.setAttribute('aria-expanded', items.classList.contains('open') ? 'true' : 'false');
      });
    });

    sidebar.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('mouseenter', () => {
        indicatorHoverTarget = btn;
        updateNavStateIndicator();
      });
      btn.addEventListener('mouseleave', () => {
        if (indicatorHoverTarget === btn) {
          indicatorHoverTarget = null;
        }
        updateNavStateIndicator();
      });
      btn.addEventListener('click', () => {
        // Real link navigation — just show the loading state until unload.
        navIsLoading = true;
        indicatorLoadingTarget = btn;
        updateNavStateIndicator();
      });
    });

    sidebar.addEventListener('mouseenter', () => {
      if (window.innerWidth <= 900) return;
      sidebar.classList.add('ng-expanded');
      indicatorHoverTarget = null;
      suppressIndicatorUntilSidebarExpandSettles();
    });

    sidebar.addEventListener('mouseleave', () => {
      if (window.innerWidth <= 900) return;
      sidebar.classList.remove('ng-expanded');
      clearSidebarExpandIndicatorTimer();
      suppressIndicatorUpdate = false;
      indicatorHoverTarget = null;
      updateNavStateIndicator();
    });

    sidebar.addEventListener('focusin', () => {
      if (sidebarFocusCollapseTimer) {
        window.clearTimeout(sidebarFocusCollapseTimer);
        sidebarFocusCollapseTimer = null;
      }
      if (window.innerWidth > 900) {
        sidebar.classList.add('ng-expanded');
        indicatorHoverTarget = null;
        suppressIndicatorUntilSidebarExpandSettles();
      }
    });

    sidebar.addEventListener('focusout', (event) => {
      if (window.innerWidth <= 900) return;
      const nextFocused = event.relatedTarget;
      if (!nextFocused || !sidebar.contains(nextFocused)) {
        if (sidebarFocusCollapseTimer) {
          window.clearTimeout(sidebarFocusCollapseTimer);
        }
        sidebarFocusCollapseTimer = window.setTimeout(() => {
          sidebar.classList.remove('ng-expanded');
          indicatorHoverTarget = null;
          updateNavStateIndicator();
          sidebarFocusCollapseTimer = null;
        }, SIDEBAR_COLLAPSE_DELAY_MS);
      }
    });

    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', sidebar.classList.contains('open') ? 'true' : 'false');
    });
  }

  function injectNavigator() {
    document.documentElement.classList.add('ng-has-nav');

    sidebar = document.createElement('nav');
    sidebar.className = 'ng-sidebar';
    sidebar.id = 'ng-sidebar';
    sidebar.setAttribute('aria-label', 'Company Navigation');
    sidebar.innerHTML = `
      <div class="collapsed-indicator" aria-hidden="true">
        <span class="collapsed-page-icon" id="ng-collapsed-page-icon">🔷</span>
        <span class="collapsed-page-name" id="ng-collapsed-page-name">NewGen</span>
      </div>
      <div id="ng-nav-content">${buildNavigationHtml()}</div>
    `;
    document.body.appendChild(sidebar);

    menuToggle = document.createElement('button');
    menuToggle.type = 'button';
    menuToggle.className = 'ng-menu-toggle';
    menuToggle.id = 'ng-menu-toggle';
    menuToggle.textContent = 'Menu';
    menuToggle.setAttribute('aria-controls', 'ng-sidebar');
    menuToggle.setAttribute('aria-expanded', 'false');
    document.body.appendChild(menuToggle);

    // Per-product highlight colors, same behavior as the old shell.
    sidebar.querySelectorAll('.product-group').forEach((group) => {
      const highlight = PRODUCT_HIGHLIGHT_COLORS[group.dataset.productPath];
      if (!highlight) return;
      group.style.setProperty('--product-highlight-soft', highlight.soft);
      group.style.setProperty('--product-highlight-row', highlight.row);
      group.style.setProperty('--product-highlight-border', highlight.border);
    });
    sidebar.querySelectorAll('.nav-item:not(.nested)').forEach((button) => {
      const highlight = PRODUCT_HIGHLIGHT_COLORS[button.dataset.path || ''];
      if (!highlight) return;
      button.style.setProperty('--product-highlight-soft', highlight.soft);
      button.style.setProperty('--product-highlight-row', highlight.row);
      button.style.setProperty('--product-highlight-border', highlight.border);
    });

    attachHandlers();
    applyActiveState();
    updateNavStateIndicator();
  }

  /* ------------------------------------------------------------------ *
   * Launcher watchdog — only meaningful when served by Server/server.js
   * locally, so it is skipped everywhere else to avoid useless polling.
   * ------------------------------------------------------------------ */
  const HEARTBEAT_INTERVAL_MS = 2000;
  const HEARTBEAT_FAILURE_THRESHOLD_COUNT = 2;
  const PING_INTERVAL_MS = 3000;
  const REQUEST_TIMEOUT_MS = 2000;
  const CLIENT_CLOSE_COUNTDOWN_S = 3;
  const CLOSE_TAB_HEADER_VALUE = '1';
  let heartbeatTimer = null;
  let pingTimer = null;
  let consecutiveHeartbeatFailures = 0;
  let clientCloseCountdownTimer = null;
  let clientCloseCountdownInterval = null;
  let clientCloseCountdownReason = '';
  let clientCloseCountdownRemaining = 0;
  let watchdogBanner = null;

  function isLocalHost() {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  }

  async function safeFetch(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        ...options,
        signal: controller.signal,
      });
      if (!response.ok && response.status !== 204) {
        throw new Error(`Request failed: ${response.status}`);
      }
      return response;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  function ensureWatchdogBanner() {
    if (watchdogBanner) return watchdogBanner;
    watchdogBanner = document.createElement('div');
    watchdogBanner.className = 'ng-watchdog-banner';
    watchdogBanner.setAttribute('role', 'status');
    watchdogBanner.setAttribute('aria-live', 'assertive');
    document.body.appendChild(watchdogBanner);
    return watchdogBanner;
  }

  function stopWatchdogTimers() {
    window.clearInterval(heartbeatTimer);
    window.clearInterval(pingTimer);
  }

  function sendClosedSignal() {
    const sent = navigator.sendBeacon('/__launcher/closed');
    if (!sent) {
      fetch('/__launcher/closed', { method: 'POST', keepalive: true, cache: 'no-store' })
        .catch((error) => {
          console.warn(`[WATCHDOG] Fallback close signal failed (${error?.message ?? 'unknown'}).`);
        });
    }
  }

  function closeTabFromWatchdog() {
    sendClosedSignal();
    clearClientCloseCountdown();
    stopWatchdogTimers();
    window.close();
  }

  function renderWatchdogBanner() {
    const banner = ensureWatchdogBanner();
    banner.textContent = `[WATCHDOG] ${clientCloseCountdownReason}. Closing tab in ${clientCloseCountdownRemaining}s...`;
    banner.classList.add('show');
  }

  function clearClientCloseCountdown() {
    if (clientCloseCountdownTimer) {
      window.clearTimeout(clientCloseCountdownTimer);
      clientCloseCountdownTimer = null;
    }
    if (clientCloseCountdownInterval) {
      window.clearInterval(clientCloseCountdownInterval);
      clientCloseCountdownInterval = null;
    }
    clientCloseCountdownReason = '';
    clientCloseCountdownRemaining = 0;
    if (watchdogBanner) {
      watchdogBanner.textContent = '';
      watchdogBanner.classList.remove('show');
    }
  }

  function startClientCloseCountdown(reason, seconds = CLIENT_CLOSE_COUNTDOWN_S) {
    if (clientCloseCountdownTimer) return;
    clientCloseCountdownReason = reason;
    clientCloseCountdownRemaining = seconds;
    console.error(`[WATCHDOG] ${reason}. Closing tab countdown started (${seconds}s).`);
    renderWatchdogBanner();
    clientCloseCountdownInterval = window.setInterval(() => {
      clientCloseCountdownRemaining -= 1;
      if (clientCloseCountdownRemaining <= 0) {
        window.clearInterval(clientCloseCountdownInterval);
        clientCloseCountdownInterval = null;
        return;
      }
      renderWatchdogBanner();
    }, 1000);
    clientCloseCountdownTimer = window.setTimeout(() => {
      closeTabFromWatchdog();
    }, seconds * 1000);
  }

  async function setupWatchdog() {
    if (!isLocalHost()) return;
    let launcherWatchdog = false;
    try {
      const status = await safeFetch('/__launcher/status').then((r) => r.json());
      launcherWatchdog = Boolean(status.watchdog);
    } catch (error) {
      return; // not served by the launcher — nothing to watch
    }
    if (!launcherWatchdog) return;

    heartbeatTimer = window.setInterval(() => {
      safeFetch('/__launcher/heartbeat', { method: 'POST', keepalive: true })
        .then(() => {
          clearClientCloseCountdown();
          consecutiveHeartbeatFailures = 0;
        })
        .catch(() => {
          consecutiveHeartbeatFailures += 1;
          if (consecutiveHeartbeatFailures >= HEARTBEAT_FAILURE_THRESHOLD_COUNT) {
            startClientCloseCountdown('Server heartbeat is unavailable');
          }
        });
    }, HEARTBEAT_INTERVAL_MS);

    pingTimer = window.setInterval(async () => {
      try {
        const pingResponse = await safeFetch('/__launcher/ping');
        if (pingResponse.headers.get('x-newgen-close-tab') === CLOSE_TAB_HEADER_VALUE) {
          startClientCloseCountdown('Launcher initiated shutdown');
        }
      } catch (error) {
        startClientCloseCountdown('Launcher ping failed');
      }
    }, PING_INTERVAL_MS);

    window.addEventListener('beforeunload', sendClosedSignal);
    window.addEventListener('pagehide', sendClosedSignal);
  }

  function init() {
    injectNavigator();
    setupWatchdog();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
