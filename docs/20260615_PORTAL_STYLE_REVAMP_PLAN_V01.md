---
created_at: 2026-06-15
updated_at: 2026-06-15
created_by: claude (opus-4.8)
modified_by: claude (opus-4.8)
source_prd: docs/20260615_PORTAL_STYLE_REVAMP_PRD_V01.md
source_questions: docs/20260615_PORTAL_STYLE_REVAMP_QUESTIONS_V01.md
status: ready-for-implementation
---

# Portal Style Revamp — Implementation Plan (V01)

## 0. How to read this document

This is the **implementation plan** for the portal style revamp. It is the source of
truth for *how* the work in
`docs/20260615_PORTAL_STYLE_REVAMP_PRD_V01.md` will be built — the technology,
architecture, data flow, key components/functions, sequencing, and integration
strategy. The PRD remains the source of truth for *what* and *why*; where this plan
and the PRD disagree, the PRD wins and this plan should be corrected.

This is **not** a checkbox TODO. A separate, granular TODO/task list will be derived
from this plan as the next step. No application code, lockfiles, or unrelated files
are modified by this document.

---

## 1. Nature of the work and implementation boundaries

### 1.1 This is web-app frontend work

The entire revamp lives inside the Next.js **`portal/`** app (Next 16 / React 19 /
Redux Toolkit + redux-persist / Tailwind v4). It is a **client-rendered, browser UI**
change: design tokens, theming, layout chrome, a TanStack-based table, and modal
interactions. There is **no backend, API, or pipeline code** in scope. The Express/API
side of Lite, the orchestration engine, the demo session model, the rate limits, and
the 10-article cap are all **untouched**; the portal continues to talk to the exact
same endpoints through the existing `lib/apiClient.ts`.

Because it is a browser UI, "done" means it **renders and behaves correctly in the
browser in both light and dark themes** — not merely that it type-checks. Verification
must include running the portal (`npm run dev` in `portal/`, port 8011) and exercising
search → table → modal → pipeline in both themes, in addition to `lint`, `type-check`,
and `build`.

### 1.2 Who implements (Fable first, Codex only if needed)

- **Frontend implementation starts with Claude Fable.** Fable does the build-out
  described here.
- **If Claude reaches its usage limit before the work is complete, Codex may finish
  it — but only per Nick's latest instruction at that time.** Codex must continue from
  the same plan/TODO, preserve the boundaries in §2, and not redesign the approach.
- Whoever implements must keep the work reviewable: small, coherent commits aligned to
  the phases in §11, no drive-by edits to unrelated files, and no lockfile hand-edits
  (dependencies are added by editing `package.json` and running a normal install).

### 1.3 Self-containment boundary (hard constraint)

Lite **may copy/vendor** UI primitives, CSS tokens, and the logo asset from
`NewsNexus12/portal`, but the result must be **fully self-contained**:

- **No runtime imports** from `NewsNexus12` (no `import ... from "../../NewsNexus12/..."`).
- **No symlinks, no absolute paths, no `..`-escapes** out of the Lite repo.
- **No service calls** to NewsNexus12, and **no shared node_modules / workspace links**.
- Every vendored file is **physically copied** into `portal/src/...` (or
  `portal/public/...`) and its imports rewritten to Lite-local paths.
- The only "dependency" relationship allowed is **at authoring time** (a human/agent
  reads the reference and copies code); the built artifact has zero knowledge of
  NewsNexus12.

A concrete acceptance check for this: `grep -r "NewsNexus12" portal/src` returns
nothing, and the portal builds with the `NewsNexus12` directory absent.

---

## 2. What must NOT change (behavioral invariants)

These are preserved exactly; the revamp is visual/structural only.

- **API surface & client:** `lib/apiClient.ts`, `lib/constants.ts`, and all endpoint
  paths/shapes (`/api/rss/search`, `/api/orchestration/runs*`,
  `/api/articles/:id/explanations/:stage`, `/api/demo/*`, `/api/prompts`).
