---
created_at: 2026-06-15
updated_at: 2026-06-15
created_by: claude (opus-4.8)
modified_by: codex (gpt-5)
source_plan: docs/20260615_PORTAL_STYLE_REVAMP_PLAN_V02.md
source_prd: docs/20260615_PORTAL_STYLE_REVAMP_PRD_V01.md
supersedes: docs/20260615_PORTAL_STYLE_REVAMP_TODO_V01.md
status: ready-for-implementation
---

# Portal Style Revamp — Implementation TODO (V02)

> **What changed from V01 (per Codex TODO assessment
> `docs/20260615_PORTAL_STYLE_REVAMP_TODO_V01_ASSESSMENT_CODEX.md`):** V01 contradicted
> itself on lockfile handling. It required adding npm dependencies via a normal install in
> Phases 1/3/4 (which regenerates `portal/package-lock.json`), yet Phase 7 told the
> implementer to confirm "no lockfile changes" and Appendix A listed lockfiles as
> "Untouched." V02 resolves this by distinguishing **hand-edited** lockfiles from the
> **normal generated** lockfile updates that `npm install` produces. The approved Plan
> (`PLAN_V02`) and PRD (`PRD_V01`) remain the source of truth; nothing about the design
> changes here. See §0.4 for the single canonical lockfile policy.

## 0. How to use this document

This is the granular, task-level checklist derived from the approved plan
`docs/20260615_PORTAL_STYLE_REVAMP_PLAN_V02.md` (the "Plan") and the PRD
`docs/20260615_PORTAL_STYLE_REVAMP_PRD_V01.md` (the "PRD"). Work the phases in order,
top to bottom. Check off each task (`[ ]` → `[x]`) as it is completed. Each phase ends
with explicit verification steps and a commit step.

- **The Plan is the authority on _how_; the PRD is the authority on _what/why_.** Where
  they disagree, the PRD wins (Plan §0). Do **not** redesign the approach in this TODO —
  implement it as written.
- All work is inside `portal/` (Next 16 / React 19 / Redux Toolkit + redux-persist /
  Tailwind v4). There is **no backend/API/pipeline work** in scope.
- Lite ports: **API 8010**, **portal 8011**.

### 0.1 Implementation routing boundary (read first)

- **Implementation starts with Claude Fable.** Fable performs the build-out described
  here, phase by phase.
- **If Claude reaches its usage limit before the work is complete, Codex may finish it —
  but only per Nick's latest instruction at that time.** Codex continues from **this
  TODO** and the Plan, **preserves the boundaries in §0.2 and Plan §1.3 / §2, and does
  not redesign the approach.** Pick up at the first unchecked task; do not restart
  completed phases.
- Whoever implements keeps the work reviewable: small, coherent commits aligned to the
  phases below, no drive-by edits to unrelated files, and **no lockfile hand-edits** —
  add deps by editing `portal/package.json` and running a normal install, and commit the
  resulting `portal/package-lock.json` change **with** that dependency change (see §0.4).

### 0.2 Hard constraints (apply to every phase)

- [x] **No backend change.** Do not touch the Express/API side: `api/**`, all routes,
      orchestration engine, demo session model, rate limits, the 10-article cap. The
      portal keeps talking to the same endpoints via the existing
      `portal/src/lib/apiClient.ts` and `portal/src/lib/constants.ts` — used **as-is**.
- [x] **No runtime coupling to `NewsNexus12`** (the full sibling project). Vendor/copy
      only; every vendored file is physically copied into `portal/src/...` or
      `portal/public/...` with imports rewritten to Lite-local paths. No cross-repo
      imports, no symlinks, no `..`-escapes, no absolute machine paths, no shared
      `node_modules`/workspace links, no service calls to NewsNexus12. (Verified in
      Phase 7 via the §1.3 checks.)
- [x] **No lockfile hand-edits.** Add deps via `portal/package.json` + a normal install;
      never hand-edit `portal/package-lock.json`. The lockfile changes that `npm install`
      **generates** for the new deps are expected and must be committed alongside the
      `package.json` change (see §0.4) — this is **not** a violation of this constraint.
- [x] **Behavioral invariants preserved** (Plan §2): API surface & client; Redux slice
      logic (`uiSlice` may be **extended additively** only); demo constraints (no-login
      session, 10-article cap + `truncated` notice, rate-limit handling, Reset Demo,
      FirstLaunch flow, immediate search-and-process — no add-to-DB step); single-`query`
      search; prompts pages behavior **and copy**; column set/order (only label
      "Assigned State" → "AI Assigned State" changes).
