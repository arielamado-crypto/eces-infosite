/* ECES Infosite — shared header, footer, welcome screen and effects */
(function () {
  const C = window.ECES || {};
  const page = document.body.dataset.page || "home";

  const PAGES = [
    ["home", "index.html", "Home"],
    ["about", "about.html", "About"],
    ["academics", "academics.html", "Academics"],
    ["data", "data.html", "School Data"],
    ["news", "news.html", "News"],
    ["enrollment", "enrollment.html", "Enrollment"],
    ["contact", "contact.html", "Contact"]
  ];

  const I = {
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>'
  };
  window.ECES_ICONS = I;

  /* ---------- Header ---------- */
  const header = document.getElementById("site-header");
  if (header) {
    header.innerHTML = `
      <div class="topbar"><div class="wrap">
        <span>${I.pin.replace('<svg','<svg width="14" height="14"')} ${C.address}</span>
        <span class="hide-sm">${I.mail.replace('<svg','<svg width="14" height="14"')} <a href="mailto:${C.email}">${C.email}</a> &nbsp;·&nbsp; ${C.division}</span>
      </div></div>
      <nav class="nav" id="nav"><div class="wrap">
        <a class="brand" href="index.html">
          <img src="assets/img/eces-logo.png" alt="ECES logo">
          <span><b>${C.schoolName}</b><small>${C.tagline} · ${C.district}</small></span>
        </a>
        <ul class="menu">${PAGES.map(p => `<li><a href="${p[1]}" class="${p[0] === page ? "active" : ""}">${p[2]}</a></li>`).join("")}${C.ssesSite ? `<li><a class="ext" href="${C.ssesSite}" target="_blank" rel="noopener">SSES Site ↗</a></li>` : ""}</ul>
        <button class="burger" aria-label="Open menu"><span></span></button>
      </div></nav>`;
    const nav = document.getElementById("nav");
    nav.querySelector(".burger").addEventListener("click", () => nav.classList.toggle("open"));
    addEventListener("scroll", () => nav.classList.toggle("scrolled", scrollY > 10), { passive: true });
  }

  /* ---------- Footer ---------- */
  const footer = document.getElementById("site-footer");
  if (footer) {
    footer.innerHTML = `
      <footer><div class="wrap">
        <div>
          <div class="f-brand"><img src="assets/img/eces-logo.png" alt=""><b>${C.schoolName}</b></div>
          <p>${C.tagline} — nurturing curious, capable and caring young Filipinos in ${C.address.split(",").slice(0, 2).join(",")}.</p>
        </div>
        <div><h4>Explore</h4><ul>${PAGES.map(p => `<li><a href="${p[1]}">${p[2]}</a></li>`).join("")}</ul></div>
        <div><h4>Reach Us</h4><ul>
          <li>${C.address}</li><li><a href="tel:${C.phone.replace(/[^0-9+]/g, "")}">${C.phone}</a></li>
          <li><a href="mailto:${C.email}">${C.email}</a></li>
          <li><a href="${C.facebook}" target="_blank" rel="noopener">Facebook Page</a></li>
          ${C.ssesSite ? `<li><a href="${C.ssesSite}" target="_blank" rel="noopener">SSES Website ↗</a></li>` : ""}
          <li><a href="https://www.deped.gov.ph" target="_blank" rel="noopener">DepEd Philippines</a></li>
        </ul></div>
      </div>
      <div class="copy">© ${new Date().getFullYear()} ${C.schoolName} · ${C.division} · Department of Education · <a class="foot-admin" href="admin.html">Site Editor</a></div></footer>
      <button class="to-top" aria-label="Back to top">${I.up}</button>`;
    const tt = footer.querySelector(".to-top");
    tt.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
    addEventListener("scroll", () => tt.classList.toggle("show", scrollY > 600), { passive: true });
  }

  /* ---------- Fill [data-cfg] text from settings ---------- */
  document.querySelectorAll("[data-cfg]").forEach(el => {
    const v = C[el.dataset.cfg];
    if (v != null) el.textContent = v;
  });
  document.querySelectorAll("[data-cfg-href]").forEach(el => {
    const [key, prefix] = el.dataset.cfgHref.split("|");
    const v = C[key];
    if (v) el.href = (prefix || "") + (prefix === "tel:" ? v.replace(/[^0-9+]/g, "") : v);
  });

  /* ---------- SSES links ---------- */
  document.querySelectorAll("[data-sses]").forEach(el => {
    if (C.ssesSite) el.querySelectorAll("a").forEach(a => a.href = C.ssesSite); else el.remove();
  });

  /* ---------- Announcements ---------- */
  const fmt = d => { const x = new Date(d + "T00:00:00"); return { day: x.getDate(), mon: x.toLocaleString("en", { month: "short" }), yr: x.getFullYear() }; };
  document.querySelectorAll("[data-news]").forEach(box => {
    const limit = parseInt(box.dataset.news, 10) || 99;
    const items = (C.announcements || []).slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
    box.innerHTML = items.map(n => { const f = fmt(n.date); return `
      <article class="news reveal">
        <div class="date"><b>${f.day}</b><small>${f.mon} ${f.yr}</small></div>
        <div><span class="pill">${n.tag}</span><h3>${n.title}</h3><p>${n.text}</p></div>
      </article>`; }).join("") || "<p>No announcements yet.</p>";
  });

  /* ---------- Stats ---------- */
  document.querySelectorAll("[data-stats]").forEach(box => {
    let s = C.stats || [];
    const D = window.ECES_DATA;
    if (D && D.enrollment) {
      const sum = (a, f) => a.reduce((t, x) => t + f(x), 0);
      s = [
        { value: sum(D.enrollment, x => x.male + x.female), label: "Learners Enrolled" },
        { value: sum(D.teachers || [], x => x.count), label: "Teaching Personnel" },
        { value: (D.profile && D.profile.sections) || 0, label: "Class Sections" },
        { value: D.enrollment.length, label: "Grade Levels (K–6)" }
      ].filter(x => x.value);
    }
    if (!s.length) { box.closest("section").remove(); return; }
    box.style.gridTemplateColumns = innerWidth > 980 ? `repeat(${s.length},1fr)` : "";
    box.innerHTML = s.map(x => `<div class="stat"><b data-count="${x.value}" data-suffix="${x.suffix || ""}">0</b><span>${x.label}</span></div>`).join("");
  });

  /* ---------- Welcome screen (home page only) ---------- */
  const splash = document.getElementById("splash");
  if (splash) {
    let seen = false;
    try { seen = sessionStorage.getItem("eces-welcome") === "1"; } catch (e) {}
    if (!C.showWelcome || seen) { splash.remove(); }
    else {
      document.body.style.overflow = "hidden";
      const close = () => {
        splash.classList.add("hide");
        document.body.style.overflow = "";
        try { sessionStorage.setItem("eces-welcome", "1"); } catch (e) {}
        setTimeout(() => splash.remove(), 800);
      };
      splash.querySelector("[data-enter]").addEventListener("click", close);
      addEventListener("keydown", e => { if (e.key === "Enter" || e.key === "Escape") close(); }, { once: true });
      setTimeout(close, 9000);
    }
  }

  /* ---------- Reveal on scroll ---------- */
  const io = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { threshold: .12 }) : null;
  document.querySelectorAll(".reveal").forEach(el => io ? io.observe(el) : el.classList.add("in"));

  /* ---------- Count-up numbers ---------- */
  document.querySelectorAll("[data-count]").forEach(el => {
    const end = parseInt(el.dataset.count, 10), suf = el.dataset.suffix || "";
    const run = () => { let t0; const step = t => { t0 = t0 || t; const p = Math.min((t - t0) / 1400, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))).toLocaleString() + suf; if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step); };
    if (io) { const o = new IntersectionObserver(es => { if (es[0].isIntersecting) { run(); o.disconnect(); } }); o.observe(el); } else run();
  });
})();
