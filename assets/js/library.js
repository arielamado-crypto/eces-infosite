/* ECES E-Library — book covers, reading badges and the page-flip e-book reader.
   PDFs open as flip books (PDF.js), E-Book Maker HTML files open as they are,
   Word/PowerPoint open in Google Drive's viewer. */
window.ECESLib = (function () {
  "use strict";
  const C = window.ECES || {};
  const api = String(C.driveApi || "").trim();
  const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";

  /* ---------- reading progress (this device) ---------- */
  const KEY = "eces-read-books";
  const readSet = () => { try { return new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch (e) { return new Set(); } };
  function markRead(id) { const s = readSet(); s.add(id); try { localStorage.setItem(KEY, JSON.stringify([...s])); } catch (e) {} document.dispatchEvent(new CustomEvent("eces-read")); }
  const LEVELS = [[0, "🌱", "Start your reading adventure!"], [1, "📗", "Little Reader"], [3, "📘", "Book Explorer"], [6, "📙", "Bookworm"], [10, "🏆", "Super Reader"], [20, "👑", "Reading Champion"]];
  function level(n) {
    let cur = LEVELS[0], next = null;
    LEVELS.forEach((l, i) => { if (n >= l[0]) { cur = l; next = LEVELS[i + 1] || null; } });
    return { icon: cur[1], name: cur[2], next, n };
  }

  /* ---------- kinds & covers ---------- */
  function kind(f) {
    const m = f.mime || "", n = f.name || "";
    if (/pdf/.test(m) || /\.pdf$/i.test(n)) return "pdf";
    if (/html/.test(m) || /\.html?$/i.test(n)) return "html";
    if (/^image\//.test(m)) return "image";
    if (/google-apps\.(document|presentation)/.test(m)) return "pdf";
    return "drive";
  }
  const LABEL = { pdf: "PDF", html: "E-BOOK", image: "PICTURE", drive: "FILE" };
  const SUBJ = [[/math|numer/i, "🧮"], [/science|plant|animal/i, "🔬"], [/english|reading|story|kwento|literacy/i, "📖"], [/filipino|pagbasa/i, "🇵🇭"],
    [/araling|social|\bap\b|history/i, "🌏"], [/mapeh|music|arts?\b|pe\b|health/i, "🎨"], [/epp|tle|livelihood/i, "🛠️"], [/gmrc|values|esp/i, "💛"], [/computer|ict/i, "💻"]];
  const COLORS = ["#146b45", "#1d5fa8", "#c8102e", "#7a3f8f", "#0f7f7a", "#d9822b", "#0b3d2e", "#b8860b"];
  function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
  const title = (f) => String(f.name || "").replace(/\.[a-z0-9]{2,4}$/i, "").replace(/[_]+/g, " ");

  function cover(f, extra) {
    const k = kind(f), t = title(f), ctx = (extra && extra.context) || "";
    const emoji = (SUBJ.find((x) => x[0].test(t + " " + ctx)) || [0, k === "html" ? "📘" : "📄"])[1];
    const color = COLORS[hash(ctx + t) % COLORS.length];
    const read = readSet().has(f.id);
    const thumb = k === "pdf" && !/google-apps/.test(f.mime || "") ? `<img class="bk-thumb" src="https://drive.google.com/thumbnail?id=${encodeURIComponent(f.id)}&sz=w400" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : "";
    return `
      <button type="button" class="bk" data-id="${esc(f.id)}" style="--c:${color}" aria-label="Read ${esc(t)}">
        <span class="bk-cover">
          <span class="bk-gen"><span class="bk-emoji">${emoji}</span><span class="bk-gen-title">${esc(t)}</span></span>
          ${thumb}
          <span class="bk-spine"></span>
          <span class="bk-type">${LABEL[k]}</span>
          ${extra && extra.chip ? `<span class="bk-chip">${esc(extra.chip)}</span>` : ""}
          ${read ? `<span class="bk-read">✓ Read</span>` : ""}
          <span class="bk-open">📖 Read</span>
        </span>
        <span class="bk-title">${esc(t)}</span>
      </button>`;
  }

  /* ---------- reader ---------- */
  let pdfjsReady = null;
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfjsReady) return pdfjsReady;
    pdfjsReady = new Promise((res, rej) => {
      const s = document.createElement("script"); s.src = PDFJS + "pdf.min.js";
      s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js"; res(window.pdfjsLib); };
      s.onerror = () => { pdfjsReady = null; rej(new Error("reader")); };
      document.head.appendChild(s);
    });
    return pdfjsReady;
  }
  const b64bytes = (b64) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };

  let state = null;
  function close() {
    if (!state) return;
    removeEventListener("keydown", state.onKey); removeEventListener("resize", state.onResize);
    if (state.blobUrl) URL.revokeObjectURL(state.blobUrl);
    if (state.pdf) state.pdf.destroy();
    state.el.remove(); document.body.style.overflow = ""; state = null;
    if (location.hash.startsWith("#read=")) history.replaceState(null, "", location.pathname + location.search);
  }

  function open(f) {
    close();
    const k = kind(f), t = title(f);
    const el = document.createElement("div");
    el.className = "rd"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", t);
    el.innerHTML = `
      <div class="rd-bar">
        <span class="rd-title">📖 ${esc(t)}</span>
        <span class="rd-count" aria-live="polite"></span>
        <div class="rd-tools">
          <button type="button" class="rd-tool rd-zoom" title="Zoom in" aria-label="Zoom in" hidden>🔍<span> Zoom</span></button>
          <a class="rd-tool" href="${esc(f.download || f.view || "#")}" target="_blank" rel="noopener" title="Download">⤓<span> Download</span></a>
          <button type="button" class="rd-tool rd-close" title="Close" aria-label="Close">✕<span> Close</span></button>
        </div>
      </div>
      <div class="rd-stage"><div class="rd-loading"><div class="rd-spin"></div><p>Opening your book…</p></div></div>
      <div class="rd-nav" hidden>
        <button type="button" class="rd-btn prev" aria-label="Previous page">‹</button>
        <div class="rd-prog"><i></i></div>
        <button type="button" class="rd-btn next" aria-label="Next page">›</button>
      </div>`;
    document.body.appendChild(el); document.body.style.overflow = "hidden";
    state = { el, f, page: 0 };
    el.querySelector(".rd-close").onclick = close;
    state.onKey = (e) => { if (e.key === "Escape") close(); if (state && state.go) { if (e.key === "ArrowRight") state.go(1); if (e.key === "ArrowLeft") state.go(-1); } };
    addEventListener("keydown", state.onKey);
    state.onResize = () => { if (state && state.layout) state.layout(); };
    addEventListener("resize", state.onResize);
    try { history.replaceState(null, "", "#read=" + encodeURIComponent(f.id)); } catch (e) {}
    markRead(f.id);

    const stage = el.querySelector(".rd-stage");
    const drive = () => { stage.innerHTML = `<iframe class="rd-frame" src="https://drive.google.com/file/d/${encodeURIComponent(f.id)}/preview" title="${esc(t)}" allow="autoplay"></iframe>`; };
    if (k === "drive" || !api) return drive();

    fetch(api + (api.includes("?") ? "&" : "?") + "action=file&id=" + encodeURIComponent(f.id))
      .then((r) => r.json())
      .then((d) => {
        if (!state || state.f !== f) return;
        if (!d.ok) return drive();
        if (k === "html") {
          const html = new TextDecoder("utf-8").decode(b64bytes(d.data));
          state.blobUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
          stage.innerHTML = `<iframe class="rd-frame rd-html" src="${state.blobUrl}" title="${esc(t)}" allow="autoplay; fullscreen"></iframe>`;
          return;
        }
        if (k === "image") { stage.innerHTML = `<img class="rd-img" src="data:${esc(d.mime)};base64,${d.data}" alt="${esc(t)}">`; return; }
        return loadPdfJs().then((lib) => lib.getDocument({ data: b64bytes(d.data) }).promise).then((pdf) => flipbook(pdf));
      })
      .catch(() => { if (state && state.f === f) drive(); });
  }

  /* ---------- PDF flip book ---------- */
  function flipbook(pdf) {
    if (!state) return pdf.destroy();
    const { el } = state, stage = el.querySelector(".rd-stage"), nav = el.querySelector(".rd-nav");
    state.pdf = pdf;
    const N = pdf.numPages;
    let views = [], v = 0, rendering = 0;
    const spread = () => stage.clientWidth > 900 && stage.clientWidth / stage.clientHeight > 1.15;
    function build() {
      const keep = views.length ? views[v][0] : 1;
      views = [];
      if (spread()) { views.push([1]); for (let p = 2; p <= N; p += 2) views.push(p + 1 <= N ? [p, p + 1] : [p]); }
      else for (let p = 1; p <= N; p++) views.push([p]);
      v = Math.max(0, views.findIndex((x) => x.includes(keep)));
    }
    stage.innerHTML = `<div class="rd-book"><div class="rd-sheet"></div></div>`;
    const sheet = stage.querySelector(".rd-sheet");
    nav.hidden = false;

    async function pageCanvas(num, maxW, maxH) {
      const page = await pdf.getPage(num);
      const vp1 = page.getViewport({ scale: 1 });
      const scale = Math.min(maxW / vp1.width, maxH / vp1.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vp = page.getViewport({ scale: scale * dpr });
      const c = document.createElement("canvas");
      c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
      c.style.width = Math.floor(vp.width / dpr) + "px"; c.style.height = Math.floor(vp.height / dpr) + "px";
      c.className = "rd-page";
      await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
      return c;
    }
    let zoom = 1;
    const zbtn = el.querySelector(".rd-zoom"); zbtn.hidden = false;
    zbtn.onclick = () => { zoom = zoom === 1 ? 2.2 : 1; zbtn.classList.toggle("on", zoom > 1); stage.classList.toggle("zoomed", zoom > 1); zbtn.title = zoom > 1 ? "Fit page" : "Zoom in"; show(0); };
    async function show(dir) {
      const my = ++rendering, pages = views[v];
      const padW = stage.clientWidth - 24, padH = stage.clientHeight - 24;
      const w = (pages.length === 2 ? padW / 2 : padW) * zoom;
      const canvases = await Promise.all(pages.map((p) => pageCanvas(p, w, zoom > 1 ? Infinity : padH)));
      if (my !== rendering || !state) return;
      sheet.className = "rd-sheet" + (pages.length === 2 ? " two" : "") + (pages[0] === 1 && pages.length === 1 ? " is-cover" : "");
      sheet.replaceChildren(...canvases);
      if (dir) { sheet.classList.remove("flip-next", "flip-prev"); void sheet.offsetWidth; sheet.classList.add(dir > 0 ? "flip-next" : "flip-prev"); }
      el.querySelector(".rd-count").textContent = (pages.length === 2 ? `Pages ${pages[0]}–${pages[1]}` : `Page ${pages[0]}`) + ` of ${N}`;
      el.querySelector(".rd-prog i").style.width = (views.length > 1 ? (v / (views.length - 1)) * 100 : 100) + "%";
      el.querySelector(".prev").disabled = v === 0;
      el.querySelector(".next").disabled = v === views.length - 1;
      if (v === views.length - 1) celebrate();
    }
    function celebrate() {
      if (el.querySelector(".rd-done")) return;
      const n = readSet().size, L = level(n);
      const b = document.createElement("div"); b.className = "rd-done";
      b.innerHTML = `<b>🎉 You reached the end!</b><span>${L.icon} ${esc(L.name)} · ${n} book${n === 1 ? "" : "s"} opened</span>`;
      el.appendChild(b); setTimeout(() => b.classList.add("show"), 30); setTimeout(() => b.classList.remove("show"), 4200);
    }
    state.go = (d) => { const nv = v + d; if (nv < 0 || nv >= views.length) return; v = nv; stage.scrollTo(0, 0); show(d); };
    state.layout = () => { build(); show(0); };
    el.querySelector(".prev").onclick = () => state.go(-1);
    el.querySelector(".next").onclick = () => state.go(1);
    sheet.addEventListener("click", (e) => { if (zoom > 1) return; const r = sheet.getBoundingClientRect(); state.go(e.clientX - r.left > r.width / 2 ? 1 : -1); });
    let sx = 0, sy = 0;
    stage.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    stage.addEventListener("touchend", (e) => { if (zoom > 1) return; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) state.go(dx < 0 ? 1 : -1); });
    build(); show(0);
  }

  /* open a book if the page link has #read=ID */
  function fromHash(files) {
    const m = location.hash.match(/^#read=(.+)$/); if (!m) return;
    const f = files.find((x) => x.id === decodeURIComponent(m[1])); if (f) open(f);
  }

  return { api, esc, cover, open, close, readSet, level, kind, title, fromHash };
})();