- [x] **Copy that stays verbatim:** the `"Read-only - sourced from NewsNexus12 defaults"`
      line in `portal/src/components/StateAssignerPromptsPage.tsx` is required product
      copy (PRD §6.7) — it is NOT a coupling. Do not edit it.
- [x] **Do not commit or push during planning.** Commits happen only while implementing,
      once per phase, after that phase's verification passes (see each phase's commit
      step). Use the AGENTS.md commit-message format with a `co-authored-by:` line.

### 0.4 Lockfile policy (canonical — read once, applies to Phases 1/3/4/7)

This section is the single source of truth for how `portal/package-lock.json` is handled.
The repo ships a `portal/package-lock.json`, so adding dependencies and running a normal
`npm install` **will and should** modify it.

- **Allowed / expected:** lockfile changes that `npm install` **generates** when you add
  the new dependencies called out in Phases 1, 3, and 4
  (`@tailwindcss/postcss`, `@tanstack/react-table`, and `tailwind-merge` if chosen). These
  are normal, machine-produced updates. **Commit them in the same commit as the
  corresponding `portal/package.json` change** so deps and lockfile stay in sync.
- **Not allowed:** **hand-editing** `portal/package-lock.json` (manually adding, pinning,
  removing, or rewriting entries), and **unrelated** lockfile churn not caused by the
  dependency additions above (e.g. an incidental `npm install` that bumps unrelated
  transitive deps, or a registry/version drift unrelated to this work). If you see
  unexpected/unrelated lockfile diff noise, investigate and reduce it to just the intended
  dependency changes before committing.
- **Net effect:** by the end of the effort `portal/package-lock.json` is **modified**
  (it reflects the three possible new deps) — not untouched. Phase 7 verifies that every
  lockfile line of diff traces back to an intended dependency addition and that none were
  hand-edited.

### 0.3 Self-containment checks (run in Phase 7; defined here for reference, Plan §1.3)

Run over `portal/` (excluding `node_modules` and `.next/`); each must pass:

1. **No cross-repo import/path escapes** — must return nothing:
   ```bash
   grep -rnE "(\.\.[\\/])+NewsNexus12([\\/]|['\"])|/NewsNexus12/|/applications/NewsNexus12[^L]" \
     portal/src portal/public portal/*.{ts,tsx,js,mjs,json} 2>/dev/null
   ```
2. **`NewsNexus12` appears only as allowed product text / required copy** — must return
   nothing:
   ```bash
   grep -rnE "NewsNexus12" portal/src portal/public portal/package.json portal/README.md 2>/dev/null \
     | grep -vE "NewsNexus12Lite|@newsnexus12lite|sourced from NewsNexus12 defaults"
   ```
3. **No escaping symlinks** — `find portal -type l` (excluding `node_modules`) returns
   nothing pointing outside `portal/`.
4. **No workspace/package dep on the full app** — `portal/package.json` has no
   `dependencies`/`devDependencies`/`workspaces` entry resolving to `NewsNexus12`. Only
   the new deps in Phase 1/Phase 4 are allowed.
5. **No service calls to NewsNexus12** — all base URLs resolve to Lite's own API
   (`lib/constants.ts` `API_BASE_URL`, ports 8010/8011); no fetch/axios/env value targets
   a NewsNexus12 host/port.
6. **Build-with-sibling-absent smoke test** — the portal builds and runs with the sibling
   `NewsNexus12` directory removed/renamed. Definitive proof of zero runtime coupling.

---

## Phase 1 — Tailwind v4 pipeline + design tokens (GATE)

> Plan §3.1, §4.3, §11(1). **Critical prerequisite.** Lite has `tailwindcss ^4.0.0` as a
> devDep and `@import "tailwindcss"` in `globals.css`, but **no `@tailwindcss/postcss`
> plugin and no `postcss.config.mjs`** — so Tailwind utilities do not compile today.
> Nothing in later phases renders until this is fixed. The app chrome will look broken
> until Phase 2 — that is expected.

- [x] Add devDependency **`@tailwindcss/postcss`** (matching the Tailwind v4 major) to
      `portal/package.json`; run a normal install. The resulting
      `portal/package-lock.json` update is expected — commit it with this dep change; do
      **not** hand-edit the lockfile (§0.4).
- [x] Create **`portal/postcss.config.mjs`**:
      ```js
      const config = { plugins: { "@tailwindcss/postcss": {} } };
      export default config;
      ```