- **Redux logic:** `rssSearchSlice`, `articlesSlice`, `orchestrationSlice`,
  `promptsSlice`, `sessionSlice`, and `uiSlice` reducers/thunks keep their behavior.
  `uiSlice` may be **extended** (new fields/actions) but existing actions keep their
  semantics. Slice names and persisted keys stay stable so redux-persist rehydration
  is unaffected.
- **Demo constraints:** no-login session bootstrap (`initSession`), 10-article cap +
  `truncated` notice, rate-limit handling (`RateLimitError`, `Retry-After`), Reset
  Demo, FirstLaunch flow, immediate search-and-process flow (no add-to-DB step).
- **Search semantics:** single `query` string → `POST /api/rss/search`.
- **Prompts pages behavior:** `/prompts/approver` and `/prompts/state-assigner`
  save/reset/draft logic and copy are unchanged (styling-only).
- **Column set/order** (only the *label* "Assigned State" → "AI Assigned State"
  changes).

---

## 3. Technology decisions

| Concern | Decision | Notes |
|---|---|---|
| Styling system | **Tailwind v4 utility classes + TailAdmin `@theme` token block** | Replaces the bespoke `:root` vars + hand-written classes in `globals.css`. |
| Theming | **`.dark` class on `<html>` + `@custom-variant dark` + React `ThemeContext`** | Vendored/adapted from reference; localStorage-persisted. |
| Font | **Outfit via `next/font/google`** | No new npm dep (built into `next`). Replaces `Arial, Helvetica`. |
| Table | **`@tanstack/react-table` v8** | New dependency. Sorting + global filter only. |
| Class merging | **`tailwind-merge`** (vendored primitives use it) | New dependency *or* inline a tiny local `cn()` helper to avoid the dep — see §4.2. |
| UI primitives | **Vendored copies** of `Button`, `Input`, `Label`, `Modal`, `Badge`, loading indicator, `ThemeToggleButton` | Placed under `portal/src/components/ui/`. |
| Icons | Keep **`lucide-react`** (already a dep) | Reference's inline SVGs may be kept where copied verbatim (e.g. toggle/close icons). |

### 3.1 Critical prerequisite — Tailwind v4 PostCSS pipeline is missing in Lite

**Finding:** Lite's `portal/package.json` lists `tailwindcss ^4.0.0` as a devDep and
`globals.css` starts with `@import "tailwindcss"`, but Lite has **no
`@tailwindcss/postcss` plugin and no `postcss.config.mjs`**. The current Lite UI is
plain CSS that does not rely on Tailwind utilities, so this gap is invisible today.
The revamp depends entirely on Tailwind utility classes (every vendored primitive and
the new chrome use them), so **the Tailwind v4 build pipeline must be wired up first or
nothing will render**.

Required setup (mirrors the reference):

1. Add devDependency **`@tailwindcss/postcss`** (matching the v4 major).
2. Add **`portal/postcss.config.mjs`**:
   ```js
   const config = { plugins: { "@tailwindcss/postcss": {} } };
   export default config;
   ```
3. Keep `@import "tailwindcss";` at the top of `globals.css` (it already is).
4. Confirm `npm run build` compiles utility classes (a smoke check: apply a
   `bg-brand-500` somewhere and verify it renders).

This is the first thing to validate; treat it as Phase 1 gate (see §11).

### 3.2 Dependencies to add (via `package.json`, normal install — no lockfile edits)

- `@tanstack/react-table` (dependency).
- `@tailwindcss/postcss` (devDependency) — see §3.1.
- `tailwind-merge` (dependency) **only if** vendored primitives keep `twMerge`;
  otherwise replace `twMerge(...)` calls with a 3-line local `cn()` helper and skip
  this dep. **Recommendation:** add `tailwind-merge` for a faithful, low-risk copy of
  the reference primitives.

---

## 4. Architecture & general flow

### 4.1 Provider/render tree (target)

