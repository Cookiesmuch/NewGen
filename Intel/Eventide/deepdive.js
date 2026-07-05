/*
 * Eventide deep-dive loader — shared by every deep-dive route stub.
 *
 * Each stub page (e.g. Intel/Eventide/CPU/SolarEclipse/index.html) sets
 * window.NG_DEEPDIVE_SRC to the content fragment it presents (relative to
 * the stub itself) and then includes this script. The fragment's styles and
 * body are fetched and inlined, so one visual document can be assembled
 * from several source files without an iframe or a route registry.
 */
(function () {
  'use strict';

  function toggleSection(id) {
    const body = document.getElementById(`body-${id}`);
    const icon = document.getElementById(`icon-${id}`);
    if (!body || !icon) {
      return;
    }

    const isOpen = body.classList.contains('open');
    body.classList.toggle('open', !isOpen);
    icon.classList.toggle('open', !isOpen);
    icon.textContent = isOpen ? '▼' : '▲';
  }
  // Some fragments wire collapsible sections to this global.
  window.toggleSection = toggleSection;

  async function loadDeepdive() {
    const container = document.getElementById('deepdive-container');
    const deepdiveSrc = window.NG_DEEPDIVE_SRC;

    if (!deepdiveSrc) {
      container.innerHTML = `
        <div class="error-message">
          <h1>404 Page Not Found</h1>
          <p>This deep-dive page does not declare a content source.</p>
          <p style="margin-top: 16px;">
            <a href="../../" style="color: var(--intel-blue); text-decoration: none;">← Return to Overview</a>
          </p>
        </div>
      `;
      return;
    }

    try {
      const response = await fetch(deepdiveSrc);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }

      const htmlContent = await response.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

      const styleNodes = Array.from(doc.querySelectorAll('style'));
      styleNodes.forEach((styleNode) => {
        const injectedStyle = document.createElement('style');
        injectedStyle.textContent = styleNode.textContent || '';
        document.head.appendChild(injectedStyle);
      });

      let bodyHtml;
      if (doc.body && doc.body.innerHTML) {
        bodyHtml = doc.body.innerHTML;
      } else {
        bodyHtml = htmlContent.replace(/<style[\s\S]*?<\/style>/gi, '').trim();
      }

      // Media lives at Intel/Eventide/Media/, two levels up from the stub.
      bodyHtml = bodyHtml
        .replaceAll('src="../Media/MustangOutline.svg"', 'src="../../Media/MustangOutline.svg"')
        .replaceAll('src="../Media/MustangLogo.svg"', 'src="../../Media/MustangLogo.svg"')
        .replaceAll('src="Media/MustangOutline.svg"', 'src="../../Media/MustangOutline.svg"')
        .replaceAll('src="Media/MustangLogo.svg"', 'src="../../Media/MustangLogo.svg"')
        .replaceAll('src="MustangOutline.svg"', 'src="../../Media/MustangOutline.svg"')
        .replaceAll('src="MustangLogo.svg"', 'src="../../Media/MustangLogo.svg"');

      container.innerHTML = bodyHtml;
    } catch (error) {
      console.error('Error loading deepdive:', error);
      container.innerHTML = `
        <div class="error-message">
          <h1>Error Loading Deep Dive</h1>
          <p>An error occurred while loading the deep dive content: ${error.message}</p>
          <p style="margin-top: 16px;">
            <a href="../../" style="color: var(--intel-blue); text-decoration: none;">← Return to Overview</a>
          </p>
        </div>
      `;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDeepdive);
  } else {
    loadDeepdive();
  }
})();
