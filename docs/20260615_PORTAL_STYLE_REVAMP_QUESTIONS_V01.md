---
created_at: 2026-06-15
updated_at: 2026-06-15
created_by: claude (opus-4.8)
modified_by: claude (opus-4.8)
---

# Portal Style Revamp — Open Questions (V01)

## Purpose

This document captures the product and technical decisions that must be resolved
**before** a PRD can be written for restyling `NewsNexus12Lite/portal` to match the
look and feel of `NewsNexus12/portal`. Nick: please write your decision under each
**Answer** subsection. Where I have a recommendation, it is noted as
"(Recommended)".

## Context (what I inspected)

**Lite portal today** (`NewsNexus12Lite/portal`):
- Next.js 16 / React 19 / Redux Toolkit + redux-persist / Tailwind v4.
- Styling is **plain CSS** in `src/app/globals.css` using bespoke class names
  (`.shell`, `.toolbar`, `.btn`, `.table-wrap`, `.chip`, `.score-bubble`, …) and
  CSS variables (`--blue`, `--green`, `--amber`, `--red`). **No Tailwind utility
  classes are actually used**, and there is **no dark/light theme**.
- Main page (`/`) = `PipelinePage`: a single-input `RssSearchForm` ("Google RSS
  Query" + Search RSS + Reset Demo) above an `ArticleTable`, with an
  `OrchestrationPanel` in the right column.
- `RssSearchForm` posts a **single `query` string** to `POST /api/rss/search`.
- `ArticleTable` is a hand-rolled `<table>` (no TanStack), columns: **Title,
  Source, Description, Location Score, Assigned State, Semantic Score, AI Approval
  Status**. Rows are click-to-expand (`ArticleExpandedRow`) and score cells use
  clickable `ScoreBubble` components that fetch per-stage explanations.
- Chrome: `RightSidebar` nav, `FirstLaunchModal`, `ToastArea`, `OrchestrationPanel`.
- `@tanstack/react-table` is **not** currently a dependency.

**Reference portal** (`NewsNexus12/portal`, TailAdmin-based):
- Tailwind v4 with a full `@theme` token system in `globals.css` (brand palette
  `--color-brand-*` centered on `#465fff`, plus gray/success/error/warning scales,
  theme shadows, Outfit font).
- Dark/light theme via `ThemeContext` (`.dark` class on `<html>`, persisted to
  `localStorage`), toggled by `ThemeToggleButton`.
- `/articles/get/google-rss` form has **five fields** (AND Keywords, AND Exact
  Phrases, OR Keywords, OR Exact Phrases, Time Range), a Request button, a
  URL-display card, and a select-then-"Add to Database" table flow. Uses
  `Label`, `Input`, `Button`, `Modal` UI primitives.
- `TableReviewArticles.tsx` is a TanStack table with sorting (clickable headers
  with ▲/▼), pagination, page-size selector (5/10/20), global search box, a
  `ColumnVisibilityDropdown`, a per-column state filter dropdown, colored
  score bubbles, and conditional columns.

## Recommendation on approach

**Modify the existing `NewsNexus12Lite/portal` — do not create a new app.** The Lite
portal already wires up the Redux store, session bootstrap, API client, slices,
polling, and the demo's isolation constraints. The request is a **style + table
revamp of existing functionality** ("keep the same Lite columns and
functionality"), not a new feature surface. A new app would duplicate all of that
plumbing for no benefit and risk diverging from the demo constraints. The revamp is
a contained set of changes: add the theme system + brand tokens to `globals.css`,
add a `ThemeProvider` + toggle, restyle the form, and replace `ArticleTable` with a
TanStack table. The questions below determine the exact scope.

---

## 1. Form fields: adopt the reference's five-field query, or restyle the existing single input?

The reference `/articles/get/google-rss` form has five inputs (AND Keywords, AND
Exact Phrases, OR Keywords, OR Exact Phrases, Time Range). The Lite form has one
`query` string and the Lite backend (`POST /api/rss/search`) accepts only
`{ query, language?, region? }`. Matching the reference's **fields** (not just its
visual style) would require backend/API changes that are out of scope for a styling
task and may conflict with the demo's rate-limit/10-article constraints.

Options:
- **(A) Style only (Recommended):** Keep Lite's single `query` input and existing
  search behavior, but render it in the reference's card/`Label`/`Input`/`Button`
  visual style. No backend change.
- **(B) Full five-field form:** Reproduce the reference's five inputs and wire a new
  backend contract. Requires API + pipeline changes (separate effort).
- **(C) Visual five-field layout, mapped to existing backend:** Show the five fields
  but compose them into the single `query` string client-side.

### Answer



---

## 2. "Add to Database" select flow vs. Lite's immediate search-and-process

The reference form fetches candidate articles, lets the user check rows, and then
"Add to Database". Lite instead loads articles directly into the table and then runs
the orchestration pipeline (`Reset Demo`, `OrchestrationPanel`). Should the revamp:
- **(A) Preserve Lite's existing behavior (Recommended):** search loads the table
  directly; keep Reset Demo + pipeline run; no row-selection/add-to-db step.
- **(B) Introduce the reference's select + "Add to Database" interaction** (changes
  Lite's product flow and backend).

### Answer



---

## 3. How much table chrome from `TableReviewArticles` should be carried over?

The request says "same sorting and header functions" and "table functionality." The
reference table includes several features beyond sorting. Which should the Lite table
include? (Select all that apply.)
- Clickable sortable headers with ▲/▼ indicators — **assumed required** by the
  request.
- Pagination + page-size selector (5/10/20).
- Global search box.
- `ColumnVisibilityDropdown` (show/hide columns).
- Per-column state filter dropdown (reference filters on AI-assigned state).
- Reference row-coloring rules (e.g., approved = green row).

Recommendation: include sortable headers, pagination + page-size, and global search
(the core "table functionality"); treat column-visibility as nice-to-have; **omit**
the state filter dropdown unless Nick wants it, since Lite's "Assigned State" column
semantics differ.

### Answer



---

## 4. Preserve Lite's expandable rows + clickable ScoreBubble explanations, or adopt the reference's modal pattern?

Lite rows expand in place (`ArticleExpandedRow`) and score cells open per-stage
explanations via `ScoreBubble`. The reference table has no expandable rows; it uses
clickable score cells/buttons that open modals. The request says keep Lite
**functionality** but adopt the reference **style/table functionality**.
- **(A) Keep Lite's expandable row + explanation behavior (Recommended)**, restyled
  with brand tokens and rendered within the TanStack row model.
- **(B) Replace expansion with reference-style colored score bubbles + modals.**
- **(C) Keep expansion AND adopt reference colored score bubbles for the score cells.**

### Answer



---

## 5. Column mapping — confirm the Lite columns and how each is rendered

The request says keep Lite's columns: **Title, Source, Description, Location Score,
Assigned State, Semantic Score, AI Approval Status**. Please confirm:
- Keep this exact column set and order? (Recommended: yes.)
- Render Location Score / Semantic Score as the reference's circular colored
  percentage bubbles (green-scale), or keep Lite's existing `ScoreBubble` look?
- Render "AI Approval Status" as text (current behavior) or as a reference-style
  colored badge?
- Add the reference's row-status chip (Lite's `rowStatus`) as a leading visual, and
  if so where?

