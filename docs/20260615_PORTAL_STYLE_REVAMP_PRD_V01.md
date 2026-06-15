---
created_at: 2026-06-15
updated_at: 2026-06-15
created_by: claude (opus-4.8)
modified_by: claude (opus-4.8)
source_questions: docs/20260615_PORTAL_STYLE_REVAMP_QUESTIONS_V01.md
status: ready-for-implementation
---

# Portal Style Revamp — PRD (V01)

## 1. Summary

Restyle the existing **`NewsNexus12Lite/portal`** to match the look and feel of
**`NewsNexus12/portal`** (TailAdmin / Tailwind v4, full design-token system, Outfit
font, dark/light theme). This is a **visual + table revamp of existing
functionality** — it does **not** change Lite's backend, API contracts, search
behavior, orchestration pipeline, or demo constraints.

The work modifies the current Lite portal in place. It does **not** create a new app
and does **not** introduce any runtime dependency on `NewsNexus12`; any reference UI
that is reused is **copied/vendored** into Lite so the project stays fully
self-contained.

This PRD is derived from Nick's answers in
`docs/20260615_PORTAL_STYLE_REVAMP_QUESTIONS_V01.md` and is implementation-ready.
**No code is written by this document** — it is the spec for that work.

---

## 2. Goals

- Lite portal visually matches the NewsNexus12 portal (colors, spacing, typography,
  components) in both **light and dark** themes.
- A top bar header with the NewsNexus logo is added, the existing RightSidebar is
  preserved and restyled, and a working theme toggle is provided.
- The article table is rebuilt on **TanStack Table** with sortable headers and a
  global search box.
- Score / state / approval / description content is surfaced through **modals**
  (replacing the current expandable-row pattern).
- The portal chrome (sidebar, pipeline panel, modals, toasts, prompts pages) is
  restyled to one coherent system with sufficient contrast in both themes.

## 3. Non-goals / Out of scope

- **No backend/API changes** to `/api/rss/search`, the orchestration endpoints, the
  prompts endpoints, or the explanation endpoint.
- **No change to the demo constraints**: no-login session, 10-article cap, rate
  limits, Reset Demo, immediate search-and-process flow.
- **No "Add to Database" / row-selection flow** (the reference's select-then-add
  interaction is explicitly excluded).
- **No five-field query form**; Lite keeps its single `query` input.
- **No pagination / page-size selector, no column-visibility dropdown, no per-column
  state filter dropdown.**
- **No behavioral change to the `/prompts/*` pages** — styling-only migration.
- No new product features beyond the styling/table/modal work described here.

---

## 4. Decisions captured (from Nick's answers)

| # | Topic | Decision |
|---|-------|----------|
| Q1 | Form fields | **Style only.** Keep Lite's single `query` input and existing `POST /api/rss/search` behavior; render it in the reference's card / `Label` / `Input` / `Button` style. |
| Q2 | Add-to-DB flow | **Preserve Lite's behavior.** Search loads the table directly; keep Reset Demo + pipeline run. No add-to-database step. |
| Q3 | Table chrome | Sortable headers **yes**; global search **yes**; pagination/page-size **no**; column-visibility **no**; state filter dropdown **no**. Rename the "Assigned State" column to **"AI Assigned State"**. |
| Q4 | Rows / explanations | **No expandable rows.** Make scores, AI Assigned State, AI Approval Status, and Description **clickable to open a modal** that shows the additional content (article description / scraped article and the LLM reasoning for the score / assignment / approval). |
| Q5 | Columns | Keep the exact column set and order; rename "Assigned State" → "AI Assigned State". Prefer the **NewsNexus12/portal colors** (they already pair with the light/dark themes); ensure sufficient contrast. |
| Q6 | Theme + nav | Keep RightSidebar **and** add a **top bar header** with the NewsNexus logo (`logoAndNameRound.png` from NewsNexus12 `portal/public/images/`). Port the **full** TailAdmin token set. Adopt the **Outfit** font. |
| Q7 | Restyle scope | *(Answer left blank.)* **Assumption — restyle the whole portal chrome (Option A).** See §5. |
| Q8 | Dependencies | **Copy/vendor** the needed reference UI primitives into Lite; do **not** share anything at runtime with NewsNexus12. Add `@tanstack/react-table`. |
| Q9 | Out of scope / extras | Rename the **"Orchestration"** section to **"Analysis Pipeline"**. Keep it to the **right** of the form/table. When the RightSidebar is open it **may overlap** the Analysis Pipeline section. |

---

## 5. Resolved assumptions (where an answer was blank or inferable)