```
RootLayout (app/layout.tsx)            ← Outfit font class on <body>; imports globals.css
  └─ ClientShell ("use client")
       └─ <Provider store>             ← existing Redux
            └─ <PersistGate>           ← existing redux-persist
                 └─ <ThemeProvider>    ← NEW: vendored ThemeContext (.dark on <html>)
                      ├─ <InitSession/> ← existing
                      ├─ <TopBar/>      ← NEW: logo + ThemeToggleButton
                      ├─ <main class="shell"> {children} </main>
                      ├─ <RightSidebar/> (restyled)
                      ├─ <FirstLaunchModal/> (restyled)
                      ├─ <ToastArea/> (restyled)
                      └─ <ExplanationModal/> + <DescriptionModal/>  ← NEW (or one shared modal)
```

`ThemeProvider` must sit **inside** `PersistGate` (it is a client UI concern) but can
wrap everything below it. It is independent of Redux; theme state lives in React
context + localStorage, matching the reference. (Do **not** route theme through
redux-persist — keep it isolated to avoid touching persisted state shape.)

**SSR/hydration note:** the reference defaults theme to `"light"` and applies `.dark`
in an effect after mount, which can cause a one-frame flash. Acceptable for this demo
and keeps parity with the reference. If a flash is objectionable, add a tiny
inline pre-hydration script in `layout.tsx` that reads `localStorage.theme` and sets
the class before paint (optional, implementer discretion).

### 4.2 Vendored UI primitives

Create `portal/src/components/ui/` and copy/adapt from the reference:

- `ui/button/Button.tsx` — variants `primary` | `outline`, sizes `sm` | `md`,
  `startIcon`/`endIcon`. **Fix:** the reference component comments out `onClick` and
  spreads `...rest`; ensure `onClick`/`type`/`disabled` are actually forwarded so the
  Search/Reset/Start/Stop buttons work. Prefer forwarding native button props.
- `ui/form/Input.tsx` — the `forwardRef` `Input` from the reference
  `InputField.tsx` (strip the large commented-out block when copying).
- `ui/form/Label.tsx` — reference `Label` (uses `twMerge`; see §3.2).
- `ui/modal/Modal.tsx` — reference `Modal` (backdrop, Escape-to-close, body scroll
  lock, close button). This is the single modal shell reused by all modal surfaces.
- `ui/badge/Badge.tsx` — reference `Badge` (variants/colors) for AI Approval Status
  and optional score/state badges.
- `ui/ThemeToggleButton.tsx` — reference toggle button (sun/moon SVGs), wired to
  `useTheme()`.
- A small **loading indicator** (`ui/LoadingDots.tsx` or equivalent) if needed for the
  table/empty states.
- `context/ThemeContext.tsx` — reference `ThemeProvider` + `useTheme` (rename console
  noise out; keep behavior).

If a primitive pulls in helpers (`tailwind-merge`, etc.), either vendor the dep (§3.2)
or inline a local `cn()`:
```ts
export const cn = (...c: Array<string | false | null | undefined>) =>
  c.filter(Boolean).join(" ");
```

### 4.3 Design-token & theme layer (`globals.css`)

Replace the bespoke `:root` variables and all hand-written classes with the **full
TailAdmin `@theme` block** copied from the reference `globals.css`:

- `@import "tailwindcss";`
- `@custom-variant dark (&:is(.dark *));`
- The complete `@theme { ... }` token set: brand (`--color-brand-*` on `#465fff`),
  gray, success/error/warning/orange/blue-light scales, theme text sizes, breakpoints,
  shadows (`--shadow-theme-*`, `--shadow-focus-ring`), z-index tokens, and
  `--font-outfit`.
- The `@layer base` border-compat + `body { @apply ... bg-gray-50 ... }` block.
- Only the **menu-item** `@utility` rules needed for the sidebar nav (others, e.g.
  flatpickr/fullcalendar/apexcharts/swiper blocks, are **not** copied — Lite has none
  of those libraries; copying them would be dead CSS).