- [x] In **`portal/src/app/globals.css`**: keep `@import "tailwindcss";` at the top; add
      `@custom-variant dark (&:is(.dark *));`.
- [x] Replace the bespoke `:root` variables with the **full TailAdmin `@theme` token
      block** copied from the reference `NewsNexus12/portal` `globals.css`: brand
      (`--color-brand-*` on `#465fff`), gray, success/error/warning/orange/blue-light
      scales, theme text sizes, breakpoints, shadows (`--shadow-theme-*`,
      `--shadow-focus-ring`), z-index tokens, and `--font-outfit`.
- [x] Add the `@layer base` border-compat block + `body { @apply ... bg-gray-50 ... }`.
- [x] Copy **only the menu-item `@utility` rules** needed for the sidebar nav. Do **not**
      copy flatpickr/fullcalendar/apexcharts/swiper blocks (Lite has none of those libs —
      they would be dead CSS).
- [x] Add **Outfit** in `portal/src/app/layout.tsx` via `next/font/google` and apply its
      class to `<body>`; keep `import "./globals.css"`. (No new npm dep — built into
      `next`.) Replaces `Arial, Helvetica`. *(Implemented as Lite-local self-hosted
      Outfit `@font-face` files because `next/font/google` could not fetch during the
      sandboxed production build.)*
- [x] Smoke marker: temporarily apply a `bg-brand-500` utility somewhere visible to
      confirm utilities compile; remove the marker before commit.

**Note (expected):** removing the bespoke `:root`/classes orphans every bespoke selector
(`.shell`, `.right-sidebar`, `.panel`, `.toolbar`, `.table-wrap`, `.btn`, `.chip`,
`.score-bubble`, `.modal*`, `.toast*`, `.notice`, `.prompt-page`, …). Those consumers are
migrated in Phases 2–6. Do not leave orphaned selectors at the end of the effort.

### Phase 1 verification
- [x] `npm run lint` (in `portal/`) passes.
- [x] `npm run type-check` passes.
- [x] `npm run build` passes and compiles utility classes.
- [ ] Dev check: `npm run dev` (port 8011) — the `bg-brand-500` smoke marker renders;
      toggling `.dark` on `<html>` in devtools flips the dark variant. (Chrome will look
      broken otherwise — expected.)
- [x] Lockfile sanity: `git diff portal/package-lock.json` shows only changes attributable
      to adding `@tailwindcss/postcss` (no hand edits, no unrelated churn — §0.4).
- [ ] If anything fails, fix before proceeding.
- [ ] Check off completed tasks; **commit** `portal/package.json` **and**
      `portal/package-lock.json` together (e.g. `feat: wire tailwind v4 pipeline + tokens`,
      referencing TODO Phase 1).

---

## Phase 2 — Theme context + shell chrome

> Plan §4.1, §4.2 (ThemeContext), §5.1–§5.3, §11(2). Target provider tree:
> RootLayout → ClientShell → Provider(store) → PersistGate → **ThemeProvider** →
> { InitSession, TopBar, main, RightSidebar, FirstLaunchModal, ToastArea, modals }.
> ThemeProvider sits **inside** PersistGate; theme lives in React context + localStorage,
> **not** redux-persist.

- [x] Create **`portal/src/context/ThemeContext.tsx`** — vendored ThemeProvider +
      `useTheme` from the reference: toggles `.dark` on `<html>`, persists to
      `localStorage`, exposes the hook. Rewrite imports to `@/...`. (Verify the `@/*`
      alias in `portal/tsconfig.json`.)
- [x] Create **`portal/src/components/ui/ThemeToggleButton.tsx`** — vendored toggle
      (sun/moon SVGs) wired to `useTheme()`.
- [x] Copy the logo asset to **`portal/public/images/logoAndNameRound.png`** from
      `NewsNexus12/portal/public/images/logoAndNameRound.png`. Lite serves its own copy
      only. (If read access to the reference PNG is unavailable, flag it — the file must
      end up committed inside Lite.)
- [x] Create **`portal/src/components/TopBar.tsx`** — sticky/fixed top bar:
      `next/image` logo from `/images/logoAndNameRound.png`; `ThemeToggleButton` at the
      right end; optional responsive sidebar toggle (hamburger) on small screens. Tailwind
      classes for height/border/`bg-white dark:bg-gray-900`/shadow/`sticky top-0 z-...`
      using token scales so contrast holds in both themes.
- [x] Update **`portal/src/components/ClientShell.tsx`** — mount `ThemeProvider` (inside
      PersistGate) and `TopBar`; keep Redux `Provider`, `PersistGate`, `InitSession`, and
      the modal/toast mounts. (Optional pre-hydration inline script in `layout.tsx` to
      avoid theme flash — implementer discretion, Plan §4.1.)
