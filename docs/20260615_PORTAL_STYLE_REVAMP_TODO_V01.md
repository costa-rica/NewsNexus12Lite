---
created_at: 2026-06-15
updated_at: 2026-06-15
created_by: claude (opus-4.8)
modified_by: claude (opus-4.8)
source_plan: docs/20260615_PORTAL_STYLE_REVAMP_PLAN_V02.md
source_prd: docs/20260615_PORTAL_STYLE_REVAMP_PRD_V01.md
status: ready-for-implementation
---

# Portal Style Revamp — Implementation TODO (V01)

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
  phases below, no drive-by edits to unrelated files, and **no lockfile hand-edits**
  (add deps by editing `portal/package.json` and running a normal install).

### 0.2 Hard constraints (apply to every phase)

- [ ] **No backend change.** Do not touch the Express/API side: `api/**`, all routes,
      orchestration engine, demo session model, rate limits, the 10-article cap. The
      portal keeps talking to the same endpoints via the existing
      `portal/src/lib/apiClient.ts` and `portal/src/lib/constants.ts` — used **as-is**.
- [ ] **No runtime coupling to `NewsNexus12`** (the full sibling project). Vendor/copy
      only; every vendored file is physically copied into `portal/src/...` or
      `portal/public/...` with imports rewritten to Lite-local paths. No cross-repo
      imports, no symlinks, no `..`-escapes, no absolute machine paths, no shared
      `node_modules`/workspace links, no service calls to NewsNexus12. (Verified in
      Phase 7 via the §1.3 checks.)
- [ ] **No lockfile hand-edits**; add deps via `package.json` + normal install.
- [ ] **Behavioral invariants preserved** (Plan §2): API surface & client; Redux slice
      logic (`uiSlice` may be **extended additively** only); demo constraints (no-login
      session, 10-article cap + `truncated` notice, rate-limit handling, Reset Demo,
      FirstLaunch flow, immediate search-and-process — no add-to-DB step); single-`query`
      search; prompts pages behavior **and copy**; column set/order (only label
      "Assigned State" → "AI Assigned State" changes).
- [ ] **Copy that stays verbatim:** the `"Read-only - sourced from NewsNexus12 defaults"`
      line in `portal/src/components/StateAssignerPromptsPage.tsx` is required product
      copy (PRD §6.7) — it is NOT a coupling. Do not edit it.
- [ ] **Do not commit or push during planning.** Commits happen only while implementing,
      once per phase, after that phase's verification passes (see each phase's commit
      step). Use the AGENTS.md commit-message format with a `co-authored-by:` line.

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

- [ ] Add devDependency **`@tailwindcss/postcss`** (matching the Tailwind v4 major) to
      `portal/package.json`; run a normal install (no lockfile hand-edit).
- [ ] Create **`portal/postcss.config.mjs`**:
      ```js
      const config = { plugins: { "@tailwindcss/postcss": {} } };
      export default config;
      ```
- [ ] In **`portal/src/app/globals.css`**: keep `@import "tailwindcss";` at the top; add
      `@custom-variant dark (&:is(.dark *));`.
- [ ] Replace the bespoke `:root` variables with the **full TailAdmin `@theme` token
      block** copied from the reference `NewsNexus12/portal` `globals.css`: brand
      (`--color-brand-*` on `#465fff`), gray, success/error/warning/orange/blue-light
      scales, theme text sizes, breakpoints, shadows (`--shadow-theme-*`,
      `--shadow-focus-ring`), z-index tokens, and `--font-outfit`.
- [ ] Add the `@layer base` border-compat block + `body { @apply ... bg-gray-50 ... }`.
- [ ] Copy **only the menu-item `@utility` rules** needed for the sidebar nav. Do **not**
      copy flatpickr/fullcalendar/apexcharts/swiper blocks (Lite has none of those libs —
      they would be dead CSS).
- [ ] Add **Outfit** in `portal/src/app/layout.tsx` via `next/font/google` and apply its
      class to `<body>`; keep `import "./globals.css"`. (No new npm dep — built into
      `next`.) Replaces `Arial, Helvetica`.
- [ ] Smoke marker: temporarily apply a `bg-brand-500` utility somewhere visible to
      confirm utilities compile; remove the marker before commit.

