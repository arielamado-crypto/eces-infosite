/* =========================================================
   ECES SCHOOL DATA — edit the numbers below.
   Every chart and number on the "School Data" page is drawn
   from this file. Change a number, commit, and the graphs update.
   ========================================================= */
window.ECES_DATA = {

  /* While true, a yellow "Sample data" notice shows on the page.
     Set to false once you have entered the school's actual figures. */
  isSample: true,

  schoolYear: "2025–2026",
  asOf: "October 2026",
  source: "School records / LIS / BEIS",

  /* ---------- School profile numbers ---------- */
  profile: {
    sections:   36,
    classrooms: 34,
    nonTeaching: 6
  },

  /* ---------- Enrollment by grade level and sex ---------- */
  enrollment: [
    { grade: "Kinder",  male: 82,  female: 76 },
    { grade: "Grade 1", male: 88,  female: 84 },
    { grade: "Grade 2", male: 90,  female: 86 },
    { grade: "Grade 3", male: 85,  female: 89 },
    { grade: "Grade 4", male: 80,  female: 83 },
    { grade: "Grade 5", male: 78,  female: 81 },
    { grade: "Grade 6", male: 74,  female: 79 }
  ],

  /* ---------- Total enrollment over the years ---------- */
  enrollmentTrend: [
    { year: "2021–22", total: 1102 },
    { year: "2022–23", total: 1135 },
    { year: "2023–24", total: 1150 },
    { year: "2024–25", total: 1168 },
    { year: "2025–26", total: 1175 }
  ],

  /* ---------- Teaching personnel by position ---------- */
  teachers: [
    { position: "Principal",            count: 1 },
    { position: "Master Teacher II",    count: 2 },
    { position: "Master Teacher I",     count: 4 },
    { position: "Teacher III",          count: 18 },
    { position: "Teacher II",           count: 8 },
    { position: "Teacher I",            count: 9 }
  ],

  /* ---------- Performance indicators (in %) ---------- */
  performance: [
    { label: "Promotion Rate",  value: 98.6 },
    { label: "Completion Rate", value: 97.9 },
    { label: "Retention Rate",  value: 98.2 },
    { label: "Dropout Rate",    value: 0.4, lowerIsBetter: true }
  ],

  /* ---------- Reading profile (number of learners) ---------- */
  reading: {
    title: "Reading Profile (Phil-IRI, English)",
    levels: [
      { level: "Independent",   count: 512 },
      { level: "Instructional", count: 341 },
      { level: "Frustration",   count: 118 },
      { level: "Non-Reader",    count: 46 }
    ]
  }
};