- [x] Restyle **`portal/src/components/RightSidebar.tsx`** — keep the three nav links
      (`Pipeline`, `AI Approver Prompts`, `State Assigner Prompts`) and the
      `toggleResponsiveSidebar` behavior wired to `state.ui.isResponsiveSidebarOpen`.
      `position: fixed` right column; active link → `menu-item-active` brand treatment,
      inactive → `menu-item-inactive`. Remove bespoke `.right-sidebar`/`.nav-link`;
      re-express the responsive (≤960px → `lg`/`md`) behavior in Tailwind. **No theme
      toggle here** (it lives in the TopBar).
- [x] Shell + grid: in `ClientShell`/layout, replace `.shell` padding so content clears
      the TopBar height (top) and RightSidebar width (right) using Tailwind responsive
      padding. In **`portal/src/components/PipelinePage.tsx`** re-express `.page-grid` as a
      Tailwind two-column grid (`minmax(0,1fr)` + fixed right column) collapsing to one
      column on small screens. The Analysis Pipeline panel stays in the right column;
      RightSidebar (fixed) is **allowed to overlap** it — do not add reflow to dodge it
      (Plan §5.4).

### Phase 2 verification
- [x] `npm run lint`, `npm run type-check`, `npm run build` pass.
- [ ] Dev run (port 8011): app looks coherent in **both** light and dark; theme toggle in
      the TopBar works and **persists across reload**; logo renders from Lite's own
      `public/images/`; RightSidebar nav + responsive open/close works; pipeline panel
      sits in the right column.
- [ ] If anything fails, fix before proceeding.
- [ ] Check off completed tasks; **commit** (referencing TODO Phase 2). (No dependency
      changes in this phase, so no lockfile change is expected.)

---

## Phase 3 — Vendored primitives + search form

> Plan §4.2, §6.1, §11(3). Add `tailwind-merge` if vendored primitives keep `twMerge`
> (recommended for a faithful copy); otherwise inline a 3-line local `cn()` and skip the
> dep.

- [x] Decide `tailwind-merge` vs local `cn()`. If using the dep, add **`tailwind-merge`**
      (dependency) to `package.json` + normal install — commit the generated
      `portal/package-lock.json` update with it; do not hand-edit the lockfile (§0.4). If
      not using the dep, add the `cn()` helper (no install, no lockfile change):
      ```ts
      export const cn = (...c: Array<string | false | null | undefined>) =>
        c.filter(Boolean).join(" ");
      ```
- [x] Create **`portal/src/components/ui/button/Button.tsx`** — variants `primary` |
      `outline`, sizes `sm` | `md`, `startIcon`/`endIcon`. **Fix:** ensure
      `onClick`/`type`/`disabled` are actually forwarded (the reference comments out
      `onClick` and only spreads `...rest`). Prefer forwarding native button props.
- [x] Create **`portal/src/components/ui/form/Input.tsx`** — the `forwardRef` `Input`
      from the reference `InputField.tsx` (strip commented-out blocks on copy).
- [x] Create **`portal/src/components/ui/form/Label.tsx`** — reference `Label`.
- [x] Create **`portal/src/components/ui/modal/Modal.tsx`** — reference `Modal` (backdrop,
      Escape-to-close, body scroll lock, close button). Single modal shell reused by all
      modal surfaces.
- [x] Create **`portal/src/components/ui/badge/Badge.tsx`** — reference `Badge`
      (variants/colors) for AI Approval Status and optional score/state badges.
- [x] Create **`portal/src/components/ui/LoadingDots.tsx`** (or equivalent) — small
      loading indicator; also reused by `DescriptionModal` (Phase 5).
- [x] Rewrite all vendored imports to `@/components/ui/...`, `@/context/...`, etc.
- [x] Restyle **`portal/src/components/RssSearchForm.tsx`** — keep the single `query`
      controlled input → `submitSearch()`, and `resetDemo()` (cancel run, stop polling,
      `postReset("all")`, clear slices) **exactly**. Wrap in a reference-style form card
      (`rounded-2xl border bg-white dark:bg-white/[0.03] ...`). Use vendored `Label` +
      `Input`. "Search RSS" = `Button variant="primary"` (keep lucide `Search`), disabled
      while `isLoading || !query.trim()`. "Reset Demo" = `Button variant="outline"` (keep
      `RotateCcw`). Preserve `error` and `truncated` notices, restyled as token-based
      alerts (error → `error-*`, info → `gray/brand`). Do **not** add reference's extra
      fields, URL card, or add-to-DB table.

