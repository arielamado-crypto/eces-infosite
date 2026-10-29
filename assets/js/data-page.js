/* ECES School Data page — draws KPIs, charts and tables from school-data.js */
(function () {
  const D = window.ECES_DATA;
  if (!D) return;
  const $ = s => document.querySelector(s);
  const sum = (a, f) => a.reduce((t, x) => t + f(x), 0);
  const n = v => Number(v).toLocaleString();

  const GREEN = "#146b45", GOLD = "#e0aa00", RED = "#c8102e", BLUE = "#1d5fa8", TEAL = "#0f7f7a", PLUM = "#7a3f8f";
  const MALE = "#1d5fa8", FEMALE = "#d64f86";

  /* ----- labels ----- */
  document.querySelectorAll("[data-d]").forEach(el => { if (D[el.dataset.d] != null) el.textContent = D[el.dataset.d]; });
  if (!D.isSample) { const s = $("#sample-note"); if (s) s.remove(); }

  const rt = $("#reading-title"); if (rt && D.reading.title) rt.textContent = D.reading.title;

  /* ----- KPIs ----- */
  const male = sum(D.enrollment, x => x.male), female = sum(D.enrollment, x => x.female), total = male + female;
  const teachers = sum(D.teachers, x => x.count);
  const classroomTeachers = sum(D.teachers.filter(t => !/principal/i.test(t.position)), x => x.count);
  const ratio = classroomTeachers ? Math.round(total / classroomTeachers) : 0;
  const trend = D.enrollmentTrend;
  const growth = trend.length > 1 ? ((trend[trend.length - 1].total - trend[0].total) / trend[0].total * 100) : 0;
  const kpis = [
    ["Total Learners", n(total), `${n(male)} male · ${n(female)} female`, GREEN],
    ["Teaching Personnel", n(teachers), `plus ${n(D.profile.nonTeaching)} non-teaching staff`, GOLD],
    ["Learner–Teacher Ratio", `${ratio} : 1`, "learners per classroom teacher", BLUE],
    ["Sections", n(D.profile.sections), `${n(D.profile.classrooms)} classrooms`, TEAL],
    ["Enrollment Growth", `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`, `since SY ${trend[0] ? trend[0].year : ""}`, PLUM]
  ];
  $("#kpis").innerHTML = kpis.map(k => `
    <div class="kpi reveal" style="--c:${k[3]}"><small>${k[0]}</small><b>${k[1]}</b><span>${k[2]}</span></div>`).join("");

  /* ----- enrollment table ----- */
  $("#enroll-table").innerHTML = `
    <thead><tr><th>Grade Level</th><th>Male</th><th>Female</th><th>Total</th></tr></thead>
    <tbody>${D.enrollment.map(r => `<tr><td>${r.grade}</td><td>${n(r.male)}</td><td>${n(r.female)}</td><td><b>${n(r.male + r.female)}</b></td></tr>`).join("")}</tbody>
    <tfoot><tr><td>Total</td><td>${n(male)}</td><td>${n(female)}</td><td>${n(total)}</td></tr></tfoot>`;

  /* ----- performance bars (no library needed) ----- */
  $("#perf").innerHTML = D.performance.map(p => `
    <div class="perf reveal">
      <div class="perf-top"><span>${p.label}</span><b style="color:${p.lowerIsBetter ? RED : GREEN}">${p.value}%</b></div>
      <div class="perf-track"><i style="--w:${Math.max(p.value, p.lowerIsBetter ? 2 : 0)}%;background:${p.lowerIsBetter ? RED : GREEN}"></i></div>
      <small>${p.lowerIsBetter ? "Lower is better" : "Higher is better"}</small>
    </div>`).join("");

  /* ----- charts ----- */
  if (!window.Chart) {
    document.querySelectorAll(".chart-box").forEach(b => b.innerHTML = '<p class="chart-off">Graph needs an internet connection to display. The table below shows the same data.</p>');
    return;
  }
  Chart.defaults.font.family = '"Plus Jakarta Sans", system-ui, sans-serif';
  Chart.defaults.color = "#5b6b62";
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.tooltip.backgroundColor = "#062a1f";
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.maintainAspectRatio = false;
  const grid = { color: "rgba(20,35,28,.07)" };

  new Chart($("#c-enroll"), {
    type: "bar",
    data: { labels: D.enrollment.map(r => r.grade), datasets: [
      { label: "Male", data: D.enrollment.map(r => r.male), backgroundColor: MALE, borderRadius: 6, maxBarThickness: 34 },
      { label: "Female", data: D.enrollment.map(r => r.female), backgroundColor: FEMALE, borderRadius: 6, maxBarThickness: 34 }
    ]},
    options: { scales: { x: { grid: { display: false } }, y: { grid, beginAtZero: true } }, plugins: { legend: { position: "top" } } }
  });

  new Chart($("#c-sex"), {
    type: "doughnut",
    data: { labels: ["Male", "Female"], datasets: [{ data: [male, female], backgroundColor: [MALE, FEMALE], borderWidth: 4, borderColor: "#fff", hoverOffset: 8 }] },
    options: { cutout: "64%", plugins: { legend: { position: "bottom" },
      tooltip: { callbacks: { label: c => ` ${c.label}: ${n(c.raw)} (${(c.raw / total * 100).toFixed(1)}%)` } } } },
    plugins: [{ id: "center", afterDraw(ch) { const { ctx, chartArea: a } = ch; ctx.save(); ctx.textAlign = "center";
      ctx.fillStyle = "#0b3d2e"; ctx.font = '700 26px Fraunces, Georgia, serif'; ctx.fillText(n(total), (a.left + a.right) / 2, (a.top + a.bottom) / 2 + 4);
      ctx.fillStyle = "#5b6b62"; ctx.font = '600 11px "Plus Jakarta Sans", sans-serif'; ctx.fillText("LEARNERS", (a.left + a.right) / 2, (a.top + a.bottom) / 2 + 22); ctx.restore(); } }]
  });

  const tctx = $("#c-trend").getContext("2d");
  const fill = tctx.createLinearGradient(0, 0, 0, 300); fill.addColorStop(0, "rgba(20,107,69,.28)"); fill.addColorStop(1, "rgba(20,107,69,0)");
  new Chart(tctx, {
    type: "line",
    data: { labels: trend.map(t => "SY " + t.year), datasets: [{ label: "Total enrollment", data: trend.map(t => t.total),
      borderColor: GREEN, backgroundColor: fill, fill: true, tension: .35, borderWidth: 3, pointRadius: 5, pointBackgroundColor: GOLD, pointBorderColor: "#fff", pointBorderWidth: 2 }] },
    options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid } } }
  });

  new Chart($("#c-teachers"), {
    type: "bar",
    data: { labels: D.teachers.map(t => t.position), datasets: [{ label: "Personnel", data: D.teachers.map(t => t.count),
      backgroundColor: D.teachers.map((_, i) => [GREEN, GOLD, TEAL, BLUE, PLUM, RED][i % 6]), borderRadius: 6, maxBarThickness: 26 }] },
    options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { grid, beginAtZero: true, ticks: { precision: 0 } }, y: { grid: { display: false } } } }
  });

  const R = D.reading.levels;
  new Chart($("#c-reading"), {
    type: "doughnut",
    data: { labels: R.map(r => r.level), datasets: [{ data: R.map(r => r.count), backgroundColor: [GREEN, GOLD, "#f08a24", RED], borderWidth: 4, borderColor: "#fff", hoverOffset: 8 }] },
    options: { cutout: "58%", plugins: { legend: { position: "bottom" },
      tooltip: { callbacks: { label: c => { const t = sum(R, x => x.count); return ` ${c.label}: ${n(c.raw)} (${(c.raw / t * 100).toFixed(1)}%)`; } } } } }
  });
})();