**Note (expected):** removing the bespoke `:root`/classes orphans every bespoke selector
(`.shell`, `.right-sidebar`, `.panel`, `.toolbar`, `.table-wrap`, `.btn`, `.chip`,
`.score-bubble`, `.modal*`, `.toast*`, `.notice`, `.prompt-page`, …). Those consumers are
migrated in Phases 2–6. Do not leave orphaned selectors at the end of the effort.

### Phase 1 verification
- [ ] `npm run lint` (in `portal/`) passes.
- [ ] `npm run type-check` passes.
- [ ] `npm run build` passes and compiles utility classes.
- [ ] Dev check: `npm run dev` (port 8011) — the `bg-brand-500` smoke marker renders;
      toggling `.dark` on `<html>` in devtools flips the dark variant. (Chrome will look
      broken otherwise — expected.)
- [ ] If anything fails, fix before proceeding.
- [ ] Check off completed tasks; **commit** (e.g. `feat: wire tailwind v4 pipeline + tokens`,
      referencing TODO Phase 1).

---

## Phase 2 — Theme context + shell chrome

> Plan §4.1, §4.2 (ThemeContext), §5.1–§5.3, §11(2). Target provider tree:
> RootLayout → ClientShell → Provider(store) → PersistGate → **ThemeProvider** →
> { InitSession, TopBar, main, RightSidebar, FirstLaunchModal, ToastArea, modals }.
> ThemeProvider sits **inside** PersistGate; theme lives in React context + localStorage,
> **not** redux-persist.

- [ ] Create **`portal/src/context/ThemeContext.tsx`** — vendored ThemeProvider +
      `useTheme` from the reference: toggles `.dark` on `<html>`, persists to
      `localStorage`, exposes the hook. Rewrite imports to `@/...`. (Verify the `@/*`
      alias in `portal/tsconfig.json`.)
- [ ] Create **`portal/src/components/ui/ThemeToggleButton.tsx`** — vendored toggle
      (sun/moon SVGs) wired to `useTheme()`.
- [ ] Copy the logo asset to **`portal/public/images/logoAndNameRound.png`** from
      `NewsNexus12/portal/public/images/logoAndNameRound.png`. Lite serves its own copy
      only. (If read access to the reference PNG is unavailable, flag it — the file must
      end up committed inside Lite.)
- [ ] Create **`portal/src/components/TopBar.tsx`** — sticky/fixed top bar:
      `next/image` logo from `/images/logoAndNameRound.png`; `ThemeToggleButton` at the
      right end; optional responsive sidebar toggle (hamburger) on small screens. Tailwind
      classes for height/border/`bg-white dark:bg-gray-900`/shadow/`sticky top-0 z-...`
      using token scales so contrast holds in both themes.
- [ ] Update **`portal/src/components/ClientShell.tsx`** — mount `ThemeProvider` (inside
      PersistGate) and `TopBar`; keep Redux `Provider`, `PersistGate`, `InitSession`, and
      the modal/toast mounts. (Optional pre-hydration inline script in `layout.tsx` to
      avoid theme flash — implementer discretion, Plan §4.1.)
- [ ] Restyle **`portal/src/components/RightSidebar.tsx`** — keep the three nav links
      (`Pipeline`, `AI Approver Prompts`, `State Assigner Prompts`) and the
      `toggleResponsiveSidebar` behavior wired to `state.ui.isResponsiveSidebarOpen`.
      `position: fixed` right column; active link → `menu-item-active` brand treatment,
      inactive → `menu-item-inactive`. Remove bespoke `.right-sidebar`/`.nav-link`;
      re-express the responsive (≤960px → `lg`/`md`) behavior in Tailwind. **No theme
      toggle here** (it lives in the TopBar).
- [ ] Shell + grid: in `ClientShell`/layout, replace `.shell` padding so content clears
      the TopBar height (top) and RightSidebar width (right) using Tailwind responsive
      padding. In **`portal/src/components/PipelinePage.tsx`** re-express `.page-grid` as a
      Tailwind two-column grid (`minmax(0,1fr)` + fixed right column) collapsing to one
      column on small screens. The Analysis Pipeline panel stays in the right column;
      RightSidebar (fixed) is **allowed to overlap** it — do not add reflow to dodge it
      (Plan §5.4).