The bespoke classes (`.shell`, `.right-sidebar`, `.panel`, `.toolbar`, `.table-wrap`,
`.btn`, `.chip`, `.score-bubble`, `.modal*`, `.toast*`, `.notice`, `.prompt-page`,
etc.) are **removed**. Per PRD §5.1 this is whole-chrome scope, so every consumer of
those classes is migrated in the same effort (§6) — no orphaned selectors remain.

---

## 5. Layout & chrome

### 5.1 TopBar (new) — `portal/src/components/TopBar.tsx`

- Sticky/fixed bar across the top. Contains:
  - **Logo** rendered with `next/image` from Lite's own
    `portal/public/images/logoAndNameRound.png` (copied from
    `NewsNexus12/portal/public/images/logoAndNameRound.png`). Serve Lite's copy only.
  - **`ThemeToggleButton`** at the right end.
  - Optionally the responsive sidebar toggle (hamburger) on small screens — see §5.2.
- Tailwind classes for height, border, `bg-white dark:bg-gray-900`, shadow, and
  `sticky top-0 z-...`. Use the token scales so contrast holds in both themes.

### 5.2 RightSidebar (preserved + restyled) — `RightSidebar.tsx`

- Keep the three nav links (`Pipeline`, `AI Approver Prompts`, `State Assigner
  Prompts`) and the `toggleResponsiveSidebar` open/close behavior wired to
  `state.ui.isResponsiveSidebarOpen`.
- Restyle to TailAdmin: `position: fixed` right column; active link uses the
  `menu-item-active` brand treatment; inactive uses `menu-item-inactive`.
- Remove the bespoke `.right-sidebar`/`.nav-link` classes; re-express the ≤960px
  (now `lg`/`md` breakpoint) responsive behavior in Tailwind. The theme toggle is
  **not** here (it moved to the TopBar per PRD §5.2).

### 5.3 Shell & page grid

- `app/layout.tsx`: add `Outfit` via `next/font/google`, apply its class to `<body>`,
  keep `import "./globals.css"`.
- `ClientShell.tsx`: mount `ThemeProvider` + `TopBar`; keep Redux provider, persist
  gate, `InitSession`, and the modal/toast mounts.
- Replace `.shell` padding so content clears the **TopBar height** (top) and the
  **RightSidebar width** (right), using Tailwind padding utilities with the responsive
  breakpoints.
- `PipelinePage.tsx`: re-express `.page-grid` as a Tailwind two-column grid
  (`minmax(0,1fr)` + fixed right column) collapsing to one column on small screens.

### 5.4 Analysis Pipeline panel positioning (PRD Q9)

- The pipeline panel stays in the **right column** of the page grid (right of
  form+table).
- The `RightSidebar` is `position: fixed`; when open it is **allowed to overlap** the
  Analysis Pipeline panel. No reflow/space-reservation is required to avoid overlap —
  this is the intended behavior, so do not add layout shifts to dodge it.

---

## 6. Component-by-component migration

### 6.1 Search form — `RssSearchForm.tsx`

- Keep the single `query` controlled input → `submitSearch()`; keep `resetDemo()`
  (cancel run, stop polling, `postReset("all")`, clear slices) **exactly**.
- Wrap in a reference-style **form card** (`rounded-2xl border bg-white
  dark:bg-white/[0.03] ...`). Use vendored `Label` + `Input` for the query field.
- "Search RSS" = vendored `Button variant="primary"` (keep lucide `Search` icon),
  disabled while `isLoading || !query.trim()`. "Reset Demo" = `Button variant="outline"`
  (keep `RotateCcw`).
- Preserve the `error` and `truncated` notices, restyled as token-based alert
  blocks (error → `error-*`, info → `gray/brand`). Do **not** add reference's extra
  fields, URL card, or add-to-DB table.

### 6.2 Article table — `ArticleTable.tsx` (TanStack rebuild)

Rebuild as a `@tanstack/react-table` table. **Adapt** (do not import) the reference
`TableReviewArticles.tsx` patterns; Lite's data model (`Article` in
`src/types/index.ts`) is different and much simpler.