### Phase 3 verification
- [x] `npm run lint`, `npm run type-check`, `npm run build` pass.
- [ ] Dev run (port 8011): the search form renders in the card style in both themes;
      **Search RSS submits a query** (loads the table) and **Reset Demo works**
      (cancels/clears as before); disabled state behaves; error/truncated notices render.
- [x] If `tailwind-merge` was added: `git diff portal/package-lock.json` shows only
      changes attributable to that dep (no hand edits, no unrelated churn — §0.4).
- [ ] If anything fails, fix before proceeding.
- [ ] Check off completed tasks; **commit** (referencing TODO Phase 3). If `tailwind-merge`
      was added, commit `portal/package.json` **and** `portal/package-lock.json` together.

---

## Phase 4 — Article table (TanStack rebuild)

> Plan §6.2, §6.3, §11(4). **Adapt** (do not import) the reference
> `TableReviewArticles.tsx` patterns; Lite's `Article` type
> (`portal/src/types/index.ts`) is simpler.

- [x] Add **`@tanstack/react-table`** (dependency) to `package.json` + normal install —
      commit the generated `portal/package-lock.json` update with it; do not hand-edit the
      lockfile (§0.4).
- [x] Rebuild **`portal/src/components/ArticleTable.tsx`** as a TanStack table:
  - [x] Row models: `getCoreRowModel`, `getSortedRowModel`, `getFilteredRowModel`.
        **Do NOT** add `getPaginationRowModel` (no pagination, PRD Q3).
  - [x] State: `sorting` (`SortingState`) and `globalFilter` (string) **only**. No
        `columnFilters`, `columnVisibility`, or `pagination`.
  - [x] Controls bar: a single **global search `<input>`** (reference styling). No
        page-size buttons, no `ColumnVisibilityDropdown`, no state-filter dropdown.
  - [x] Header rendering: clickable `th` with `getToggleSortingHandler()` and `▲`/`▼`
        indicators via `getIsSorted()`.
  - [x] Columns (exact order) via `createColumnHelper<Article>()`:
        1. **Title** — `accessor("title")`; render `rowStatus` as a small leading badge
           (visual-only). Sortable.
        2. **Source** — `accessor("source")`. Sortable.
        3. **Description** — clickable trigger opening the Description modal (Phase 5);
           show a truncated preview / info affordance. Sortable on text.
        4. **Location Score** — accessor over
           `pipeline.locationScorer.score ?? .locationScore`; render via restyled
           `ScoreBubble`; modal trigger for `locationScorer`. Numeric sort,
           `sortUndefined: "last"`.
        5. **AI Assigned State** — accessor over `pipeline.stateAssigner.assignedState`;
           **renamed label** from "Assigned State". Clickable → state-assignment modal.
           Sortable.
        6. **Semantic Score** — accessor over
           `pipeline.semanticScorer.score ?? .semanticScore`; restyled `ScoreBubble`;
           modal trigger for `semanticScorer`. Numeric sort.
        7. **AI Approval Status** — accessor over
           `pipeline.aiApprover.finalStatus ?? .status`; render via vendored `Badge`
           (approved→success, rejected→error, needs_review→warning,
           pending/running→gray/brand). Clickable → approval modal. Sortable.
  - [x] Empty/loading states: keep "Run a search to load articles…" / "No articles
        found…", restyled inside the new card.
- [x] Remove expandable rows: delete the `onClick → toggleExpanded` row behavior and the
      `ArticleExpandedRow` usage. **Delete `portal/src/components/ArticleExpandedRow.tsx`.**
- [x] **Delete `portal/src/components/ArticleRow.tsx`** if no longer referenced after the
      rebuild (fold into TanStack column defs).
- [x] In `portal/src/store/articlesSlice.ts`: remove `expandedIds` + `toggleExpanded`
      **iff** nothing else references them — **grep first**; if other code/tests use them,
      leave the action and just stop dispatching it.
- [x] Restyle **`portal/src/components/ScoreBubble.tsx`** — keep the explanation-fetch
      behavior (`apiClient.getExplanation(articleId, stage)` →
      `dispatch(setSelectedExplanation(...))`), and after dispatch **open the explanation
      modal** (the new `ui` flag from Phase 5; if Phase 5 lands after, wire the open call
      then). Restyle `.score-bubble` → token-based badge/bubble. Preserve the guard that
      `pending`/`running`/`skipped` are non-interactive/disabled. Keep Lite's score
      formatting (`0.00`/status text — do not switch to `%`); ensure contrast in both
      themes.