1. **Q7 — restyle scope (answer was blank).** Adopt **Option A: restyle the whole
   Lite portal chrome to the TailAdmin system.** Rationale: Q6 requires replacing the
   bespoke CSS variables in `globals.css` with the full TailAdmin token set, which
   would leave every existing bespoke class (`.shell`, `.right-sidebar`, `.panel`,
   `.modal`, `.toast`, `.prompt-page`, `.btn`, `.chip`, …) orphaned unless migrated.
   Q8 ("copy as much … to make this look the same") and Q9 (rename + reposition the
   pipeline panel) both presuppose chrome-wide restyling. A single coherent look with
   no orphaned CSS is therefore the only internally consistent outcome.

2. **Theme toggle placement.** Q6's original recommendation (toggle in the
   RightSidebar) was written before Nick confirmed he also wants a **top bar header**.
   With a header present, place the **`ThemeToggleButton` in the top bar header**
   (matching the reference portal), aligned to the right end of the bar near the logo
   area. The RightSidebar keeps the nav links only.

3. **Restyle is visual-only.** All chrome migrations (sidebar, pipeline panel,
   FirstLaunchModal, ToastArea, prompts pages) change **styling/markup classes only**;
   their existing Redux wiring, behavior, and copy are preserved.

---

## 6. Detailed requirements

### 6.1 Design-token & theme system

- Replace the bespoke `:root` variables in
  `portal/src/app/globals.css` with the **full TailAdmin `@theme` token block** copied
  from the NewsNexus12 portal `globals.css`: brand palette (`--color-brand-*` centered
  on `#465fff`), gray scale, success/error/warning scales, theme shadows, and any
  supporting tokens. Include the `@custom-variant dark` (the `.dark` class on `<html>`)
  setup.
- Adopt the **Outfit** font (load via `next/font` or the same mechanism the reference
  uses) and set it as the base font family, replacing the current
  `Arial, Helvetica, sans-serif`.
- Add a **`ThemeProvider`/`ThemeContext`** (copied/adapted from the reference) that:
  - toggles the `.dark` class on the `<html>` element,
  - persists the choice to `localStorage`,
  - exposes a hook for the toggle button.
  - Wire the provider in `portal/src/app/layout.tsx` (or `ClientShell.tsx`) so it wraps
    the app. It must coexist with the existing Redux `Provider` + `PersistGate`.
