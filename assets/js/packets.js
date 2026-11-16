/* Learning Packets page — lists the files in the Google Drive "ECES Learning Packets" folder */
(function () {
  const C = window.ECES || {}, LC = window.ECES_LC;
  const $ = s => document.querySelector(s);
  const esc = v => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const api = (C.driveApi || "").trim();
  const box = $("#pk-body"), tabs = $("#pk-grades"), search = $("#pk-search");
  let data = null, grade = null;

  const KEY = "eces-packets-grade";
  const remember = g => { try { localStorage.setItem(KEY, g); } catch (e) {} };
  const recall = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };

  const size = b => !b ? "" : b < 1024 * 1024 ? Math.max(1, Math.round(b / 1024)) + " KB" : (b / 1048576).toFixed(1) + " MB";
  const kind = (m, n) => {
    if (/pdf/.test(m) || /\.pdf$/i.test(n)) return ["PDF", "k-pdf"];
    if (/presentation|powerpoint/.test(m) || /\.pptx?$/i.test(n)) return ["PPT", "k-ppt"];
    if (/document|word/.test(m) || /\.docx?$/i.test(n)) return ["DOC", "k-doc"];
    if (/sheet|excel/.test(m) || /\.xlsx?$/i.test(n)) return ["XLS", "k-xls"];
    if (/^image\//.test(m)) return ["IMG", "k-img"];
    if (/^video\//.test(m)) return ["VID", "k-vid"];
    if (/^audio\//.test(m)) return ["AUD", "k-vid"];
    return ["FILE", "k-file"];
  };

  function message(icon, title, text, retry) {
    box.innerHTML = `<div class="pk-empty"><div class="pk-empty-ico">${icon}</div><h3>${title}</h3><p>${text}</p>${retry ? '<button class="btn green" id="pk-retry" type="button">Try again</button>' : ""}</div>`;
    if (retry) $("#pk-retry").addEventListener("click", () => load(true));
  }

  function load(refresh) {
    if (!api) { tabs.innerHTML = ""; message("📂", "Learning packets are coming soon", "Our teachers are preparing the learning packets. Please check again later."); return; }
    box.innerHTML = `<div class="pk-loading">${'<div class="pk-skel"></div>'.repeat(4)}</div>`;
    fetch(api + (api.includes("?") ? "&" : "?") + "action=packets" + (refresh ? "&refresh=1" : ""))
      .then(r => r.json())
      .then(d => {
        if (!d.ok) throw new Error(d.error || "error");
        data = d;
        const names = (d.grades || []).map(g => g.name);
        const saved = recall();
        grade = names.includes(grade) ? grade : names.includes(saved) ? saved : names[0];
        drawTabs(); draw();
        $("#pk-updated").textContent = d.updated ? "Updated " + d.updated : "";
      })
      .catch(() => message("⚠️", "Can't load the packets right now", "Please check your internet connection and try again.", true));
  }

  function drawTabs() {
    tabs.innerHTML = (data.grades || []).map(g => {
      const n = countFiles(g);
      return `<button type="button" class="pk-tab ${g.name === grade ? "on" : ""}" data-g="${esc(g.name)}">${esc(g.name)}<span>${n}</span></button>`;
    }).join("");
    tabs.querySelectorAll(".pk-tab").forEach(b => b.addEventListener("click", () => {
      grade = b.dataset.g; remember(grade); search.value = ""; drawTabs(); draw();
    }));
  }

  const countFiles = n => (n.files || []).length + (n.folders || []).reduce((t, f) => t + countFiles(f), 0);

  /* flatten a grade into groups: [{path, files}] */
  function groups(node, path, out) {
    if ((node.files || []).length) out.push({ path, files: node.files });
    (node.folders || []).forEach(f => groups(f, path.concat(f.name), out));
    return out;
  }

  function fileRow(f) {
    const [label, cls] = kind(f.mime, f.name);
    return `<li class="pk-file">
      <span class="pk-kind ${cls}">${label}</span>
      <div class="pk-meta"><b>${esc(f.name.replace(/\.[a-z0-9]{2,4}$/i, ""))}</b><small>${[size(f.size), f.updated].filter(Boolean).join(" · ")}</small></div>
      <div class="pk-btns">
        <a class="pk-btn view" href="${esc(f.view)}" target="_blank" rel="noopener">View</a>
        <a class="pk-btn dl" href="${esc(f.download)}" target="_blank" rel="noopener">Download</a>
      </div></li>`;
  }

  function draw() {
    const g = (data.grades || []).find(x => x.name === grade);
    if (!g) { message("📂", "No grade folders yet", "Learning packets will appear here once teachers upload them."); return; }
    const q = search.value.trim().toLowerCase();
    let list = groups(g, [], []);
    if (q) list = list.map(x => ({ path: x.path, files: x.files.filter(f => (f.name + " " + x.path.join(" ")).toLowerCase().includes(q)) })).filter(x => x.files.length);
    if (!list.length) {
      message(q ? "🔍" : "📂", q ? "No packets match your search" : `No packets for ${esc(grade)} yet`, q ? "Try a different word, such as the subject or week." : "Please check again soon. Your teacher will upload the learning packets here.");
      return;
    }
    box.innerHTML = list.map(x => `
      <section class="pk-group">
        <h3><span class="pk-folder">📁</span>${x.path.length ? x.path.map(esc).join(' <i>›</i> ') : "General"}<em>${x.files.length} file${x.files.length > 1 ? "s" : ""}</em></h3>
        <ul>${x.files.map(fileRow).join("")}</ul>
      </section>`).join("");
  }

  search.addEventListener("input", () => data && draw());
  $("#pk-refresh").addEventListener("click", () => load(true));
  load(false);
})();