### Phase 4 verification
- [x] `npm run lint`, `npm run type-check`, `npm run build` pass.
- [x] `npm test` — update any tests asserting old markup/`toggleExpanded`; keep green.
- [ ] Dev run (port 8011): run a search; table shows the exact 7 columns in order with
      "AI Assigned State"; **sortable headers** (▲/▼) and the **global search box** filter
      correctly; **no** pagination/visibility/state-filter; no expandable rows; score
      bubbles/badges render with contrast in both themes.
- [x] Lockfile sanity: `git diff portal/package-lock.json` shows only changes attributable
      to adding `@tanstack/react-table` (no hand edits, no unrelated churn — §0.4).
- [ ] If anything fails, fix before proceeding.
- [ ] Check off completed tasks; **commit** `portal/package.json` **and**
      `portal/package-lock.json` together (referencing TODO Phase 4).

---

## Phase 5 — Modals (explanation + description)

> Plan §7, §11(5). Replaces the inline `ArticleExpandedRow` "selected explanation" panel.
> **No backend change** — `DescriptionModal` uses the existing
> `apiClient.getArticle(articleId)` and `GET /api/articles/:id` as-is.

- [x] Extend **`portal/src/store/uiSlice.ts`** additively (Plan §7.2):
  - [x] Add to `UiState`: `isExplanationModalOpen: boolean` and
        `descriptionModalArticleId: string | null` (or a single discriminated
        `activeModal` — implementer discretion).
  - [x] Add actions: `openExplanationModal`, `closeExplanationModal`,
        `openDescriptionModal(articleId)`, `closeDescriptionModal`.
  - [x] Keep `setSelectedExplanation` / `clearSelectedExplanation`. On close, clear the
        open flag (and optionally the selected explanation).
  - [x] **Additive only** — no existing action semantics change. Check
        `portal/src/store/index.ts` persist whitelist/blacklist; new keys must default
        cleanly on rehydration. Optionally mark modal flags non-persisted.
- [x] Create **`portal/src/components/ExplanationModal.tsx`** (on vendored `Modal`) —
      reads `state.ui.selectedExplanation` + the open flag; renders stage title,
      `reasoning ?? finalReasoning ?? finalStatus`, confidence, and `promptInput` (in a
      `<pre>`/scroll area). Used by Location Score, Semantic Score, AI Assigned State, and
      AI Approval Status cells.
- [x] Create **`portal/src/components/DescriptionModal.tsx`** (on vendored `Modal`):
  - [x] Read `descriptionModalArticleId`; find the in-state article in
        `state.articles.items` for the immediate fallback (`description`, `url`, `source`).
  - [x] **Fetch the full article via `apiClient.getArticle(articleId)`** (the snapshot
        builder strips `scraping.body`/`scrapingSource`/`scrapedAt` from Redux — Plan
        §0.1, §7.1). Fetch **when the modal opens**, and **re-fetch when the scraping
        stage completes** while open (trigger: `descriptionModalArticleId` set **and**
        in-state `pipeline.scraping.status === "complete"`).
  - [x] Keep the fetched article in **local component state**, not Redux.
  - [x] Narrow the response locally (do not loosen `apiClient` or widen shared `Article`):
        ```ts
        type ScrapedArticle = Article & {
          pipeline: Article["pipeline"] & {
            scraping?: { status?: string; body?: string; scrapingSource?: string; scrapedAt?: string };
          };
        };
        ```
        Read `pipeline.scraping.body`/`scrapingSource`/`scrapedAt` defensively (all
        optional).
  - [x] Layout: header = title + source; primary body = scraped `pipeline.scraping.body`
        when present else RSS `description`; meta = open-article link (`scrapingSource`
        or `url`) and `scrapedAt` when present; `LoadingDots` while the fetch is pending
        (fallback text still visible).
  - [x] **Fallback chain (must degrade gracefully):** in-flight → loading + in-state
        `description`/`url`; success with body → scraped body + source/timestamp; success
        without body, or fetch error → fall back to in-state `description` + `url` +
        `source`. Never block the description on a failed fetch.
- [x] Mount both modals once in `ClientShell` (or `PipelinePage`); cells dispatch the open
      actions. Wire `ScoreBubble` (Phase 4) to call `openExplanationModal` after its
      dispatch. Cells with no meaningful content (pending/running/skipped, empty
      description) are non-interactive/disabled — mirror the `ScoreBubble` guard. (The
      Description cell may still open to show the RSS description before scraping
      completes.)

