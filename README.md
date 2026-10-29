# Estancia Central Elementary School — Official Infosite

Static website for learners, parents and stakeholders. Runs free on GitHub Pages (no database, no server).

## Pages
- `index.html` — Welcome screen (Principal + ECES logo), page buttons, Principal's message, quick numbers, latest news
- `about.html` — Story, DepEd Vision/Mission/Core Values, why ECES
- `academics.html` — Kinder to Grade 6, programs
- `data.html` — School Data: enrollment, personnel, performance indicators and reading profile with graphs
- `news.html` — All announcements
- `admin.html` — Site Editor (forms for all settings and data)
- `enrollment.html` — Steps and requirements
- `contact.html` — Address, phone, email, Facebook, office hours, map

## Editing — use the Site Editor (no code)
Open **`admin.html`** (also linked as "Site Editor" at the very bottom of every page), e.g.
`https://<your-username>.github.io/eces-infosite/admin.html`

Tabs: School Info · Announcements · Data Settings · Enrollment · Enrollment Trend · Teachers · Performance · Reading Profile.

When done, either:
- **Save to GitHub** — paste a GitHub token (steps are shown inside the editor). Changes go live in 1–2 minutes.
- **Download updated files** — then upload `config.js` and `school-data.js` into `assets/js` on GitHub.

Anyone can open the editor page, but only someone with your GitHub token (or your GitHub login) can change the live site.

To change the principal photo or logo, upload a new image to `assets/img` with the **same file name** (`principal.jpg` or `eces-logo.png`).

## Put it online (GitHub Pages)
1. Sign in to GitHub → **New repository** → name it `eces-infosite` → Public → Create.
2. Click **uploading an existing file**, drag in everything inside this folder (the `.html` files, `README.md` and the whole `assets` folder) → **Commit changes**.
3. Go to **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main` / `(root)` → **Save**.
4. After 1–2 minutes the site is live at `https://<your-username>.github.io/eces-infosite/`.

Developer: Sir Ariel L. Amado, Master Teacher I