- Score/badge colors must use the reference token scales (success/warning/error/gray)
  and must meet legibility/contrast in **both** themes (Nick's explicit requirement).

### 6.2 Layout & chrome

- **Top bar header (new):** a fixed/sticky header across the top containing the
  **NewsNexus logo** and the **theme toggle** (right side).
  - Copy the logo asset `logoAndNameRound.png` from NewsNexus12
    `portal/public/images/logoAndNameRound.png` into Lite at
    `portal/public/images/logoAndNameRound.png`. Lite must serve its own copy — no
    cross-project reference.
  - Render it with `next/image`.
- **RightSidebar (preserved + restyled):** keep the existing nav links
  (`Pipeline`, `AI Approver Prompts`, `State Assigner Prompts`) and the
  responsive open/close toggle behavior wired to `toggleResponsiveSidebar`. Restyle to
  TailAdmin tokens. The active-link treatment uses the brand color.
- **Layout shell:** adjust `.shell` / page padding so content clears the new top bar
  and the RightSidebar. The page must remain responsive (preserve the existing
  ≤960px breakpoint behavior, re-expressed in the new system).
- **Analysis Pipeline panel positioning:** the panel remains in the **right column**,
  to the right of the form + table (current `page-grid` two-column layout). When the
  RightSidebar is open it is allowed to **overlap** the Analysis Pipeline panel
  (RightSidebar is `position: fixed`; no layout reflow is required to avoid overlap).

### 6.3 Search form (`RssSearchForm`)

- Keep the **single `query` input** and the existing submit → `submitSearch()` and
  **Reset Demo** behaviors exactly as today (including the `truncated`/error notices
  and rate-limit handling).
- Restyle the form to match the reference `/articles/get/google-rss` **form card**
  visual style using vendored `Label`, `Input`, and `Button` primitives. The "Search
  RSS" button is the primary/brand button; "Reset Demo" is the secondary/neutral
  button. Keep the lucide icons (or the reference equivalents).
- Do **not** add the reference's extra fields, URL-display card, or Add-to-Database
  table.

### 6.4 Article table (`ArticleTable`) — TanStack rebuild

- Add **`@tanstack/react-table`** to `portal/package.json` dependencies. (Do not
  hand-edit lockfiles; the implementer installs normally.)
- Rebuild `ArticleTable` as a **TanStack Table** with:
  - **Sortable headers** with ascending/descending indicators (▲/▼) matching the
    reference.
  - A **global search box** that filters across the visible columns.
  - **No** pagination, page-size selector, column-visibility dropdown, or state-filter
    dropdown.
- **Columns (exact set and order):**
  1. **Title**
  2. **Source**
  3. **Description**
  4. **Location Score**
  5. **AI Assigned State**  *(renamed from "Assigned State")*
  6. **Semantic Score**
  7. **AI Approval Status**
- **No expandable rows.** Remove the `ArticleExpandedRow` expansion pattern and the
  row-level `toggleExpanded` click behavior from the table (the `expandedIds` state
  may be removed if unused after migration).
- **Score / badge rendering:** Location Score and Semantic Score render as the
  reference-style colored bubbles/badges; AI Approval Status renders as a reference
  colored badge; AI Assigned State renders as text or a neutral badge. All colors come
  from the reference token scales with adequate contrast in both themes. The leading
  `rowStatus` chip behavior may be preserved as a small status indicator on the Title
  cell (visual-only) or dropped if it conflicts with the new design — implementer's
  discretion, but keep it consistent with the reference look.
- Empty/loading states (`Run a search to load articles…` / `No articles found…`)
  are preserved, restyled.

### 6.5 Clickable cells → modals (replaces expandable rows)

Make the following cells clickable to open a **modal** showing the additional content
(Q4, Option B). Reuse the existing data plumbing — there is no new backend:

- **Description cell:** opens a modal showing the full **article description** (and the
  scraped article body / link when available from the article record).
- **Location Score cell** and **Semantic Score cell:** open a modal showing the
  **LLM reasoning** for that score, via the existing
  `apiClient.getExplanation(articleId, stage)` →
  `state.ui.selectedExplanation` flow (reasoning, confidence, prompt input, etc.).
- **AI Assigned State cell:** opens a modal showing the **state-assignment reasoning**
  (`stateAssigner` explanation).
- **AI Approval Status cell:** opens a modal showing the **approval reasoning**
  (`aiApprover` explanation — `reasoning` / `finalReasoning` / `finalStatus`).
- The modal uses the vendored reference **`Modal`** primitive, styled with the new
  tokens. It replaces the inline `ArticleExpandedRow` "selected explanation" panel.
- Cells that have no meaningful content yet (pending/running/skipped stages) should be
  non-interactive or clearly disabled, matching the current `ScoreBubble` guard
  behavior.

### 6.6 Analysis Pipeline panel (`OrchestrationPanel`)

- **Rename the section heading from "Orchestration" to "Analysis Pipeline"** (Q9).
  (Rename the visible label; renaming the component file/identifiers is optional and at
  the implementer's discretion since it is not user-visible — keep the Redux slice
  names and API paths unchanged.)
- Preserve all behavior: overall progress, current stage, per-stage status list,
  Start Run / Stop Run controls, poll-error and cancelled notices.
- Restyle the panel, progress bar, stage chips, and buttons to the TailAdmin system.
- Keep it in the right column (see §6.2).

### 6.7 Remaining chrome (visual-only migration)

- **`FirstLaunchModal`** — migrate to the vendored `Modal` + buttons; keep the
  first-launch logic and copy unchanged.
- **`ToastArea`** — restyle toasts (info / error / rate-limit tones) with the new
  tokens; keep the dismiss behavior and `aria-live` region.
- **`/prompts/approver` and `/prompts/state-assigner` pages**
  (`ApproverPromptsPage`, `StateAssignerPromptsPage`) — **styling-only** migration to
  the new tokens / primitives. No change to their save/reset behavior or copy.

### 6.8 Vendored primitives & dependencies

- **Copy/vendor** the reference UI primitives needed for the new look into Lite (e.g.
  `Label`, `Input`, `Button`, `Modal`, `LoadingDots`/loading indicator,
  `ThemeToggleButton`, `ThemeContext`). Place them under
  `portal/src/components/ui/` (or a similar Lite-local path) and fix imports so nothing
  resolves into NewsNexus12.
- Add **`@tanstack/react-table`** to `portal/package.json`.
- Do **not** add a runtime dependency on, symlink to, or import from the NewsNexus12
  project. Lite remains self-contained.
- Do not hand-edit `package-lock.json` / lockfiles or touch unrelated files.

---

## 7. Affected files (change map)

New / copied:

- `portal/public/images/logoAndNameRound.png` — copied logo asset.
- `portal/src/components/ui/*` — vendored primitives (`Button`, `Input`, `Label`,
  `Modal`, `ThemeToggleButton`, loading indicator, etc.).
- `portal/src/components/TopBar.tsx` (or similar) — new top bar header.
- Theme context/provider module (e.g. `portal/src/components/ThemeProvider.tsx` or
  `portal/src/context/ThemeContext.tsx`).

Modified:

- `portal/src/app/globals.css` — replace bespoke vars with full TailAdmin token set +
  dark variant + Outfit.
- `portal/src/app/layout.tsx` — Outfit font, top bar, theme provider wiring.
- `portal/src/components/ClientShell.tsx` — mount ThemeProvider + TopBar; keep Redux
  provider/persist/sidebar/modal/toast.
- `portal/src/components/RssSearchForm.tsx` — restyle to reference form card.
- `portal/src/components/ArticleTable.tsx` — TanStack rebuild (sorting + global
  search; rename column).
- `portal/src/components/ArticleRow.tsx` — fold into TanStack column defs / cell
  renderers; remove expansion click.
- `portal/src/components/ScoreBubble.tsx` — restyle to reference badge; keep
  explanation fetch; used as a clickable cell trigger.
- `portal/src/components/ArticleExpandedRow.tsx` — **removed** (replaced by modals).
- `portal/src/components/OrchestrationPanel.tsx` — rename heading to "Analysis
  Pipeline"; restyle.
- `portal/src/components/RightSidebar.tsx` — restyle; remove theme toggle role (now in
  top bar) if any.
- `portal/src/components/FirstLaunchModal.tsx`, `ToastArea.tsx`,
  `ApproverPromptsPage.tsx`, `StateAssignerPromptsPage.tsx` — visual-only migration.
- `portal/src/store/uiSlice.ts` — may extend for the description/explanation modal
  state if needed (reuse `selectedExplanation`; add a description-modal field only if
  required).
- `portal/package.json` — add `@tanstack/react-table`.

Unchanged (must not be altered behaviorally): all API routes/clients
(`lib/apiClient.ts`, `lib/constants.ts`), all slices' logic, session/orchestration
flows, demo constraints.

---

## 8. Acceptance criteria

1. Lite portal renders in **both light and dark themes**; a working theme toggle lives
   in the **top bar header** and persists across reloads.
2. A **top bar header** shows the NewsNexus logo (served from Lite's own
   `public/images/`); the **RightSidebar** nav is preserved and restyled.
3. Colors/typography visibly match the NewsNexus12 portal; the **Outfit** font is in
   use; all badges/scores have adequate contrast in both themes.
4. The search form keeps the **single query** input and existing search + Reset Demo
   behavior, styled like the reference form card.
5. The article table is a **TanStack** table with **sortable headers** and a **global
   search box**, and **no** pagination/page-size/column-visibility/state-filter.
6. Columns are exactly: Title, Source, Description, Location Score, **AI Assigned
   State**, Semantic Score, AI Approval Status — in that order.
7. There are **no expandable rows**. Clicking Description, Location Score, AI Assigned
   State, Semantic Score, and AI Approval Status opens a **modal** with the relevant
   content/LLM reasoning, sourced from the existing endpoints.
8. The right-column panel is titled **"Analysis Pipeline"**, stays to the right of the
   form/table, and is allowed to be overlapped by the RightSidebar when open. All its
   run controls/progress behavior still work.
9. FirstLaunchModal, ToastArea, and both `/prompts/*` pages render in the new style
   with unchanged behavior.
10. `@tanstack/react-table` is added; **no** runtime import from NewsNexus12 exists;
    the Lite portal builds, type-checks, and lints clean.
11. No backend/API/demo-constraint behavior changed; no unrelated files or lockfiles
    hand-edited.

---

## 9. Risks & notes

- **Token migration breakage:** swapping `globals.css` tokens will break any class not
  migrated. The whole-chrome scope (§5.1) is mandatory to avoid orphaned styling — do
  not migrate the form/table only.
- **Logo asset:** the implementer must have read access to NewsNexus12
  `portal/public/images/logoAndNameRound.png` to copy it. If unavailable at build time,
  flag it; the file must end up committed inside Lite.
- **Theme toggle location** is an inference (§5.2). If Nick prefers the toggle in the
  RightSidebar instead of the top bar, that is a one-line placement change.
- **`rowStatus` chip** treatment in the new table is left to implementer discretion
  within the reference visual language (§6.4).