### Phase 2 verification
- [ ] `npm run lint`, `npm run type-check`, `npm run build` pass.
- [ ] Dev run (port 8011): app looks coherent in **both** light and dark; theme toggle in
      the TopBar works and **persists across reload**; logo renders from Lite's own
      `public/images/`; RightSidebar nav + responsive open/close works; pipeline panel
      sits in the right column.
- [ ] If anything fails, fix before proceeding.
- [ ] Check off completed tasks; **commit** (referencing TODO Phase 2).

---

## Phase 3 — Vendored primitives + search form

> Plan §4.2, §6.1, §11(3). Add `tailwind-merge` if vendored primitives keep `twMerge`
> (recommended for a faithful copy); otherwise inline a 3-line local `cn()` and skip the
> dep.

- [ ] Decide `tailwind-merge` vs local `cn()`. If using the dep, add **`tailwind-merge`**
      (dependency) to `package.json` + normal install. If not, add the `cn()` helper:
      ```ts
      export const cn = (...c: Array<string | false | null | undefined>) =>
        c.filter(Boolean).join(" ");
      ```
- [ ] Create **`portal/src/components/ui/button/Button.tsx`** — variants `primary` |
      `outline`, sizes `sm` | `md`, `startIcon`/`endIcon`. **Fix:** ensure
      `onClick`/`type`/`disabled` are actually forwarded (the reference comments out
      `onClick` and only spreads `...rest`). Prefer forwarding native button props.
- [ ] Create **`portal/src/components/ui/form/Input.tsx`** — the `forwardRef` `Input`
      from the reference `InputField.tsx` (strip commented-out blocks on copy).
- [ ] Create **`portal/src/components/ui/form/Label.tsx`** — reference `Label`.
- [ ] Create **`portal/src/components/ui/modal/Modal.tsx`** — reference `Modal` (backdrop,
      Escape-to-close, body scroll lock, close button). Single modal shell reused by all
      modal surfaces.
- [ ] Create **`portal/src/components/ui/badge/Badge.tsx`** — reference `Badge`
      (variants/colors) for AI Approval Status and optional score/state badges.
- [ ] Create **`portal/src/components/ui/LoadingDots.tsx`** (or equivalent) — small
      loading indicator; also reused by `DescriptionModal` (Phase 5).
- [ ] Rewrite all vendored imports to `@/components/ui/...`, `@/context/...`, etc.
- [ ] Restyle **`portal/src/components/RssSearchForm.tsx`** — keep the single `query`
      controlled input → `submitSearch()`, and `resetDemo()` (cancel run, stop polling,
      `postReset("all")`, clear slices) **exactly**. Wrap in a reference-style form card
      (`rounded-2xl border bg-white dark:bg-white/[0.03] ...`). Use vendored `Label` +
      `Input`. "Search RSS" = `Button variant="primary"` (keep lucide `Search`), disabled
      while `isLoading || !query.trim()`. "Reset Demo" = `Button variant="outline"` (keep
      `RotateCcw`). Preserve `error` and `truncated` notices, restyled as token-based
      alerts (error → `error-*`, info → `gray/brand`). Do **not** add reference's extra
      fields, URL card, or add-to-DB table.

### Phase 3 verification
- [ ] `npm run lint`, `npm run type-check`, `npm run build` pass.
- [ ] Dev run (port 8011): the search form renders in the card style in both themes;
      **Search RSS submits a query** (loads the table) and **Reset Demo works**
      (cancels/clears as before); disabled state behaves; error/truncated notices render.
- [ ] If anything fails, fix before proceeding.
- [ ] Check off completed tasks; **commit** (referencing TODO Phase 3).

---

## Phase 4 — Article table (TanStack rebuild)

> Plan §6.2, §6.3, §11(4). **Adapt** (do not import) the reference
> `TableReviewArticles.tsx` patterns; Lite's `Article` type
> (`portal/src/types/index.ts`) is simpler.

