/* ECES Site Editor — edit settings and school data with forms, then
   download the updated files or save them straight to GitHub. */
(function () {
  const $ = s => document.querySelector(s);
  const esc = v => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const clone = o => JSON.parse(JSON.stringify(o || {}));

  /* ---------- Load current data (fresh copy, bypassing cache) ---------- */
  function loadScript(src) {
    return new Promise(res => { const s = document.createElement("script"); s.src = src + "?v=" + Date.now(); s.onload = res; s.onerror = res; document.head.appendChild(s); });
  }

  let C, D, dirty = false;
  const markDirty = () => { dirty = true; $("#status").textContent = "Unsaved changes"; $("#status").className = "ed-status warn"; };
  const markClean = msg => { dirty = false; $("#status").textContent = msg || "All changes saved"; $("#status").className = "ed-status ok"; };
  addEventListener("beforeunload", e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  /* ---------- Field helpers ---------- */
  function fields(obj, list) {
    return list.map(([key, label, type, hint]) => {
      const v = obj[key];
      if (type === "check") return `<label class="ed-check"><input type="checkbox" data-k="${key}" ${v ? "checked" : ""}><span>${label}</span></label>`;
      const input = type === "area" ? `<textarea data-k="${key}" rows="3">${esc(v)}</textarea>`
        : `<input type="${type || "text"}" data-k="${key}" value="${esc(v)}">`;
      return `<label class="ed-field"><span>${label}</span>${input}${hint ? `<small>${hint}</small>` : ""}</label>`;
    }).join("");
  }
  function bindFields(root, obj) {
    root.querySelectorAll("[data-k]").forEach(el => el.addEventListener("input", () => {
      const k = el.dataset.k;
      obj[k] = el.type === "checkbox" ? el.checked : el.type === "number" ? (el.value === "" ? 0 : Number(el.value)) : el.value;
      markDirty();
    }));
  }

  /* ---------- Generic row table editor ---------- */
  function rowTable(host, rows, cols, opts = {}) {
    const draw = () => {
      host.innerHTML = `
        <div class="ed-table-wrap"><table class="ed-table">
          <thead><tr>${cols.map(c => `<th style="${c.w ? "width:" + c.w : ""}">${c.label}</th>`).join("")}${opts.total ? "<th>Total</th>" : ""}<th style="width:46px"></th></tr></thead>
          <tbody>${rows.map((r, i) => `<tr>${cols.map(c => `<td>${
            c.type === "check" ? `<input type="checkbox" data-i="${i}" data-c="${c.key}" ${r[c.key] ? "checked" : ""}>`
            : c.type === "select" ? `<select data-i="${i}" data-c="${c.key}">${c.options.map(o => `<option ${o === r[c.key] ? "selected" : ""}>${o}</option>`).join("")}</select>`
            : c.type === "area" ? `<textarea rows="2" data-i="${i}" data-c="${c.key}">${esc(r[c.key])}</textarea>`
            : `<input type="${c.type || "text"}" ${c.type === "number" ? 'min="0" step="any"' : ""} data-i="${i}" data-c="${c.key}" value="${esc(r[c.key])}">`
          }</td>`).join("")}${opts.total ? `<td class="ed-tot" data-tot="${i}">${opts.total(r)}</td>` : ""}
          <td><button class="ed-del" data-del="${i}" title="Remove row" aria-label="Remove row">✕</button></td></tr>`).join("")}</tbody>
          ${opts.total ? `<tfoot><tr><td>Total</td>${cols.slice(1).map(c => `<td>${c.type === "number" ? rows.reduce((t, r) => t + (Number(r[c.key]) || 0), 0).toLocaleString() : ""}</td>`).join("")}<td>${rows.reduce((t, r) => t + opts.total(r), 0).toLocaleString()}</td><td></td></tr></tfoot>` : ""}
        </table></div>
        <button class="ed-add" type="button">+ Add row</button>`;
      host.querySelectorAll("[data-c]").forEach(el => el.addEventListener(el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input", () => {
        const r = rows[el.dataset.i], c = cols.find(x => x.key === el.dataset.c);
        r[c.key] = el.type === "checkbox" ? el.checked : c.type === "number" ? (el.value === "" ? 0 : Number(el.value)) : el.value;
        if (opts.total) { host.querySelector(`[data-tot="${el.dataset.i}"]`).textContent = opts.total(r); refreshFoot(); }
        markDirty();
      }));
      host.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => {
        if (!confirm("Remove this row?")) return;
        rows.splice(+b.dataset.del, 1); markDirty(); draw();
      }));
      host.querySelector(".ed-add").addEventListener("click", () => {
        const blank = {}; cols.forEach(c => blank[c.key] = c.type === "number" ? 0 : c.type === "check" ? false : c.type === "select" ? c.options[0] : c.def || "");
        opts.addTop ? rows.unshift(blank) : rows.push(blank); markDirty(); draw();
      });
    };
    const refreshFoot = () => { const f = host.querySelector("tfoot tr"); if (!f) return;
      const cells = f.querySelectorAll("td");
      cols.slice(1).forEach((c, j) => { if (c.type === "number") cells[j + 1].textContent = rows.reduce((t, r) => t + (Number(r[c.key]) || 0), 0).toLocaleString(); });
      cells[cols.length].textContent = rows.reduce((t, r) => t + opts.total(r), 0).toLocaleString(); };
    draw();
  }

  /* ---------- Build all panels ---------- */
  function build() {
    const p = $("#p-info");
    p.innerHTML = `<div class="ed-grid">${fields(C, [
      ["schoolName", "School name"], ["shortName", "Short name"], ["tagline", "Tagline / designation"],
      ["district", "District"], ["division", "Schools Division"], ["address", "Address"],
      ["principalName", "Principal's full name", "text", "Shown on the welcome screen and Principal's Message"],
      ["principalTitle", "Principal's position title"],
      ["phone", "Phone number"], ["email", "Email address", "email"],
      ["facebook", "Facebook page link", "url"], ["ssesSite", "SSES website link", "url"],
      ["officeHours", "Office hours"]
    ])}</div>${fields(C, [["showWelcome", "Show the welcome screen (Principal + logo) when the site opens", "check"]])}`;
    bindFields(p, C);

    C.announcements = C.announcements || [];
    rowTable($("#p-news"), C.announcements, [
      { key: "date", label: "Date", type: "date", w: "150px" },
      { key: "tag", label: "Label", type: "select", options: ["Event", "Advisory", "Parents", "Achievement", "Enrollment", "Memo", "Reminder"], w: "140px" },
      { key: "title", label: "Title", w: "26%" },
      { key: "text", label: "Details", type: "area" }
    ], { addTop: true });

    const g = $("#p-general");
    D.profile = D.profile || {};
    g.innerHTML = `${fields(D, [["isSample", "Show the yellow \"Sample data\" notice (untick once the real figures are entered)", "check"]])}
      <div class="ed-grid">${fields(D, [["schoolYear", "School year", "text", "e.g. 2025–2026"], ["asOf", "Data as of", "text", "e.g. October 2026"], ["source", "Source of data"]])}</div>
      <h4 class="ed-sub">School profile</h4><div class="ed-grid" id="p-prof">${fields(D.profile, [["sections", "Number of sections", "number"], ["classrooms", "Number of classrooms", "number"], ["nonTeaching", "Non-teaching staff", "number"]])}</div>`;
    bindFields(g, D); bindFields($("#p-prof"), D.profile);

    rowTable($("#p-enroll"), D.enrollment = D.enrollment || [], [
      { key: "grade", label: "Grade level" }, { key: "male", label: "Male", type: "number" }, { key: "female", label: "Female", type: "number" }
    ], { total: r => (Number(r.male) || 0) + (Number(r.female) || 0) });

    rowTable($("#p-trend"), D.enrollmentTrend = D.enrollmentTrend || [], [
      { key: "year", label: "School year", def: "20__–__" }, { key: "total", label: "Total enrollment", type: "number" }
    ]);

    rowTable($("#p-teach"), D.teachers = D.teachers || [], [
      { key: "position", label: "Position" }, { key: "count", label: "Number", type: "number" }
    ]);

    rowTable($("#p-perf"), D.performance = D.performance || [], [
      { key: "label", label: "Indicator" }, { key: "value", label: "Value (%)", type: "number", w: "130px" },
      { key: "lowerIsBetter", label: "Lower is better?", type: "check", w: "130px" }
    ]);

    D.reading = D.reading || { title: "Reading Profile", levels: [] };
    $("#p-read-title").innerHTML = fields(D.reading, [["title", "Graph title"]]);
    bindFields($("#p-read-title"), D.reading);
    rowTable($("#p-read"), D.reading.levels, [
      { key: "level", label: "Reading level" }, { key: "count", label: "Number of learners", type: "number" }
    ]);
  }

  /* ---------- Turn data back into files ---------- */
  const today = () => new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
  function cleanNews() {
    C.announcements = C.announcements.filter(a => a.title || a.text).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }
  const configText = () => `/* ECES INFOSITE — SITE SETTINGS
   Edited with the Site Editor (admin.html) on ${today()}.
   Tip: use the Site Editor instead of changing this file by hand. */
window.ECES = ${JSON.stringify(C, null, 2)};
`;
  const dataText = () => `/* ECES SCHOOL DATA — used by the School Data page and home page numbers.
   Edited with the Site Editor (admin.html) on ${today()}.
   Tip: use the Site Editor instead of changing this file by hand. */
window.ECES_DATA = ${JSON.stringify(D, null, 2)};
`;

  function download(name, text) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/javascript" }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  /* ---------- GitHub saving ---------- */
  const GH_KEY = "eces-editor-gh";
  let gh = { owner: "", repo: "", branch: "main" };
  try { gh = Object.assign(gh, JSON.parse(localStorage.getItem(GH_KEY) || "{}")); } catch (e) {}
  if (!gh.owner || !gh.repo) {
    const m = location.hostname.match(/^([^.]+)\.github\.io$/);
    if (m) { gh.owner = gh.owner || m[1]; gh.repo = gh.repo || location.pathname.split("/")[1] || ""; }
  }
  const b64 = str => { const bytes = new TextEncoder().encode(str); let bin = ""; bytes.forEach(b => bin += String.fromCharCode(b)); return btoa(bin); };

  async function ghPut(path, text, token) {
    const base = `https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${path}`;
    const head = { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" };
    let sha;
    const r = await fetch(base + "?ref=" + encodeURIComponent(gh.branch), { headers: head, cache: "no-store" });
    if (r.ok) sha = (await r.json()).sha; else if (r.status !== 404) throw new Error(await errMsg(r));
    const w = await fetch(base, { method: "PUT", headers: head,
      body: JSON.stringify({ message: `Update ${path.split("/").pop()} via Site Editor`, content: b64(text), branch: gh.branch, sha }) });
    if (!w.ok) throw new Error(await errMsg(w));
  }
  async function errMsg(r) {
    let m = ""; try { m = (await r.json()).message; } catch (e) {}
    if (r.status === 401) return "The GitHub token is not valid or has expired.";
    if (r.status === 403) return "The token does not have permission to change this repository. " + m;
    if (r.status === 404) return "Repository not found. Check the GitHub username and repository name.";
    return `GitHub error ${r.status}: ${m}`;
  }

  /* ---------- Wire up UI ---------- */
  function wire() {
    document.querySelectorAll(".ed-tab").forEach(t => t.addEventListener("click", () => {
      document.querySelectorAll(".ed-tab").forEach(x => x.classList.toggle("on", x === t));
      document.querySelectorAll(".ed-panel").forEach(x => x.hidden = x.id !== t.dataset.tab);
      if (innerWidth < 900) $("#" + t.dataset.tab).scrollIntoView({ behavior: "smooth", block: "start" });
    }));

    $("#btn-download").addEventListener("click", () => {
      cleanNews();
      download("config.js", configText());
      setTimeout(() => download("school-data.js", dataText()), 400);
      markClean("Files downloaded — upload them to assets/js on GitHub");
      $("#dl-help").hidden = false;
    });

    $("#gh-owner").value = gh.owner; $("#gh-repo").value = gh.repo; $("#gh-branch").value = gh.branch;
    $("#btn-gh").addEventListener("click", async () => {
      gh.owner = $("#gh-owner").value.trim(); gh.repo = $("#gh-repo").value.trim(); gh.branch = $("#gh-branch").value.trim() || "main";
      const token = $("#gh-token").value.trim();
      const out = $("#gh-msg");
      if (!gh.owner || !gh.repo || !token) { out.className = "ed-msg err"; out.textContent = "Please fill in the GitHub username, repository and token."; return; }
      try { localStorage.setItem(GH_KEY, JSON.stringify(gh)); } catch (e) {}
      const btn = $("#btn-gh"); btn.disabled = true; out.className = "ed-msg"; out.textContent = "Saving to GitHub…";
      try {
        cleanNews();
        await ghPut("assets/js/config.js", configText(), token);
        await ghPut("assets/js/school-data.js", dataText(), token);
        out.className = "ed-msg ok"; out.textContent = "✓ Saved! The live website will show the changes in about 1–2 minutes.";
        markClean();
      } catch (e) {
        out.className = "ed-msg err"; out.textContent = "✗ " + e.message;
      } finally { btn.disabled = false; }
    });
  }

  Promise.all([loadScript("assets/js/config.js"), loadScript("assets/js/school-data.js")]).then(() => {
    C = clone(window.ECES); D = clone(window.ECES_DATA);
    if (C.ssesSite == null) C.ssesSite = "";
    if (!window.ECES || !window.ECES_DATA) { $("#status").textContent = "Could not load the site files."; $("#status").className = "ed-status warn"; }
    build(); wire(); if (window.ECES && window.ECES_DATA) markClean("Ready — make your changes");
  });
})();