### Answer



---

## 6. Theme system: full TailAdmin token port, and where does the theme toggle live?

The reference relies on a large `@theme` token block (brand/gray/success/error/
warning scales, theme shadows, Outfit font) plus a `ThemeContext` + `.dark` class +
`ThemeToggleButton`. To get "same colors" and dark/light theme in Lite we need to:
- Port the brand + supporting color tokens and `@custom-variant dark` into Lite's
  `globals.css` (replacing the current bespoke CSS variables).
- Add a `ThemeProvider` (localStorage-persisted) and a visible toggle control.
- Optionally adopt the Outfit font.

Questions:
- Port the **full** TailAdmin token set (Recommended, for exact color parity), or a
  **minimal subset** (brand + gray + status colors only)?
- Where should the theme toggle live in the Lite UI? The Lite portal has a
  `RightSidebar` but no top bar. (Recommended: a toggle button in the
  `RightSidebar`.)
- Adopt the Outfit font to match the reference? (Recommended: yes.)

### Answer



---

## 7. Scope of restyle — only the form + table, or the whole Lite portal chrome?

The request targets the main page form and the bottom table. The Lite portal also
has `RightSidebar`, `OrchestrationPanel`, `FirstLaunchModal`, `ToastArea`, and the
two `/prompts/*` pages — all currently using the bespoke CSS. If we replace
`globals.css` tokens with the TailAdmin system, those surfaces will lose their
current styling unless they are migrated too.
- **(A) Restyle the whole portal chrome to TailAdmin (Recommended for consistency):**
  larger effort, single coherent look, no orphaned bespoke CSS.
- **(B) Restyle only the form + table; keep the rest on the existing CSS:** smaller
  effort, but two visual systems coexist and shared globals must be kept side-by-side.

### Answer



---

## 8. Dependencies and UI primitives — vendor the reference components or rebuild minimally?

Implementing the reference look needs `@tanstack/react-table` (new dependency) and
the reference's `Label`, `Input`, `Button`, `Modal`, `LoadingDots`,
`ColumnVisibilityDropdown` primitives. The reference forbids runtime coupling to
NewsNexus12, but **copying** component source is allowed under the demo's isolation
rules.
- **(A) Copy/vendor the needed UI primitives into Lite (Recommended)** so Lite stays
  self-contained, adjusting imports.
- **(B) Build slimmer Lite-specific equivalents** matching the visual style.
- Confirm adding `@tanstack/react-table` to Lite's `package.json` is approved.

### Answer



---

## 9. Anything explicitly out of scope?

Please confirm these are **out of scope** for this revamp (Recommended: yes to all):
- Backend/API changes to `/api/rss/search` or the pipeline.
- Changing demo constraints (no-login, 10-article cap, rate limits).
- Restyling/altering the `/prompts/*` page **behavior** (styling-only migration is
  covered by Q7).

### Answer