- [ ] Add **`@tanstack/react-table`** (dependency) to `package.json` + normal install.
- [ ] Rebuild **`portal/src/components/ArticleTable.tsx`** as a TanStack table:
  - [ ] Row models: `getCoreRowModel`, `getSortedRowModel`, `getFilteredRowModel`.
        **Do NOT** add `getPaginationRowModel` (no pagination, PRD Q3).
  - [ ] State: `sorting` (`SortingState`) and `globalFilter` (string) **only**. No
        `columnFilters`, `columnVisibility`, or `pagination`.
  - [ ] Controls bar: a single **global search `<input>`** (reference styling). No
        page-size buttons, no `ColumnVisibilityDropdown`, no state-filter dropdown.
  - [ ] Header rendering: clickable `th` with `getToggleSortingHandler()` and `▲`/`▼`
        indicators via `getIsSorted()`.
  - [ ] Columns (exact order) via `createColumnHelper<Article>()`:
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
  - [ ] Empty/loading states: keep "Run a search to load articles…" / "No articles
        found…", restyled inside the new card.
- [ ] Remove expandable rows: delete the `onClick → toggleExpanded` row behavior and the
      `ArticleExpandedRow` usage. **Delete `portal/src/components/ArticleExpandedRow.tsx`.**
- [ ] **Delete `portal/src/components/ArticleRow.tsx`** if no longer referenced after the
      rebuild (fold into TanStack column defs).
- [ ] In `portal/src/store/articlesSlice.ts`: remove `expandedIds` + `toggleExpanded`
      **iff** nothing else references them — **grep first**; if other code/tests use them,
      leave the action and just stop dispatching it.
- [ ] Restyle **`portal/src/components/ScoreBubble.tsx`** — keep the explanation-fetch
      behavior (`apiClient.getExplanation(articleId, stage)` →
      `dispatch(setSelectedExplanation(...))`), and after dispatch **open the explanation
      modal** (the new `ui` flag from Phase 5; if Phase 5 lands after, wire the open call
      then). Restyle `.score-bubble` → token-based badge/bubble. Preserve the guard that
      `pending`/`running`/`skipped` are non-interactive/disabled. Keep Lite's score
      formatting (`0.00`/status text — do not switch to `%`); ensure contrast in both
      themes.

### Phase 4 verification
- [ ] `npm run lint`, `npm run type-check`, `npm run build` pass.
- [ ] `npm test` — update any tests asserting old markup/`toggleExpanded`; keep green.
- [ ] Dev run (port 8011): run a search; table shows the exact 7 columns in order with
      "AI Assigned State"; **sortable headers** (▲/▼) and the **global search box** filter
      correctly; **no** pagination/visibility/state-filter; no expandable rows; score
      bubbles/badges render with contrast in both themes.
- [ ] If anything fails, fix before proceeding.
- [ ] Check off completed tasks; **commit** (referencing TODO Phase 4).

---

## Phase 5 — Modals (explanation + description)

> Plan §7, §11(5). Replaces the inline `ArticleExpandedRow` "selected explanation" panel.
> **No backend change** — `DescriptionModal` uses the existing
> `apiClient.getArticle(articleId)` and `GET /api/articles/:id` as-is.

- [ ] Extend **`portal/src/store/uiSlice.ts`** additively (Plan §7.2):
  - [ ] Add to `UiState`: `isExplanationModalOpen: boolean` and
        `descriptionModalArticleId: string | null` (or a single discriminated
        `activeModal` — implementer discretion).
  - [ ] Add actions: `openExplanationModal`, `closeExplanationModal`,
        `openDescriptionModal(articleId)`, `closeDescriptionModal`.
  - [ ] Keep `setSelectedExplanation` / `clearSelectedExplanation`. On close, clear the
        open flag (and optionally the selected explanation).
  - [ ] **Additive only** — no existing action semantics change. Check
        `portal/src/store/index.ts` persist whitelist/blacklist; new keys must default
        cleanly on rehydration. Optionally mark modal flags non-persisted.
- [ ] Create **`portal/src/components/ExplanationModal.tsx`** (on vendored `Modal`) —
      reads `state.ui.selectedExplanation` + the open flag; renders stage title,
      `reasoning ?? finalReasoning ?? finalStatus`, confidence, and `promptInput` (in a
      `<pre>`/scroll area). Used by Location Score, Semantic Score, AI Assigned State, and
      AI Approval Status cells.
