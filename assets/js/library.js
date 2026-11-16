/* E-Library (ECES & SSES) — book covers, reading badges and the page-flip e-book reader.
   PDFs open as flip books (PDF.js), E-Book Maker HTML files open as they are,
   Word/PowerPoint open in Google Drive's viewer. */
window.ECESLib = (function () {
  "use strict";
  const C = window.ECES || {};
  const api = String(C.driveApi || (typeof LEARN !== "undefined" && LEARN.api) || "").trim();
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

  function open(f, opts) {
    opts = opts || {};
    close();
    const k = kind(f), t = title(f);
    const el = document.createElement("div");
    el.className = "rd"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", t);
    el.innerHTML = `
      <div class="rd-bar">
        <span class="rd-title">📖 ${esc(t)}</span>
        <span class="rd-count" aria-live="polite"></span>
        <div class="rd-tools">
          ${opts.submitUrl ? `<a class="rd-tool rd-submit" href="${esc(opts.submitUrl)}">📷<span> Submit my answer</span></a>` : ""}
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
    state = { el, f, page: 0, opts };
    el.querySelector(".rd-close").onclick = close;
    state.onKey = (e) => { if (e.key === "Escape") { const z = el.querySelector(".rd-zoomview"); return z ? z.remove() : close(); } if (state && state.go) { if (e.key === "ArrowRight") state.go(1); if (e.key === "ArrowLeft") state.go(-1); } };
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

  /* ---------- PDF flip book (same page-turn as the E-Book Maker reader) ---------- */
  function flipbook(pdf) {
    if (!state) return pdf.destroy();
    const { el, f, opts } = state, stage = el.querySelector(".rd-stage"), nav = el.querySelector(".rd-nav");
    state.pdf = pdf;
    const P = pdf.numPages;          // PDF page 1 is the cover
    const M = P - 1;                 // inner pages; position M = "The End"
    let cur = -1, spread = false, flipping = false, ratio = 0.707, pageW = 0, shown = null;
    const cache = new Map();
    let reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

    stage.classList.add("rd-wood");
    stage.innerHTML = `<div class="rk"><article class="rp R"></article><article class="rp R"></article>
      <button type="button" class="rk-corner left" aria-label="Previous page" title="Turn back"></button>
      <button type="button" class="rk-corner" aria-label="Next page" title="Turn page"></button></div>`;
    const book = stage.querySelector(".rk"), pL = book.children[0], pR = book.children[1];
    const cornerL = book.querySelector(".rk-corner.left"), cornerR = book.querySelector(".rk-corner:not(.left)");
    nav.hidden = false;
    nav.innerHTML = `<button type="button" class="rd-nb prev">◀ Back</button>
      <div class="rd-mid"><span class="rd-pnum"></span><div class="rd-prog"><i></i></div></div>
      <button type="button" class="rd-nb next">Next ▶</button>`;
    el.querySelector(".rd-count").textContent = "";

    /* ---- pages as pictures ---- */
    async function canvasFor(n) {
      const key = n + "@" + Math.round(pageW);
      if (cache.has(key)) return cache.get(key);
      const page = await pdf.getPage(n);
      const vp1 = page.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vp = page.getViewport({ scale: (pageW / vp1.width) * dpr });
      const c = document.createElement("canvas");
      c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
      await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
      cache.set(key, c);
      return c;
    }
    const copy = (c) => { const k = document.createElement("canvas"); k.width = c.width; k.height = c.height; k.getContext("2d").drawImage(c, 0, 0); k.className = "rp-cv"; return k; };
    const pdfNo = (i) => (i === -1 ? 1 : i >= 0 && i < M ? i + 2 : 0);
    function endNode() {
      const n = readSet().size, L = level(n), d = document.createElement("div");
      d.className = "rp-endbox";
      d.innerHTML = `<div class="rp-endemoji">🎉</div><h2>The End</h2><p>Great job finishing <b>${esc(title(f))}</b>!</p>
        <p class="rp-lv">${L.icon} ${esc(L.name)} · ${n} book${n === 1 ? "" : "s"} opened</p>
        <div class="rp-btns">${opts.submitUrl ? `<a class="rp-big" href="${esc(opts.submitUrl)}">📷 Submit my answer</a>` : ""}
        <button type="button" class="rp-big ghost" data-act="again">↺ Read Again</button></div>`;
      return d;
    }
    async function slot(i) {
      if (i === M) return { c: "rp isend", node: endNode() };
      const n = pdfNo(i);
      if (!n) return { c: "rp none", node: null };
      return { c: "rp" + (i === -1 ? " iscover" : ""), node: copy(await canvasFor(n)) };
    }
    const NONE = () => ({ c: "rp none", node: null });
    async function view() {
      if (!spread) return { L: NONE(), R: await slot(cur) };
      if (cur === -1) return { L: NONE(), R: await slot(-1) };
      const both = await Promise.all([slot(cur), slot(cur + 1)]);
      return { L: both[0], R: both[1] };
    }
    function put(elx, s, side) { elx.className = s.c + (spread ? " " + side : ""); elx.replaceChildren(...(s.node ? [s.node] : [])); }

    /* ---- the turning page ---- */
    function makeLeaf(front, back, side) {
      const leaf = document.createElement("div"); leaf.className = "rl " + side;
      const face = document.createElement("div"); face.className = front.c; if (front.node) face.appendChild(front.node);
      const shade = document.createElement("div"); shade.className = "rl-shade " + side;
      const bk = document.createElement("div");
      if (back) { bk.className = back.c + " rl-bkface"; if (back.node) bk.appendChild(back.node); } else bk.className = "rl-back";
      leaf.append(face, shade, bk); leaf._shade = shade;
      return leaf;
    }
    function animateLeaf(leaf, from, to, castFrom, castTo, side, shadeIn) {
      return new Promise((done) => {
        const D = 750, ease = "cubic-bezier(.45,.05,.35,1)";
        const cast = document.createElement("div"); cast.className = "rk-cast " + side;
        book.appendChild(cast); book.appendChild(leaf);
        leaf.style.transform = "rotateY(" + from + "deg)";
        const a = leaf.animate([{ transform: "rotateY(" + from + "deg)" }, { transform: "rotateY(" + to + "deg)" }], { duration: D, easing: ease, fill: "forwards" });
        cast.animate([{ opacity: castFrom }, { opacity: castTo }], { duration: D, easing: "ease-in-out", fill: "forwards" });
        if (shadeIn) leaf._shade.animate([{ opacity: 0 }, { opacity: 1 }], { duration: D / 2, easing: "ease-in", fill: "forwards" });
        else leaf._shade.animate([{ opacity: 1 }, { opacity: 0 }], { duration: D / 2, delay: D / 2, easing: "ease-out", fill: "forwards" });
        let fin = false;
        const end = () => { if (fin) return; fin = true; leaf.remove(); cast.remove(); done(); };
        a.onfinish = end; setTimeout(end, D + 300);
      });
    }

    async function render(dir, animate) {
      const old = shown, v = await view();
      if (!state || state.pdf !== pdf) return;
      const can = animate && !reduce && pR.animate && old;
      if (!can) { put(pL, v.L, "L"); put(pR, v.R, "R"); }
      else if (!spread) {
        if (dir > 0) { const lf = makeLeaf(old.R, null, "S"); put(pR, v.R, "R"); await animateLeaf(lf, 0, -180, 1, 0, "S", true); }
        else { const lb = makeLeaf(v.R, null, "S"); await animateLeaf(lb, -180, 0, 0, 1, "S", false); put(pR, v.R, "R"); }
      } else if (dir > 0) {
        const fr = makeLeaf({ c: old.R.c + " R", node: old.R.node }, { c: v.L.c + " L", node: v.L.node }, "R");
        put(pR, v.R, "R");
        await animateLeaf(fr, 0, -180, 1, 0, "R", true); put(pL, v.L, "L");
      } else {
        const fl = makeLeaf({ c: old.L.c + " L", node: old.L.node }, { c: v.R.c + " R", node: v.R.node }, "Lf");
        put(pL, v.L, "L");
        await animateLeaf(fl, 0, 180, 1, 0, "Lf", true); put(pR, v.R, "R");
      }
      shown = v;
      book.classList.toggle("closedR", spread && cur === -1);
      book.classList.toggle("closedL", spread && cur >= M);
      const canNext = spread ? (cur === -1 ? true : cur + 2 <= M) : cur < M;
      cornerR.classList.toggle("off", !canNext);
      cornerL.classList.toggle("off", !(spread && cur >= 0));
      const label = cur === -1 ? "Cover" : cur >= M ? "The End"
        : spread && cur + 1 < M ? `Pages ${cur + 2}–${cur + 3} of ${P}` : `Page ${cur + 2} of ${P}`;
      nav.querySelector(".rd-pnum").textContent = label;
      nav.querySelector(".prev").disabled = cur === -1;
      nav.querySelector(".next").disabled = !canNext;
      const seen = cur === -1 ? 1 : Math.min(P, cur + 1 + (spread ? 2 : 1));
      nav.querySelector(".rd-prog i").style.width = (cur >= M ? 100 : (seen / P) * 100) + "%";
      prefetch();
    }
    function prefetch() {
      const want = [];
      for (let i = cur - 2; i <= cur + 4; i++) { const n = pdfNo(i); if (n) want.push(n); }
      want.reduce((p, n) => p.then(() => canvasFor(n)).catch(() => {}), Promise.resolve());
    }
    function norm(n) { n = Math.max(-1, Math.min(M, n)); if (spread && n >= 0 && n % 2 === 1) n--; return n; }
    async function go(n) {
      if (flipping) return;
      n = norm(n); if (n === cur) return;
      const d = n < cur ? -1 : 1; cur = n; flipping = true;
      try { await render(d, true); } finally { flipping = false; }
    }
    function step(d) {
      if (!spread) return go(cur + d);
      if (d > 0) go(cur === -1 ? 0 : cur + 2); else go(cur <= 0 ? -1 : cur - 2);
    }
    function sizeBook() {
      const cs = getComputedStyle(stage), pad = (k) => parseFloat(cs[k]) || 0;
      const aw = stage.clientWidth - pad("paddingLeft") - pad("paddingRight");
      const ah = stage.clientHeight - pad("paddingTop") - pad("paddingBottom");
      if (aw <= 0 || ah <= 0) return;
      const per = spread ? 2 : 1;
      let h = Math.min(ah, aw / (ratio * per));
      pageW = Math.floor(h * ratio);
      book.style.width = pageW * per + "px"; book.style.height = Math.floor(h) + "px";
    }
    const wantSpread = () => { const w = innerWidth, h = innerHeight; return w >= 900 && h >= 500 && w > h * 1.15; };
    async function applyMode(force) {
      const s = wantSpread();
      if (s === spread && !force) { sizeBook(); shown = null; await render(0, false); return; }
      spread = s; el.classList.toggle("spread", spread);
      sizeBook(); cur = norm(cur); shown = null; await render(0, false);
    }

    /* ---- controls ---- */
    nav.querySelector(".prev").onclick = () => step(-1);
    nav.querySelector(".next").onclick = () => step(1);
    cornerR.onclick = (e) => { e.stopPropagation(); step(1); };
    cornerL.onclick = (e) => { e.stopPropagation(); step(-1); };
    book.addEventListener("click", (e) => {
      if (e.target.closest("[data-act=again]")) return go(-1);
      if (e.target.closest("a,button")) return;
      const r = book.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
      if (x > (spread ? 0.5 : 0.35)) step(1); else step(-1);
    });
    let sx = 0, sy = 0;
    stage.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    stage.addEventListener("touchend", (e) => { const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1); });
    state.go = (d) => step(d);
    let rs = null;
    state.layout = () => { clearTimeout(rs); rs = setTimeout(() => { if (!flipping && state) applyMode(false); }, 200); };

    /* ---- zoom: show the open page(s) big, to scroll around ---- */
    const zbtn = el.querySelector(".rd-zoom"); zbtn.hidden = false;
    zbtn.onclick = async () => {
      const nums = (spread && cur >= 0 ? [cur, cur + 1] : [cur]).map(pdfNo).filter(Boolean);
      if (!nums.length) return;
      const z = document.createElement("div"); z.className = "rd-zoomview";
      z.innerHTML = `<button type="button" class="rd-zx" aria-label="Close zoom">✕</button><div class="rd-zpages"><div class="rd-spin"></div></div><div class="rd-zhint">Drag to move • ✕ to close</div>`;
      el.appendChild(z);
      z.querySelector(".rd-zx").onclick = () => z.remove();
      const box = z.querySelector(".rd-zpages"), w = Math.min(1800, Math.max(innerWidth * 1.8, 900));
      const cs = [];
      for (const n of nums) {
        const page = await pdf.getPage(n), v1 = page.getViewport({ scale: 1 });
        const vp = page.getViewport({ scale: w / v1.width });
        const c = document.createElement("canvas"); c.width = vp.width; c.height = vp.height; c.style.width = Math.round(w / 1.4) + "px";
        await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise; cs.push(c);
      }
      box.replaceChildren(...cs);
    };

    pdf.getPage(1).then((pg) => { const v1 = pg.getViewport({ scale: 1 }); ratio = v1.width / v1.height; return applyMode(true); });
  }

  /* open a book if the page link has #read=ID */
  function fromHash(files) {
    const m = location.hash.match(/^#read=(.+)$/); if (!m) return;
    const f = files.find((x) => x.id === decodeURIComponent(m[1])); if (f) open(f);
  }

  return { api, esc, cover, open, close, readSet, level, kind, title, fromHash };
})();