- **Row models:** `getCoreRowModel`, `getSortedRowModel`, `getFilteredRowModel`.
  **Do NOT** add `getPaginationRowModel` (no pagination per PRD Q3).
- **State:** `sorting` (`SortingState`) and `globalFilter` (string) only. No
  `columnFilters`, no `columnVisibility`, no `pagination`.
- **Controls bar:** a single **global search `<input>`** (reference styling). No
  page-size buttons, no `ColumnVisibilityDropdown`, no state-filter dropdown.
- **Header rendering:** clickable `th` with `getToggleSortingHandler()` and the
  `▲`/`▼` indicator pattern from the reference (`getIsSorted()`).
- **Columns (exact order)** via `createColumnHelper<Article>()`:
  1. **Title** — `accessor("title")`; render the `rowStatus` indicator as a small
     leading badge on this cell (visual-only; PRD §6.4 leaves exact treatment to
     implementer within the reference look). Sortable.
  2. **Source** — `accessor("source")`. Sortable.
  3. **Description** — display/accessor; cell is a **clickable trigger** that opens the
     Description modal (§7). Show a truncated preview or an info affordance. Sortable
     on the description text.
  4. **Location Score** — accessor over
     `pipeline.locationScorer.score ?? .locationScore`; render via the restyled
     `ScoreBubble` (badge) and make it a modal trigger for `locationScorer` reasoning.
     Sort numerically with `sortUndefined: "last"`.
  5. **AI Assigned State** — accessor over `pipeline.stateAssigner.assignedState`;
     **renamed label** from "Assigned State". Clickable → state-assignment modal.
     Sortable.
  6. **Semantic Score** — accessor over
     `pipeline.semanticScorer.score ?? .semanticScore`; restyled `ScoreBubble`,
     modal trigger for `semanticScorer`. Numeric sort.
  7. **AI Approval Status** — accessor over
     `pipeline.aiApprover.finalStatus ?? .status`; render via vendored `Badge`
     (color mapped from status: approved→success, rejected→error,
     needs_review→warning, pending/running→gray/brand). Clickable → approval modal.
     Sortable.
- **Remove expandable rows:** delete the `onClick → toggleExpanded` row behavior and
  the `ArticleExpandedRow` usage; `ArticleExpandedRow.tsx` is deleted. The
  `expandedIds` state + `toggleExpanded` action in `articlesSlice` may be removed **iff**
  nothing else references them (grep first; if other code/tests use them, leave the
  action and just stop dispatching it).