### Phase 5 verification
- [x] `npm run lint`, `npm run type-check`, `npm run build` pass.
- [ ] `npm test` — add/adjust a `DescriptionModal` test mocking `apiClient.getArticle`
      (scraped-body success path **and** fetch-failure fallback path). Keep green.
- [ ] Dev run (port 8011): each clickable cell opens the right content/reasoning —
      Location/Semantic Score and AI Assigned State and AI Approval Status open the
      explanation modal; Description opens the description modal. After a run completes,
      the **scraped body appears** in the Description modal; with a forced fetch failure it
      **falls back** to description/url. Verify in both themes.
- [ ] If anything fails, fix before proceeding.
- [ ] Check off completed tasks; **commit** (referencing TODO Phase 5). (No dependency
      changes in this phase, so no lockfile change is expected.)

---

## Phase 6 — Remaining chrome (pipeline panel, modal, toasts, prompts)

> Plan §6.4–§6.7, §11(6). All visual-only — preserve behavior and copy.

- [x] **`portal/src/components/OrchestrationPanel.tsx`** — rename the visible heading
      **"Orchestration" → "Analysis Pipeline"** (PRD Q9). Keep the component filename,
      `orchestrationSlice`, and API paths unchanged. Preserve `overallProgress`,
      `currentStage`, per-stage `stageStatuses`, Start Run (`startRun`, disabled when no
      articles/active), Stop Run (`cancelRun`, `cancellationPending`), `pollError` and
      `cancelled` notices. Restyle panel, progress bar (replace `<progress>` with a
      token-styled bar or restyle it), stage chips (`Badge`/token chips), buttons
      (vendored `Button`). Stays in the right column.
- [x] **`portal/src/components/FirstLaunchModal.tsx`** — re-implement on vendored `Modal`
      + `Button`s; keep `choose(isFirstTime)` logic, focus management intent, copy, and
      the `firstLaunchAnswered` gate unchanged.
- [x] **`portal/src/components/ToastArea.tsx`** — keep `aria-live`, the toast list from
      `state.ui.toasts`, and `dismissToast`. Restyle tones (info / error / rate-limit →
      `warning-*`) with token classes; keep the dismiss button behavior.
- [x] **`portal/src/components/ApproverPromptsPage.tsx`** and
      **`portal/src/components/StateAssignerPromptsPage.tsx`** — styling-only migration to
      tokens/primitives (`Label`, `Input`/textarea styling, `Button`, `Badge`, token
      cards). **No** change to load/apply/reset/draft logic or copy. The inner
      hazard-prompt expand/collapse stays functionally as-is; restyle only. The
      `"Read-only - sourced from NewsNexus12 defaults"` line stays **verbatim**.

### Phase 6 verification
- [x] `npm run lint`, `npm run type-check`, `npm run build` pass.
- [x] `npm test` — update any tests asserting old chrome markup; keep green.
- [ ] Dev run (port 8011): pipeline panel reads "Analysis Pipeline", Start/Stop/progress
      still work; FirstLaunchModal renders in new style with unchanged behavior; toasts
      (info/error/rate-limit) render and dismiss; both `/prompts/*` pages render in new
      style with unchanged behavior and copy. Verify in both themes.
- [x] Confirm **no orphaned bespoke selectors** remain (`.shell`, `.panel`, `.toolbar`,
      `.chip`, `.modal*`, `.toast*`, `.notice`, `.prompt-page`, etc. — all migrated).
- [ ] If anything fails, fix before proceeding.
- [ ] Check off completed tasks; **commit** (referencing TODO Phase 6). (No dependency
      changes in this phase, so no lockfile change is expected.)

---

## Phase 7 — Verify, self-containment, accept

> Plan §1.3, §8, §11(7), §13. Final gate before the work is "done."

- [x] `npm run lint` (`--max-warnings=0`), `npm run type-check`, `npm run build`,
      `npm test` all pass clean.
- [ ] Full manual run (port 8011) in **both light and dark**: search → table (sort +
      global search) → modals (explanation + description, incl. scraped body after a run)
      → pipeline run (Start/Stop/progress) → toasts → FirstLaunch → both prompts pages.
      Theme toggle persists across reload. Badges/scores legible in both themes.
