/* Home page: "New in the E-Library" shelf — the newest learning packets across all grades */
(function () {
  "use strict";
  const L = window.ECESLib, sec = document.getElementById("home-shelf"), box = document.getElementById("home-books");
  if (!L || !L.api || !sec) return;
  fetch(L.api + (L.api.includes("?") ? "&" : "?") + "action=packets")
    .then((r) => r.json())
    .then((d) => {
      if (!d.ok) return;
      const all = [];
      (d.grades || []).forEach((g) => (function walk(node, path) {
        (node.files || []).forEach((f) => all.push({ f, grade: g.name, ctx: g.name + " " + path.join(" ") }));
        (node.folders || []).forEach((x) => walk(x, path.concat(x.name)));
      })(g, []));
      if (!all.length) return;
      all.sort((a, b) => String(b.f.updated).localeCompare(String(a.f.updated)));
      const pick = all.slice(0, 6);
      box.innerHTML = pick.map((x) => L.cover(x.f, { context: x.ctx, chip: x.grade })).join("");
      box.querySelectorAll(".bk").forEach((b) => b.addEventListener("click", () => {
        const x = pick.find((p) => p.f.id === b.dataset.id); if (x) L.open(x.f);
      }));
      sec.hidden = false;
    })
    .catch(() => {});
})();
