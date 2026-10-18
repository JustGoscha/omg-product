// Injected into prototypes served by the omgp studio (?omgp=1).
// Talks to the studio via postMessage: spotlight an element, show comment pins,
// and pick elements to comment on. Prototypes stay plain HTML without it.
(() => {
  if (window.__omgp) return;
  window.__omgp = true;
  const post = (msg) => parent !== window && parent.postMessage({ omgp: true, ...msg }, "*");
  const colors = { change: "#e5484d", question: "#3e63dd", idea: "#e5a00d", praise: "#30a46c" };

  const layer = document.createElement("div");
  layer.setAttribute("data-omgp", "");
  layer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483646;";
  const spot = document.createElement("div");
  spot.style.cssText =
    "position:fixed;display:none;border-radius:6px;box-shadow:0 0 0 3px rgba(255,214,10,.95),0 0 0 100vmax rgba(10,12,20,.55);transition:all .35s cubic-bezier(.2,.8,.2,1);pointer-events:none;";
  const hover = document.createElement("div");
  hover.style.cssText = "position:fixed;display:none;outline:2px dashed #e5484d;outline-offset:2px;border-radius:3px;pointer-events:none;background:rgba(229,72,77,.06)";
  layer.append(spot, hover);
  const mount = () => document.body && !layer.isConnected && document.body.appendChild(layer);

  let focusSel = null, pins = [], annotate = false, dimmed = true;

  const find = (sel) => {
    if (!sel) return null;
    try { return document.querySelector(sel); } catch { return null; }
  };

  function cssPath(el) {
    if (!(el instanceof Element)) return null;
    for (const attr of ["data-focus", "data-fb", "data-testid"]) {
      const v = el.getAttribute(attr);
      if (v && document.querySelectorAll(`[${attr}="${CSS.escape(v)}"]`).length === 1) return `[${attr}="${v}"]`;
    }
    if (el.id && document.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1) return `#${CSS.escape(el.id)}`;
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      let part = node.tagName.toLowerCase();
      if (node.id && document.querySelectorAll(`#${CSS.escape(node.id)}`).length === 1) {
        parts.unshift(`#${CSS.escape(node.id)}`);
        break;
      }
      const fb = node.getAttribute("data-focus") || node.getAttribute("data-fb");
      if (fb) { parts.unshift(`[${node.hasAttribute("data-focus") ? "data-focus" : "data-fb"}="${fb}"]`); break; }
      const sibs = node.parentElement ? [...node.parentElement.children].filter((c) => c.tagName === node.tagName) : [];
      if (sibs.length > 1) part += `:nth-of-type(${sibs.indexOf(node) + 1})`;
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(" > ") || "body";
  }

  function label(el) {
    const tag = el.tagName.toLowerCase();
    const t = (el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.innerText || el.getAttribute("title") || "")
      .replace(/\s+/g, " ").trim();
    return t ? `${tag} “${t.length > 48 ? t.slice(0, 47) + "…" : t}”` : tag;
  }

  const pinEls = new Map();
  function renderPins() {
    mount();
    const live = new Set();
    pins.forEach((p, i) => {
      live.add(p.id);
      let el = pinEls.get(p.id);
      if (!el) {
        el = document.createElement("button");
        el.type = "button";
        el.style.cssText =
          "position:fixed;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50% 50% 50% 4px;border:2px solid #fff;color:#fff;font:600 12px/22px system-ui,sans-serif;text-align:center;cursor:pointer;pointer-events:auto;box-shadow:0 4px 12px rgba(0,0,0,.25);transition:transform .15s";
        el.onmouseenter = () => (el.style.transform = "scale(1.15)");
        el.onmouseleave = () => (el.style.transform = "");
        el.onclick = (e) => { e.stopPropagation(); post({ type: "pin-click", id: p.id }); };
        layer.appendChild(el);
        pinEls.set(p.id, el);
      }
      el.textContent = String(p.n ?? i + 1);
      el.title = p.text || "";
      el.style.background = colors[p.kind] || colors.change;
      el.dataset.sel = p.selector || "";
      el.dataset.x = p.x ?? 0.5;
      el.dataset.y = p.y ?? 0.5;
    });
    for (const [id, el] of pinEls) if (!live.has(id)) { el.remove(); pinEls.delete(id); }
    place();
  }

  function place() {
    for (const el of pinEls.values()) {
      const target = find(el.dataset.sel);
      if (!target) { el.style.display = "none"; continue; }
      const r = target.getBoundingClientRect();
      if (!r.width && !r.height) { el.style.display = "none"; continue; }
      el.style.display = "";
      el.style.left = `${r.left + r.width * +el.dataset.x}px`;
      el.style.top = `${r.top + r.height * +el.dataset.y}px`;
    }
    const f = find(focusSel);
    if (f) {
      const r = f.getBoundingClientRect();
      spot.style.display = "block";
      spot.style.left = `${r.left - 6}px`;
      spot.style.top = `${r.top - 6}px`;
      spot.style.width = `${r.width + 12}px`;
      spot.style.height = `${r.height + 12}px`;
      spot.style.boxShadow = dimmed
        ? "0 0 0 3px rgba(255,214,10,.95),0 0 0 100vmax rgba(10,12,20,.55)"
        : "0 0 0 3px rgba(255,214,10,.95)";
    } else spot.style.display = "none";
  }

  // scrollIntoView would also scroll the studio around the frame; only scroll inside the prototype
  function scrollWithin(el) {
    for (let node = el.parentElement; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
      const s = getComputedStyle(node);
      if (/(auto|scroll)/.test(s.overflowY + s.overflowX) && (node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth)) {
        const r = el.getBoundingClientRect(), nr = node.getBoundingClientRect();
        node.scrollTop += r.top - nr.top - Math.max(0, (node.clientHeight - r.height) / 2);
        node.scrollLeft += r.left - nr.left - Math.max(0, (node.clientWidth - r.width) / 2);
      }
    }
    const r = el.getBoundingClientRect();
    window.scrollBy({ top: r.top - Math.max(0, (innerHeight - r.height) / 2), left: r.left - Math.max(0, (innerWidth - r.width) / 2), behavior: "smooth" });
  }

  function setFocus(sel, scroll = true) {
    focusSel = sel || null;
    mount();
    const f = find(focusSel);
    if (f && scroll) scrollWithin(f);
    place();
  }

  // annotate mode
  let hovered = null;
  document.addEventListener("mousemove", (e) => {
    if (!annotate) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || layer.contains(el)) return;
    hovered = el;
    const r = el.getBoundingClientRect();
    Object.assign(hover.style, { display: "block", left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  }, true);
  document.addEventListener("click", (e) => {
    if (!annotate) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || layer.contains(el)) return;
    e.preventDefault();
    e.stopPropagation();
    const r = el.getBoundingClientRect();
    post({
      type: "pick",
      selector: cssPath(el),
      label: label(el),
      x: r.width ? Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) : 0.5,
      y: r.height ? Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) : 0.5,
      hash: location.hash,
    });
  }, true);

  window.addEventListener("message", (e) => {
    const m = e.data;
    if (!m || !m.omgp) return;
    if (m.type === "focus") { dimmed = m.dim !== false; setFocus(m.selector, m.scroll !== false); }
    if (m.type === "pins") { pins = m.pins || []; renderPins(); }
    if (m.type === "annotate") {
      annotate = !!m.on;
      document.documentElement.style.cursor = annotate ? "crosshair" : "";
      if (!annotate) hover.style.display = "none";
    }
    if (m.type === "hash" && typeof m.hash === "string" && location.hash !== m.hash) location.hash = m.hash;
  });

  window.addEventListener("scroll", place, true);
  window.addEventListener("resize", place);
  window.addEventListener("hashchange", () => { post({ type: "hash", hash: location.hash }); setTimeout(() => setFocus(focusSel, false), 50); });
  setInterval(place, 400);
  const ready = () => { mount(); post({ type: "ready", hash: location.hash, title: document.title }); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
})();