- [ ] Run the **self-containment checks (§0.3)** — all six must pass:
  - [x] Check 1: cross-repo import/path-escape grep returns nothing.
  - [x] Check 2: triage grep returns nothing (only allowed product text / required copy
        remain).
  - [x] Check 3: no escaping symlinks.
  - [x] Check 4: no workspace/package dep on the full app (only the new deps allowed:
        `@tailwindcss/postcss`, `@tanstack/react-table`, and `tailwind-merge` if used).
  - [x] Check 5: no service calls to NewsNexus12 (URLs resolve to Lite API 8010/8011).
  - [ ] Check 6: **build-with-sibling-absent smoke test** — temporarily rename/remove the
        sibling `NewsNexus12` directory; `npm run build` **and** `npm run dev` succeed;
        restore the sibling afterward.
- [ ] Confirm PRD §8 acceptance criteria 1–11 are satisfied (Plan §13 acceptance mapping).
- [x] Confirm hard constraints (§0.2) held: no backend/API/demo changes; no unrelated
      files touched; `uiSlice` change additive only; and **no hand-edited or unrelated
      lockfile changes** — `portal/package-lock.json` is modified only to the extent the
      new deps (`@tailwindcss/postcss`, `@tanstack/react-table`, and `tailwind-merge` if
      used) require, with every lockfile diff line traceable to one of those deps (§0.4).
- [ ] If anything fails, fix before proceeding.
- [ ] Check off completed tasks; **commit** the final verification/cleanup (referencing
      TODO Phase 7).

---

## Appendix A — File change map (quick reference, Plan §10 / PRD §7)

**New / copied**
- `portal/postcss.config.mjs`
- `portal/public/images/logoAndNameRound.png`
- `portal/src/components/ui/*` (Button, Input, Label, Modal, Badge, LoadingDots,
  ThemeToggleButton)
- `portal/src/context/ThemeContext.tsx`
- `portal/src/components/TopBar.tsx`
- `portal/src/components/ExplanationModal.tsx`, `portal/src/components/DescriptionModal.tsx`

**Modified**
- `portal/package.json` (+ `@tailwindcss/postcss` dev, `@tanstack/react-table`,
  `tailwind-merge` if used)
- `portal/package-lock.json` — **regenerated by `npm install`** when the deps above are
  added (Phases 1/3/4). Expected, normal, generated change; commit it with the matching
  `package.json` change. **Never hand-edited** (§0.2, §0.4). If no install happens in a
  phase (e.g. `cn()` chosen over `tailwind-merge`), the lockfile does not change that
  phase.
- `portal/src/app/globals.css`, `portal/src/app/layout.tsx`
- `portal/src/components/ClientShell.tsx`, `PipelinePage.tsx`, `RssSearchForm.tsx`,
  `ArticleTable.tsx`, `ScoreBubble.tsx`, `OrchestrationPanel.tsx`, `RightSidebar.tsx`,
  `FirstLaunchModal.tsx`, `ToastArea.tsx`, `ApproverPromptsPage.tsx`,
  `StateAssignerPromptsPage.tsx`
- `portal/src/store/uiSlice.ts` (additive), `portal/src/store/articlesSlice.ts`
  (remove `expandedIds`/`toggleExpanded` iff unused)

**Removed**
- `portal/src/components/ArticleExpandedRow.tsx`
- `portal/src/components/ArticleRow.tsx` (if unreferenced after rebuild)

**Untouched** — all `api/**` routes/clients (incl. `apiClient.getArticle` /
`GET /api/articles/:id`, used as-is), `lib/apiClient.ts`, `lib/constants.ts`, slice logic
except additive `uiSlice`, session/orchestration flows, demo constraints. (Note:
`portal/package-lock.json` is **not** untouched — see "Modified" above; the constraint is
**no hand edits**, not "no generated updates.")

## Appendix B — Phase → PRD acceptance criteria map (PRD §8)

| Phase | PRD §8 criteria covered |
|---|---|
| 1 | 3 (Outfit/tokens), 10 (build/type/lint foundation) |
| 2 | 1 (theme toggle + persistence), 2 (TopBar logo + RightSidebar), 3 (tokens/contrast) |
| 3 | 4 (single-query form card) |
| 4 | 5 (TanStack sort + global search, no extras), 6 (exact columns, "AI Assigned State") |
| 5 | 7 (modals replace expandable rows, incl. scraped body via `getArticle`) |
| 6 | 8 (Analysis Pipeline), 9 (FirstLaunch/Toasts/prompts restyled, behavior unchanged) |
| 7 | 10 (TanStack added, zero NewsNexus12 coupling, clean build), 11 (no backend changes; no hand-edited or unrelated lockfile changes — generated lockfile updates for the new deps are expected, §0.4) |
