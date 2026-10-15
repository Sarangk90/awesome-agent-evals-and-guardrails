// Renders every ```mermaid block on the site with the ELK layout engine and a soft
// palette matched to light/dark mode, and opens any diagram in a
// full-screen viewer with zoom and pan. Works for new diagrams automatically.
(() => {
  const MERMAID = "https://cdn.jsdelivr.net/npm/mermaid@12.2.0/dist/mermaid.esm.min.mjs";
  const ELK = "https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk@1.0.1/dist/mermaid-layout-elk.esm.min.mjs";

  const sources = new WeakMap();
  let mermaidReady;
  let seq = 0;

  const loadMermaid = () =>
    (mermaidReady ??= Promise.all([import(MERMAID), import(ELK)]).then(([m, elk]) => {
      m.default.registerLayoutLoaders(elk.default);
      return m.default;
    }));

  const isDark = () => document.body.getAttribute("data-md-color-scheme") === "slate";

  // Below this inline scale text gets hard to read: wide left-to-right flowcharts are
  // re-laid out top-to-bottom, and anything still shrunk gets an "Expand to read" badge.
  const READABLE_SCALE = 0.75;
  const HORIZONTAL = /^(\s*(?:flowchart|graph)\s+)(LR|RL)\b/m;

  const PALETTE = {
    light: {
      primaryColor: "#eef1fd", mainBkg: "#eef1fd", primaryBorderColor: "#8b97e8", nodeBorder: "#8b97e8",
      primaryTextColor: "#1e293b", textColor: "#334155", titleColor: "#475569", lineColor: "#94a3b8",
      secondaryColor: "#f1f5f9", tertiaryColor: "#f8fafc", clusterBkg: "#f8fafc", clusterBorder: "#e2e8f0",
      actorBkg: "#eef1fd", actorBorder: "#8b97e8", actorTextColor: "#1e293b", signalColor: "#64748b",
      signalTextColor: "#1e293b", noteBkgColor: "#fef9e7", noteBorderColor: "#f3d98b", noteTextColor: "#1e293b",
    },
    dark: {
      darkMode: true,
      primaryColor: "#272c45", mainBkg: "#272c45", primaryBorderColor: "#5c6bd6", nodeBorder: "#5c6bd6",
      primaryTextColor: "#e2e8f0", textColor: "#cbd5e1", titleColor: "#94a3b8", lineColor: "#6b7489",
      secondaryColor: "#2a2f3d", tertiaryColor: "#23262f", clusterBkg: "#23262f", clusterBorder: "#363b4a",
      actorBkg: "#272c45", actorBorder: "#5c6bd6", actorTextColor: "#e2e8f0", signalColor: "#9aa3b5",
      signalTextColor: "#e2e8f0", noteBkgColor: "#3a3524", noteBorderColor: "#6b5f2e", noteTextColor: "#e2e8f0",
    },
  };

  function config() {
    const fontFamily = getComputedStyle(document.querySelector(".md-typeset") || document.body).fontFamily;
    const background = getComputedStyle(document.body).backgroundColor;
    return {
      startOnLoad: false,
      suppressErrorRendering: true,
      theme: "base",
      look: "classic",
      // ELK keeps large flowcharts compact, so text stays readable instead of shrinking.
      layout: "elk",
      fontFamily,
      themeVariables: {
        ...PALETTE[isDark() ? "dark" : "light"],
        fontFamily,
        fontSize: "14px",
        background,
        edgeLabelBackground: background,
      },
      flowchart: { htmlLabels: true, padding: 16, useMaxWidth: true },
      sequence: { useMaxWidth: true, mirrorActors: false, wrap: true, width: 130, actorMargin: 40, messageMargin: 36, boxMargin: 12 },
    };
  }

  const SHADOW_CSS = `
    :host { display: block; }
    svg { display: block; margin: 0 auto; height: auto; max-width: 100%; }
    p { margin: 0; }
    rect { rx: 8px; ry: 8px; }
    .cluster rect { rx: 12px; ry: 12px; }
    foreignObject { overflow: visible; }
    .labelBkg { background: transparent !important; }
    .edgeLabel p { border-radius: 4px; background: var(--diagram-bg); box-shadow: 0 0 0 4px var(--diagram-bg); }`;

  // Diagrams are rendered into a shadow root so page styles can't distort them.
  function shadowHost(svg, className) {
    const host = document.createElement("div");
    host.className = className;
    host.style.setProperty("--diagram-bg", getComputedStyle(document.body).backgroundColor);
    host.attachShadow({ mode: "open" }).innerHTML = `<style>${SHADOW_CSS}</style>${svg}`;
    return host;
  }

  function innerWidth(el) {
    const style = getComputedStyle(el);
    return el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  }

  function measure(svg, available) {
    const [, , width, height] = (svg.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 1 1").split(/[\s,]+/).map(Number);
    const scale = Math.min(1, available / width);
    return { scale, height: height * scale };
  }

  // Picks the more readable orientation for the page column; the viewer keeps the original.
  async function renderInline(mermaid, figure, source) {
    const { svg } = await mermaid.render(`diagram-${++seq}`, source);
    const available = innerWidth(figure);
    const original = measure(svg, available);
    if (original.scale >= READABLE_SCALE || !HORIZONTAL.test(source)) return { svg, inline: svg };
    try {
      const { svg: vertical } = await mermaid.render(`diagram-${++seq}`, source.replace(HORIZONTAL, "$1TB"));
      const turned = measure(vertical, available);
      const better = turned.scale > original.scale * 1.25 && turned.height < Math.max(innerHeight * 2, 1400);
      return { svg, inline: better ? vertical : svg };
    } catch {
      return { svg, inline: svg };
    }
  }

  function fitInline(figure) {
    const host = figure.querySelector(".diagram__svg");
    const svg = host?.shadowRoot.querySelector("svg");
    const natural = svg?.viewBox.baseVal?.width;
    if (!natural) return;
    figure.classList.toggle("is-shrunk", host.clientWidth / natural < READABLE_SCALE);
  }

  function collect() {
    for (const pre of document.querySelectorAll("pre.diagram")) {
      const figure = document.createElement("figure");
      figure.className = "diagram";
      figure.dataset.state = "loading";
      figure.tabIndex = 0;
      figure.setAttribute("role", "button");
      figure.setAttribute("aria-label", "Diagram. Press Enter to open full screen.");
      sources.set(figure, pre.textContent);
      pre.replaceWith(figure);
    }
    return [...document.querySelectorAll("figure.diagram")];
  }

  async function render(figures) {
    if (!figures.length) return;
    const mermaid = await loadMermaid();
    mermaid.initialize(config());
    for (const figure of figures) {
      const source = sources.get(figure);
      try {
        const { svg, inline } = await renderInline(mermaid, figure, source);
        figure.replaceChildren(shadowHost(inline, "diagram__svg"));
        figure.dataset.svg = svg;
        figure.dataset.state = "ready";
        fitInline(figure);
      } catch (error) {
        const message = document.createElement("p");
        message.className = "diagram__error";
        message.textContent = `Diagram failed to render: ${error?.message ?? error}`;
        const code = document.createElement("pre");
        code.append(Object.assign(document.createElement("code"), { textContent: source }));
        figure.replaceChildren(message, code);
        figure.dataset.state = "error";
      }
    }
  }

  function openViewer(svg) {
    const dialog = document.createElement("dialog");
    dialog.className = "diagram-viewer";
    dialog.innerHTML = `
      <div class="diagram-viewer__stage"></div>
      <div class="diagram-viewer__bar">
        <button type="button" data-zoom="out" title="Zoom out (−)" aria-label="Zoom out">−</button>
        <button type="button" data-zoom="fit" title="Fit to screen (0)" aria-label="Fit to screen">Fit</button>
        <button type="button" data-zoom="in" title="Zoom in (+)" aria-label="Zoom in">+</button>
        <button type="button" data-zoom="close" title="Close (Esc)" aria-label="Close">✕</button>
      </div>
      <p class="diagram-viewer__hint">Scroll or pinch to zoom · drag to pan · Esc to close</p>`;
    const stage = dialog.querySelector(".diagram-viewer__stage");
    const canvas = shadowHost(svg, "diagram-viewer__canvas");
    stage.append(canvas);
    const el = canvas.shadowRoot.querySelector("svg");
    const box = el.viewBox.baseVal;
    const [w, h] = box && box.width ? [box.width, box.height] : [el.getBBox().width, el.getBBox().height];
    el.style.maxWidth = "none";
    el.removeAttribute("height");

    let scale = 1, x = 0, y = 0;
    // Resize the SVG itself (rather than CSS-scaling it) so text stays crisp at every zoom.
    const apply = () => {
      el.setAttribute("width", w * scale);
      el.style.width = `${w * scale}px`;
      canvas.style.transform = `translate(${x}px, ${y}px)`;
    };
    const zoomAt = (factor, cx = stage.clientWidth / 2, cy = stage.clientHeight / 2) => {
      const next = Math.min(8, Math.max(0.1, scale * factor));
      x = cx - (cx - x) * (next / scale);
      y = cy - (cy - y) * (next / scale);
      scale = next;
      apply();
    };
    const fit = () => {
      scale = Math.min(2, (stage.clientWidth * 0.92) / w, (stage.clientHeight * 0.85) / h);
      x = (stage.clientWidth - w * scale) / 2;
      y = (stage.clientHeight - h * scale) / 2;
      apply();
    };

    stage.addEventListener("wheel", (e) => {
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    const pointers = new Map();
    let pinch = 0;
    stage.addEventListener("pointerdown", (e) => {
      stage.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      stage.classList.add("is-panning");
    });
    stage.addEventListener("pointermove", (e) => {
      const last = pointers.get(e.pointerId);
      if (!last) return;
      if (pointers.size === 1) {
        x += e.clientX - last.x;
        y += e.clientY - last.y;
        apply();
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const r = stage.getBoundingClientRect();
        if (pinch) zoomAt(dist / pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
        pinch = dist;
      }
    });
    const release = (e) => {
      pointers.delete(e.pointerId);
      pinch = 0;
      if (!pointers.size) stage.classList.remove("is-panning");
    };
    stage.addEventListener("pointerup", release);
    stage.addEventListener("pointercancel", release);

    dialog.querySelector(".diagram-viewer__bar").addEventListener("click", (e) => {
      const action = e.target.closest("button")?.dataset.zoom;
      if (action === "in") zoomAt(1.25);
      else if (action === "out") zoomAt(0.8);
      else if (action === "fit") fit();
      else if (action === "close") dialog.close();
    });
    dialog.addEventListener("keydown", (e) => {
      if (e.key === "+" || e.key === "=") zoomAt(1.25);
      else if (e.key === "-") zoomAt(0.8);
      else if (e.key === "0") fit();
    });
    dialog.addEventListener("close", () => dialog.remove());

    document.body.append(dialog);
    dialog.showModal();
    fit();
  }

  document.addEventListener("click", (e) => {
    const figure = e.target.closest?.("figure.diagram[data-state=ready]");
    if (figure) openViewer(figure.dataset.svg);
  });
  document.addEventListener("keydown", (e) => {
    const figure = e.target.closest?.("figure.diagram[data-state=ready]");
    if (figure && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openViewer(figure.dataset.svg);
    }
  });

  addEventListener("resize", () => document.querySelectorAll("figure.diagram[data-state=ready]").forEach(fitInline));

  // Re-render when the reader switches between light and dark mode.
  new MutationObserver(() => render([...document.querySelectorAll("figure.diagram")]))
    .observe(document.body, { attributeFilter: ["data-md-color-scheme"] });

  // document$ fires on first load and after every instant-navigation page change.
  if (window.document$) window.document$.subscribe(() => render(collect()));
  else document.addEventListener("DOMContentLoaded", () => render(collect()));
})();