- **Empty/loading states:** keep the two existing messages ("Run a search to load
  articles…" / "No articles found…"), restyled inside the new card.

### 6.3 ScoreBubble → clickable badge — `ScoreBubble.tsx`

- Keep the explanation-fetch behavior: `apiClient.getExplanation(articleId, stage)` →
  `dispatch(setSelectedExplanation(...))`. After dispatch, **open the explanation
  modal** (set a new `ui` flag — §7).
- Restyle from `.score-bubble` to a token-based badge/bubble (reference colored
  bubble look). Preserve the guard that `pending`/`running`/`skipped` are
  non-interactive/disabled (matches reference "no analysis → N/A" affordance).
- Keep score formatting (`score.toFixed(2)` or `%` — choose one and apply consistently;
  reference uses `%`, current Lite uses 2-decimals. **Recommendation:** keep Lite's
  `0.00`/status text to avoid implying a different scale, but render in the new bubble
  styling). Contrast must pass in both themes (PRD Q5).

### 6.4 Analysis Pipeline panel — `OrchestrationPanel.tsx`

- **Rename visible heading "Orchestration" → "Analysis Pipeline"** (PRD Q9). Keep the
  component filename, the Redux slice (`orchestrationSlice`), and API paths unchanged
  (renaming files/identifiers is optional and not user-visible).
- Preserve all behavior: `overallProgress`, `currentStage`, per-stage `stageStatuses`
  list, Start Run (`startRun`, disabled when no articles or active), Stop Run
  (`cancelRun`, `cancellationPending`), `pollError` and `cancelled` notices.
- Restyle panel, progress bar (replace `<progress>` with a token-styled bar or restyle
  it), stage chips (use `Badge`/token chips), and buttons (vendored `Button`).
- Stays in the right column (§5.4).

### 6.5 First-launch modal — `FirstLaunchModal.tsx`

- Re-implement on the vendored `Modal` + `Button`s; keep `choose(isFirstTime)` logic,
  focus management intent, copy, and the `firstLaunchAnswered` gate unchanged.

### 6.6 Toasts — `ToastArea.tsx`

- Keep `aria-live`, the toast list from `state.ui.toasts`, and `dismissToast`. Restyle
  tones (info / error / rate-limit) with token classes (e.g. rate-limit → `warning-*`).
  Keep dismiss button behavior.

### 6.7 Prompts pages — `ApproverPromptsPage.tsx`, `StateAssignerPromptsPage.tsx`

- **Styling-only** migration to tokens/primitives (`Label`, `Input`/textarea styling,
  `Button`, `Badge`, token cards). **No** change to load/apply/reset/draft logic or
  copy. The inner hazard-prompt expand/collapse stays as-is functionally; restyle only.

---

## 7. Clickable cells → modals (replaces expandable rows)

### 7.1 Data sources (reuse existing plumbing — no new backend)

- **Score / state / approval reasoning:** the existing
  `apiClient.getExplanation(articleId, stage)` →
  `state.ui.selectedExplanation` (`ScoreExplanation`: `reasoning`, `confidence`,
  `promptInput`, `assignedState`, `finalStatus`, `gateway`, `hazards`). Stages:
  `locationScorer`, `semanticScorer`, `stateAssigner`, `aiApprover`.
- **Description / scraped body:** already present on the `Article` record
  (`article.description`, `article.url`); no fetch required. (If a richer scraped body
  is wanted, `apiClient.getArticle(articleId)` exists and may be used — but it returns
  `unknown` today and is **not required**; default to the in-state description+url.)

### 7.2 UI state (extend `uiSlice` minimally)

Reuse `selectedExplanation` for reasoning modals; add **modal-open flags** so the modal
shell can mount/unmount cleanly without inferring open-state from data presence:

- Add to `UiState`: `isExplanationModalOpen: boolean` and `descriptionModalArticleId:
  string | null` (or a single discriminated `activeModal` field — implementer
  discretion). Add matching actions: `openExplanationModal`,
  `closeExplanationModal`, `openDescriptionModal(articleId)`, `closeDescriptionModal`.
- Keep `setSelectedExplanation` / `clearSelectedExplanation`. On modal close, clear the
  open flag (and optionally the selected explanation).
- These are **additive**; no existing action semantics change, and the persisted shape
  change is benign (new keys default cleanly on rehydration). If you prefer zero
  changes to persisted state, mark these fields non-persisted via the existing persist
  config — verify the current `store/index.ts` persist whitelist/blacklist before
  deciding.

### 7.3 Modal components

Prefer **one reusable explanation modal** + **one description modal**, both built on the
vendored `Modal`:

- `ExplanationModal.tsx` — reads `state.ui.selectedExplanation` and the open flag;
  renders stage title, reasoning (`reasoning ?? finalReasoning ?? finalStatus`),
  confidence, and `promptInput` (in a `<pre>`/scroll area). Used by Location Score,
  Semantic Score, AI Assigned State, and AI Approval Status cells.
- `DescriptionModal.tsx` — reads `descriptionModalArticleId`, finds the article in
  `state.articles.items`, shows `description` + `url` (open-article link) + source.
- Both mounted once in `ClientShell` (or `PipelinePage`); cells dispatch open actions.
- Cells with no meaningful content (pending/running/skipped stages, empty description)
  are non-interactive/disabled — mirror the current `ScoreBubble` guard.

This **fully replaces** the inline `ArticleExpandedRow` "selected explanation" panel.

---

## 8. Self-containment & asset handling (recap of boundary work)

- Copy `logoAndNameRound.png` into `portal/public/images/`. Reference with
  `next/image` and a Lite-relative `/images/logoAndNameRound.png` path.
- All vendored TSX/CSS live under `portal/src/...`; rewrite every import to
  `@/components/ui/...`, `@/context/...`, etc. (Lite uses the `@/*` path alias — verify
  in `tsconfig.json`).
- After vendoring, run `grep -r "NewsNexus12" portal/` (excluding `node_modules`) — it
  must be empty. The portal must build with the sibling `NewsNexus12` directory
  removed/renamed.

---

## 9. Integration strategy

- **Token swap is the breaking pivot.** Replacing `globals.css` removes every bespoke
  class at once, so the chrome migration (§6) must land **together** with the token
  swap, not before/after in isolation — otherwise the app renders unstyled mid-way.
  Sequence it as one coherent branch with the phasing in §11, verifying after each
  phase by running the app.
- **Redux untouched conceptually:** the only store change is the additive `uiSlice`
  modal state (§7.2). Confirm `store/index.ts` persist config tolerates the new keys.
- **API client untouched:** no changes to `apiClient`/`constants`. All new UI reads
  existing slices/selectors.
- **Type safety:** new column accessors and modal components must satisfy the existing
  `Article` / `ScoreExplanation` types. Extend `src/types/index.ts` only if a genuinely
  new shape is needed (avoid if possible).
- **Tests:** Lite has Jest + Testing Library configured (`src/test/`,
  `styleMock.js`). Existing tests that assert on bespoke classes or the
  expandable-row/`toggleExpanded` behavior will break and must be updated to the new
  markup/modal interaction. Keep `npm test` green (`--passWithNoTests` is set, but
  don't silently delete meaningful tests).

---

## 10. Key files (change map)

**New / copied**

- `portal/postcss.config.mjs` — Tailwind v4 PostCSS plugin (prerequisite §3.1).
- `portal/public/images/logoAndNameRound.png` — copied logo.
- `portal/src/components/ui/*` — vendored `Button`, `Input`, `Label`, `Modal`,
  `Badge`, loading indicator, `ThemeToggleButton`.
- `portal/src/context/ThemeContext.tsx` — vendored ThemeProvider + `useTheme`.
- `portal/src/components/TopBar.tsx` — new top bar.
- `portal/src/components/ExplanationModal.tsx`, `DescriptionModal.tsx` — new modals.

**Modified**

- `portal/package.json` — add `@tanstack/react-table`, `@tailwindcss/postcss`
  (dev), and `tailwind-merge` (if used).
- `portal/src/app/globals.css` — full TailAdmin token set + dark variant + Outfit; drop
  bespoke CSS.
- `portal/src/app/layout.tsx` — Outfit font on `<body>`.
- `portal/src/components/ClientShell.tsx` — mount ThemeProvider, TopBar, modals.
- `portal/src/components/PipelinePage.tsx` — Tailwind grid; mount modals if not in shell.
- `portal/src/components/RssSearchForm.tsx` — form-card restyle.
- `portal/src/components/ArticleTable.tsx` — TanStack rebuild.
- `portal/src/components/ScoreBubble.tsx` — token badge + opens modal.
- `portal/src/components/OrchestrationPanel.tsx` — rename heading + restyle.
- `portal/src/components/RightSidebar.tsx` — restyle; no toggle here.
- `portal/src/components/FirstLaunchModal.tsx`, `ToastArea.tsx`,
  `ApproverPromptsPage.tsx`, `StateAssignerPromptsPage.tsx` — visual-only.
- `portal/src/store/uiSlice.ts` — additive modal state (§7.2).
- `portal/src/store/articlesSlice.ts` — remove `expandedIds`/`toggleExpanded` **iff**
  unused.

**Removed**

- `portal/src/components/ArticleExpandedRow.tsx`.
- `portal/src/components/ArticleRow.tsx` — folded into TanStack column defs (delete if
  no longer referenced after the rebuild).

**Untouched** — all API routes/clients, slice logic (except additive `uiSlice`),
session/orchestration flows, demo constraints, lockfiles.

---

## 11. Suggested build phases (for the TODO that follows)

1. **Pipeline + tokens gate.** Add `@tailwindcss/postcss` + `postcss.config.mjs`;
   swap `globals.css` to the TailAdmin token block + dark variant; add Outfit in
   `layout.tsx`. Smoke-test a utility class renders, and dark variant toggles. *(App
   chrome will look broken until Phase 2 — expected.)*
2. **Theme + shell.** Vendor `ThemeContext` + `ThemeToggleButton`; build `TopBar`
   (logo + toggle); wire ProviderTree in `ClientShell`; restyle `RightSidebar`, shell
   padding, and page grid. App should look coherent in both themes.
3. **Primitives + form.** Vendor `Button`/`Input`/`Label`/`Badge`/`Modal`; restyle
   `RssSearchForm`. Verify search + Reset Demo still work.
4. **Table.** Add `@tanstack/react-table`; rebuild `ArticleTable` (sorting + global
   search; renamed column; restyled `ScoreBubble`/`Badge`); remove expandable-row code.
5. **Modals.** Extend `uiSlice`; build `ExplanationModal` + `DescriptionModal`; wire
   clickable cells. Verify each cell opens the right content/reasoning.
6. **Remaining chrome.** Restyle `OrchestrationPanel` (rename → "Analysis Pipeline"),
   `FirstLaunchModal`, `ToastArea`, both `/prompts/*` pages.
7. **Verify & clean.** `lint`, `type-check`, `build`, `test`; manual run in both
   themes; `grep -r NewsNexus12 portal/` empty; confirm acceptance criteria (PRD §8).

---

## 12. Risks & mitigations

- **Tailwind pipeline missing (high).** Without §3.1 nothing styles. Mitigation:
  Phase 1 gate before any UI work.
- **Token swap breaks all chrome (high, expected).** Mitigation: whole-chrome scope in
  one branch; phase-by-phase verification by running the app.
- **Vendored `Button` swallows `onClick` (med).** The reference comments out `onClick`.
  Mitigation: ensure native button props (`onClick`/`type`/`disabled`) are forwarded.
- **redux-persist shape drift (med).** New `uiSlice` keys. Mitigation: additive only;
  verify persist whitelist/blacklist; optionally exclude modal flags from persistence.
- **Existing tests assert old markup/`toggleExpanded` (med).** Mitigation: update tests
  alongside the migration; keep `npm test` green.
- **Logo read access (low).** Implementer needs read access to the reference PNG to
  copy it; the file must end up committed inside Lite. Flag if unavailable.
- **Theme flash on first paint (low).** Reference behavior; optional pre-hydration
  script if undesirable (§4.1).
- **Dark-mode contrast (low/med).** PRD requires legible badges/scores in both themes;
  verify score bubbles, status badges, and notices against the gray/success/error/
  warning scales in both modes.

---

## 13. Acceptance mapping

Each PRD §8 criterion is satisfied by: theme toggle in TopBar + persistence (§4.1,
§5.1); TopBar logo + restyled RightSidebar (§5); Outfit + token parity + contrast
(§4.3, §6.3); single-query form card (§6.1); TanStack table with sort + global search,
no pagination/visibility/state-filter (§6.2); exact column order with "AI Assigned
State" (§6.2); modals replacing expandable rows (§7); "Analysis Pipeline" right-column
panel with overlap allowed (§5.4, §6.4); restyled FirstLaunchModal/Toasts/prompts
(§6.5–6.7); `@tanstack/react-table` added + zero NewsNexus12 runtime coupling + clean
build/type/lint (§3, §8); no backend/API/demo/lockfile changes (§2).
</content>
</invoke>