- [ ] Create **`portal/src/components/DescriptionModal.tsx`** (on vendored `Modal`):
  - [ ] Read `descriptionModalArticleId`; find the in-state article in
        `state.articles.items` for the immediate fallback (`description`, `url`, `source`).
  - [ ] **Fetch the full article via `apiClient.getArticle(articleId)`** (the snapshot
        builder strips `scraping.body`/`scrapingSource`/`scrapedAt` from Redux — Plan
        §0.1, §7.1). Fetch **when the modal opens**, and **re-fetch when the scraping
        stage completes** while open (trigger: `descriptionModalArticleId` set **and**
        in-state `pipeline.scraping.status === "complete"`).
  - [ ] Keep the fetched article in **local component state**, not Redux.
  - [ ] Narrow the response locally (do not loosen `apiClient` or widen shared `Article`):
        ```ts
        type ScrapedArticle = Article & {
          pipeline: Article["pipeline"] & {
            scraping?: { status?: string; body?: string; scrapingSource?: string; scrapedAt?: string };
          };
        };
        ```
        Read `pipeline.scraping.body`/`scrapingSource`/`scrapedAt` defensively (all
        optional).
  - [ ] Layout: header = title + source; primary body = scraped `pipeline.scraping.body`
        when present else RSS `description`; meta = open-article link (`scrapingSource`
        or `url`) and `scrapedAt` when present; `LoadingDots` while the fetch is pending
        (fallback text still visible).
  - [ ] **Fallback chain (must degrade gracefully):** in-flight → loading + in-state
        `description`/`url`; success with body → scraped body + source/timestamp; success
        without body, or fetch error → fall back to in-state `description` + `url` +
        `source`. Never block the description on a failed fetch.
- [ ] Mount both modals once in `ClientShell` (or `PipelinePage`); cells dispatch the open
      actions. Wire `ScoreBubble` (Phase 4) to call `openExplanationModal` after its
      dispatch. Cells with no meaningful content (pending/running/skipped, empty
      description) are non-interactive/disabled — mirror the `ScoreBubble` guard. (The
      Description cell may still open to show the RSS description before scraping
      completes.)

### Phase 5 verification
- [ ] `npm run lint`, `npm run type-check`, `npm run build` pass.
- [ ] `npm test` — add/adjust a `DescriptionModal` test mocking `apiClient.getArticle`
      (scraped-body success path **and** fetch-failure fallback path). Keep green.
- [ ] Dev run (port 8011): each clickable cell opens the right content/reasoning —
      Location/Semantic Score and AI Assigned State and AI Approval Status open the
      explanation modal; Description opens the description modal. After a run completes,
      the **scraped body appears** in the Description modal; with a forced fetch failure it
      **falls back** to description/url. Verify in both themes.
- [ ] If anything fails, fix before proceeding.
- [ ] Check off completed tasks; **commit** (referencing TODO Phase 5).

---

## Phase 6 — Remaining chrome (pipeline panel, modal, toasts, prompts)

> Plan §6.4–§6.7, §11(6). All visual-only — preserve behavior and copy.

- [ ] **`portal/src/components/OrchestrationPanel.tsx`** — rename the visible heading
      **"Orchestration" → "Analysis Pipeline"** (PRD Q9). Keep the component filename,
      `orchestrationSlice`, and API paths unchanged. Preserve `overallProgress`,
      `currentStage`, per-stage `stageStatuses`, Start Run (`startRun`, disabled when no
      articles/active), Stop Run (`cancelRun`, `cancellationPending`), `pollError` and
      `cancelled` notices. Restyle panel, progress bar (replace `<progress>` with a
      token-styled bar or restyle it), stage chips (`Badge`/token chips), buttons
      (vendored `Button`). Stays in the right column.
- [ ] **`portal/src/components/FirstLaunchModal.tsx`** — re-implement on vendored `Modal`
      + `Button`s; keep `choose(isFirstTime)` logic, focus management intent, copy, and
      the `firstLaunchAnswered` gate unchanged.
