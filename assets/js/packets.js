/* ECES E-Library page — learning packets on bookshelves, by grade (files come from Google Drive) */
(function () {
  "use strict";
  const C = window.ECES || {}, L = window.ECESLib;
  const $ = (s) => document.querySelector(s);
  const esc = L.esc, api = L.api;
  const box = $("#pk-body"), tabs = $("#pk-grades"), search = $("#pk-search");
  let data = null, grade = null, allFiles = [];

  const KEY = "eces-packets-grade";
  const remember = (g) => { try { localStorage.setItem(KEY, g); } catch (e) {} };
  const recall = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };

  /* reading badge */
  function drawBadge() {
    const n = L.readSet().size, lv = L.level(n), b = $("#lib-badge");
    if (!b) return;
    const pct = lv.next ? Math.round(((n - prevMin(n)) / (lv.next[0] - prevMin(n))) * 100) : 100;
    b.innerHTML = `
      <div class="lib-badge-ico">${lv.icon}</div>
      <div class="lib-badge-txt">
        <b>${n ? esc(lv.name) : "Start your reading adventure!"}</b>
        <span>${n ? `You have opened <strong>${n}</strong> book${n === 1 ? "" : "s"} on this device.` : "Tap any book to start reading."}
        ${lv.next ? ` Read <strong>${lv.next[0] - n}</strong> more to become a <strong>${esc(lv.next[2])}</strong> ${lv.next[1]}` : " You are a reading champion! 🌟"}</span>
        <div class="lib-badge-bar"><i style="width:${Math.max(4, Math.min(100, pct))}%"></i></div>
      </div>`;
  }
  function prevMin(n) { let m = 0; [0, 1, 3, 6, 10, 20].forEach((x) => { if (n >= x) m = x; }); return m; }
  document.addEventListener("eces-read", () => { drawBadge(); });

  function message(icon, title, text, retry) {
    box.innerHTML = `<div class="pk-empty"><div class="pk-empty-ico">${icon}</div><h3>${title}</h3><p>${text}</p>${retry ? '<button class="btn green" id="pk-retry" type="button">Try again</button>' : ""}</div>`;
    if (retry) $("#pk-retry").addEventListener("click", () => load(true));
  }

  function load(refresh) {
    drawBadge();
    if (!api) { tabs.innerHTML = ""; message("📚", "Our e-library is coming soon", "Our teachers are preparing the learning packets. Please check again later."); return; }
    box.innerHTML = `<div class="lib-skel">${'<div class="lib-skel-book"></div>'.repeat(6)}</div>`;
    fetch(api + (api.includes("?") ? "&" : "?") + "action=packets" + (refresh ? "&refresh=1" : ""))
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error || "error");
        data = d;
        allFiles = [];
        (d.grades || []).forEach((g) => groups(g, [], []).forEach((x) => x.files.forEach((f) => allFiles.push(f))));
        const names = (d.grades || []).map((g) => g.name);
        const urlG = new URLSearchParams(location.search).get("grade");
        const saved = recall();
        grade = names.includes(urlG) ? urlG : names.includes(grade) ? grade : names.includes(saved) ? saved : (names.find((n) => countFiles(d.grades.find((g) => g.name === n))) || names[0]);
        drawTabs(); draw();
        $("#pk-updated").textContent = d.updated ? "Updated " + d.updated : "";
        L.fromHash(allFiles);
      })
      .catch(() => message("⚠️", "Can't open the library right now", "Please check your internet connection and try again.", true));
  }

  function drawTabs() {
    tabs.innerHTML = (data.grades || []).map((g) => {
      const n = countFiles(g);
      return `<button type="button" class="pk-tab ${g.name === grade ? "on" : ""}" data-g="${esc(g.name)}">${esc(g.name)}<span>${n}</span></button>`;
    }).join("");
    tabs.querySelectorAll(".pk-tab").forEach((b) => b.addEventListener("click", () => {
      grade = b.dataset.g; remember(grade); search.value = ""; drawTabs(); draw();
    }));
  }
  const countFiles = (n) => !n ? 0 : (n.files || []).length + (n.folders || []).reduce((t, f) => t + countFiles(f), 0);
  function groups(node, path, out) {
    if ((node.files || []).length) out.push({ path, files: node.files });
    (node.folders || []).forEach((f) => groups(f, path.concat(f.name), out));
    return out;
  }

  function draw() {
    const g = (data.grades || []).find((x) => x.name === grade);
    if (!g) { message("📚", "No grade shelves yet", "Books will appear here once teachers upload them."); return; }
    const q = search.value.trim().toLowerCase();
    let list = groups(g, [], []);
    if (q) list = list.map((x) => ({ path: x.path, files: x.files.filter((f) => (f.name + " " + x.path.join(" ")).toLowerCase().includes(q)) })).filter((x) => x.files.length);
    if (!list.length) {
      message(q ? "🔍" : "📚", q ? "No books match your search" : `No books for ${esc(grade)} yet`, q ? "Try a different word, like the subject or week." : "Please check again soon. Your teacher will put learning packets here.");
      return;
    }
    box.innerHTML = list.map((x) => `
      <section class="shelf-group">
        <h3><span>📚</span>${x.path.length ? x.path.map(esc).join(' <i>›</i> ') : esc(grade) + " Books"}<em>${x.files.length} book${x.files.length > 1 ? "s" : ""}</em></h3>
        <div class="shelf"><div class="shelf-books">${x.files.map((f) => L.cover(f, { context: grade + " " + x.path.join(" ") })).join("")}</div></div>
      </section>`).join("");
    box.querySelectorAll(".bk").forEach((b) => b.addEventListener("click", () => {
      const f = allFiles.find((x) => x.id === b.dataset.id); if (f) L.open(f);
    }));
  }
  document.addEventListener("eces-read", () => { if (data) setTimeout(draw, 300); });

  search.addEventListener("input", () => data && draw());
  $("#pk-refresh").addEventListener("click", () => load(true));
  load(false);
})();