- [ ] **`portal/src/components/ToastArea.tsx`** — keep `aria-live`, the toast list from
      `state.ui.toasts`, and `dismissToast`. Restyle tones (info / error / rate-limit →
      `warning-*`) with token classes; keep the dismiss button behavior.
- [ ] **`portal/src/components/ApproverPromptsPage.tsx`** and
      **`portal/src/components/StateAssignerPromptsPage.tsx`** — styling-only migration to
      tokens/primitives (`Label`, `Input`/textarea styling, `Button`, `Badge`, token
      cards). **No** change to load/apply/reset/draft logic or copy. The inner
      hazard-prompt expand/collapse stays functionally as-is; restyle only. The
      `"Read-only - sourced from NewsNexus12 defaults"` line stays **verbatim**.

### Phase 6 verification
- [ ] `npm run lint`, `npm run type-check`, `npm run build` pass.
- [ ] `npm test` — update any tests asserting old chrome markup; keep green.
- [ ] Dev run (port 8011): pipeline panel reads "Analysis Pipeline", Start/Stop/progress
      still work; FirstLaunchModal renders in new style with unchanged behavior; toasts
      (info/error/rate-limit) render and dismiss; both `/prompts/*` pages render in new
      style with unchanged behavior and copy. Verify in both themes.
- [ ] Confirm **no orphaned bespoke selectors** remain (`.shell`, `.panel`, `.toolbar`,
      `.chip`, `.modal*`, `.toast*`, `.notice`, `.prompt-page`, etc. — all migrated).
- [ ] If anything fails, fix before proceeding.
- [ ] Check off completed tasks; **commit** (referencing TODO Phase 6).

---

## Phase 7 — Verify, self-containment, accept

> Plan §1.3, §8, §11(7), §13. Final gate before the work is "done."

- [ ] `npm run lint` (`--max-warnings=0`), `npm run type-check`, `npm run build`,
      `npm test` all pass clean.
- [ ] Full manual run (port 8011) in **both light and dark**: search → table (sort +
      global search) → modals (explanation + description, incl. scraped body after a run)
      → pipeline run (Start/Stop/progress) → toasts → FirstLaunch → both prompts pages.
      Theme toggle persists across reload. Badges/scores legible in both themes.
- [ ] Run the **self-containment checks (§0.3)** — all six must pass:
  - [ ] Check 1: cross-repo import/path-escape grep returns nothing.
  - [ ] Check 2: triage grep returns nothing (only allowed product text / required copy
        remain).
  - [ ] Check 3: no escaping symlinks.
  - [ ] Check 4: no workspace/package dep on the full app (only the new deps allowed:
        `@tailwindcss/postcss`, `@tanstack/react-table`, and `tailwind-merge` if used).
  - [ ] Check 5: no service calls to NewsNexus12 (URLs resolve to Lite API 8010/8011).
  - [ ] Check 6: **build-with-sibling-absent smoke test** — temporarily rename/remove the
        sibling `NewsNexus12` directory; `npm run build` **and** `npm run dev` succeed;
        restore the sibling afterward.
- [ ] Confirm PRD §8 acceptance criteria 1–11 are satisfied (Plan §13 acceptance mapping).
- [ ] Confirm hard constraints (§0.2) held: no backend/API/demo/lockfile changes; no
      unrelated files touched; `uiSlice` change additive only.
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
except additive `uiSlice`, session/orchestration flows, demo constraints, lockfiles.

## Appendix B — Phase → PRD acceptance criteria map (PRD §8)

| Phase | PRD §8 criteria covered |
|---|---|
| 1 | 3 (Outfit/tokens), 10 (build/type/lint foundation) |
| 2 | 1 (theme toggle + persistence), 2 (TopBar logo + RightSidebar), 3 (tokens/contrast) |
| 3 | 4 (single-query form card) |
| 4 | 5 (TanStack sort + global search, no extras), 6 (exact columns, "AI Assigned State") |
| 5 | 7 (modals replace expandable rows, incl. scraped body via `getArticle`) |
| 6 | 8 (Analysis Pipeline), 9 (FirstLaunch/Toasts/prompts restyled, behavior unchanged) |
| 7 | 10 (TanStack added, zero NewsNexus12 coupling, clean build), 11 (no backend/lockfile changes) |
