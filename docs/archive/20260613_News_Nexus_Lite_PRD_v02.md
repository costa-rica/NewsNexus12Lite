---
title: NewsNexus Lite Product Requirements Document
version: v02
created_at: 2026-06-13
supersedes: 20260613_News_Nexus_Lite_PRD.md (v01)
note: v02 incorporates decisions from the 2026-06-13 intent review (right sidebar, single State Assigner prompt, expandable AI Approver hazard table, Postgres-backed defaults with a copy script from NewsNexus12, and a clarified persistence model).
---

# NewsNexus Lite Product Requirements Document (v02)

## 1. Overview

NewsNexus Lite is a simplified, interactive web demonstration of the NewsNexus article-processing pipeline. It lets users run a Google RSS query, view up to 10 resulting articles, and watch each article progress through scraping, location scoring, state assignment, semantic scoring, and AI approval.

The application is demo-first. There are no user accounts. To keep the demo realistic without hand-authoring content, NewsNexus Lite uses a small Postgres database that holds read-only default prompts and seed fixtures, which are populated by a one-time copy script that pulls prompt content from the NewsNexus12 database. All user-initiated changes during a visit (prompt edits, search results, scores, approvals, and orchestration progress) remain session-only and never mutate the durable defaults. Resetting restores the session to those defaults.

## 1a. Changes from v01

1. Navigation sidebar moves from the left side to the right side.
2. The AI State Assigner prompt page uses a single prompt field plus read-only supporting details rather than separate prompt and output-rules fields.
3. The AI Approver prompt page presents a gateway prompt section at the top and an expandable table of hazard-specific prompts below, with three hazard types.
4. NewsNexus Lite gains a Postgres datastore for read-only defaults and fixtures, plus a copy script that seeds prompts from NewsNexus12.
5. The persistence model is clarified into two layers: durable read-only defaults in Postgres, and session-only user state.
6. Clicking an article expands the row in place to reveal its scores and details; this inline expansion replaces the separate detail-panel pattern from v01.

## 2. Goals

| ID | Goal |
| --- | --- |
| G-001 | Demonstrate the end-to-end NewsNexus article-processing workflow in a compact interactive UI. |
| G-002 | Make pipeline progress visible in real time as article fields populate stage by stage. |
| G-003 | Explain scoring and AI decisions through clickable, color-coded score bubbles. |
| G-004 | Allow temporary session-only prompt edits for AI Approver and AI State Assigner prompts. |
| G-005 | Provide a resettable demo experience with predictable default data and prompts seeded from NewsNexus12. |

## 3. Non-Goals

| ID | Non-Goal |
| --- | --- |
| NG-001 | User authentication, authorization, teams, or account management. |
| NG-002 | Permanent storage of user prompt edits, user article results, or per-user orchestration history. Durable storage is limited to shared read-only defaults and fixtures. |
| NG-003 | Full NewsNexus production parity, including all pipeline branches and admin workflows. |
| NG-004 | Bulk processing beyond the demo limit of 10 visible articles. |
| NG-005 | Editorial publishing, article export, billing, or notification workflows. |
| NG-006 | Writing back to or modifying the NewsNexus12 database. The copy script is read-only against NewsNexus12. |

## 4. Assumptions

| ID | Assumption |
| --- | --- |
| A-001 | The demo backend can fetch or simulate Google RSS query results. |
| A-002 | The system may use mocked scoring/approval output when live model access is unavailable. |
| A-003 | Session state lives in browser memory or session storage; durable defaults live in Postgres. |
| A-004 | Resetting demo data restores default prompts and fixtures and clears current articles, scores, approvals, and orchestration state. |
| A-005 | The UI should remain useful if some pipeline stages are slower, fail, or return partial output. |
| A-006 | A copy script can read prompt content from NewsNexus12 and seed it into the Lite Postgres database. The exact NewsNexus12 prompt schema mapping must be confirmed (see Open Questions). |

## 5. Personas

| Persona | Need |
| --- | --- |
| Product evaluator | Understand what NewsNexus does without setup or account creation. |
| Internal stakeholder | See the pipeline stages, outputs, and reasoning in a transparent demo. |
| Prompt reviewer | Temporarily adjust prompts and compare how outputs change during the current session. |
| Engineer | Use implementation-ready API, state, and orchestration expectations to build the demo. |

## 6. User Stories

| ID | User Story |
| --- | --- |
| US-001 | As a first-time user, I want to reset demo data on launch so I start from a clean default experience. |
| US-002 | As a returning session user, I want to continue with current session state so I do not lose in-progress demo results. |
| US-003 | As a user, I want to enter a Google RSS query so I can load relevant articles for processing. |
| US-004 | As a user, I want to see up to 10 articles in a table so the demo remains focused and scannable. |
| US-005 | As a user, I want to start orchestration and watch each stage animate so I understand the processing sequence. |
| US-006 | As a user, I want article columns and the expanded row to populate progressively so I can see real-time processing. |
| US-007 | As a user, I want to click an article row to expand it and inspect stage outputs as they arrive. |
| US-008 | As a user, I want to click score bubbles so I can understand reasoning, confidence, and prompt outputs. |
| US-009 | As a prompt reviewer, I want to temporarily edit AI Approver gateway and hazard prompts so I can test relevance and hazard behavior. |
| US-010 | As a prompt reviewer, I want to temporarily edit the State Assigner prompt so I can test assignment behavior. |
| US-011 | As a user, I want to reset prompts to defaults so I can recover from experimental edits. |
| US-012 | As a user, I want failed stages to be visible and recoverable so the demo does not silently stall. |

## 7. Functional Requirements

### 7.1 First-Launch Modal

| ID | Requirement |
| --- | --- |
| FR-001 | On application launch, display a modal asking: "Is this your first time?" |
| FR-002 | The modal must provide `Yes` and `No` actions. |
| FR-003 | Selecting `Yes` must reset session demo data, orchestration state, and editable prompts to the seeded defaults. |
| FR-004 | Selecting `No` must continue with the current session state. |
| FR-005 | The modal must block interaction with the application until the user selects `Yes` or `No`. |
| FR-006 | The application must record that the modal was answered for the current page lifecycle/session to avoid repeated prompts during normal navigation. |

### 7.2 Main Page Layout

| ID | Requirement |
| --- | --- |
| FR-010 | The main page must include a right sidebar navigation area. |
| FR-011 | The top content area must include a Google RSS Query search form similar to the existing NewsNexus interface. |
| FR-012 | The center content area must include an article table showing up to 10 articles, with rows that expand in place. |
| FR-013 | An orchestration control panel must be visible alongside the table. |
| FR-014 | The layout must support desktop use as the primary viewport and gracefully collapse for narrower screens. |

### 7.3 Google RSS Query Search

| ID | Requirement |
| --- | --- |
| FR-020 | The search form must accept a query string. |
| FR-021 | The search form should support optional query controls such as date range, region, language, or result count when available. |
| FR-022 | Submitting the search must fetch or generate article results and replace the current session article list. |
| FR-023 | The table must display no more than 10 articles from the returned result set. |
| FR-024 | A new search must clear prior article-level processing outputs unless the user explicitly continues an existing run. |
| FR-025 | Search errors must be displayed inline without clearing the last successfully loaded results unless the request intentionally started a new empty state. |

### 7.4 Article Table and Expanding Rows

| ID | Requirement |
| --- | --- |
| FR-030 | The article table must include columns: Title, Source, Description button, Location Score, Assigned State, Semantic Score, and AI Approval Status. |
| FR-031 | Clicking an article row must expand it in place to show article details and scores, without navigating away. |
| FR-032 | The Description button must open or expand the article description from within the table. |
| FR-033 | Score and status columns and the expanded score area must begin empty, pending, or placeholder until their pipeline stage completes. After the initial search and before orchestration, no scores exist. |
| FR-034 | Location Score must populate after the Location Scorer stage completes for the article. |
| FR-035 | Assigned State must populate after the State Assigner stage completes for the article. |
| FR-036 | Semantic Score must populate after the Semantic Scorer stage completes for the article. |
| FR-037 | AI Approval Status must populate after the AI Approver stage completes for the article. |
| FR-038 | The table must show row-level processing states: pending, processing, complete, skipped, or failed. |

### 7.5 Expanded Row Detail

| ID | Requirement |
| --- | --- |
| FR-050 | The expanded row must show article metadata: title, source, description, URL when available, published date when available, and current processing status. |
| FR-051 | The expanded row must show scores and status outputs as they become available. |
| FR-052 | The expanded row must update progressively while orchestration is running. |
| FR-053 | The expanded row must show stage-level failures with error messages and retry eligibility when available. |
| FR-054 | Collapsing an expanded row must not destroy that article's loaded state. |

### 7.6 Orchestration Pipeline

| ID | Requirement |
| --- | --- |
| FR-040 | The orchestration pipeline must include exactly these visible stages in order: Scraping, Location Scorer, State Assigner, Semantic Scorer, AI Approver. |
| FR-041 | Users must be able to start a pipeline run from the orchestration panel. |
| FR-042 | Users should be able to stop or cancel an active run when backend support exists. |
| FR-043 | The orchestration panel must visually animate progress through each stage. |
| FR-044 | Stage indicators must show pending, running, complete, failed, and skipped states. |
| FR-045 | Users must see processing happen in real time through table updates, expanded-row updates, and orchestration progress. |
| FR-046 | As stages complete, table columns and expanded rows must populate without a full page reload. |
| FR-047 | A failed stage must not erase successfully completed outputs from prior stages. |
| FR-048 | The system must expose enough run status data for the frontend to calculate overall progress. |

### 7.7 Score Bubbles and Explanation Views

| ID | Requirement |
| --- | --- |
| FR-060 | Each score must be displayed as a color-coded clickable bubble. |
| FR-061 | Bubble colors must communicate result quality or confidence using a consistent scale. |
| FR-062 | Clicking a score bubble must reveal reasoning, explanation, confidence, and prompt outputs. |
| FR-063 | If a score is unavailable, the bubble area must show pending, skipped, failed, or not-applicable state. |
| FR-064 | Explanation content must identify which pipeline stage produced the score. |
| FR-065 | Prompt output display must distinguish prompt input, model output, and normalized system result when available. |

Recommended color scale:

| Value | Color Meaning |
| --- | --- |
| `>= 0.80` | High / positive / approved: green |
| `0.50 - 0.79` | Medium / needs review: amber |
| `< 0.50` | Low / rejected / weak match: red |
| `pending` | Processing: gray or animated neutral |
| `failed` | Error: red outline with error icon/text |

### 7.8 Sidebar Pages

| ID | Requirement |
| --- | --- |
| FR-070 | The right sidebar must include navigation to the main pipeline page. |
| FR-071 | The right sidebar must include an `AI Approver Prompts` page. |
| FR-072 | The right sidebar must include an `AI State Assigner Prompts` page. |
| FR-073 | Sidebar navigation must preserve current session state. |

### 7.9 Prompt Editing

| ID | Requirement |
| --- | --- |
| FR-080 | Users may temporarily edit AI Approver gateway and hazard prompts. |
| FR-081 | Users may temporarily edit the AI State Assigner prompt. |
| FR-082 | Prompt changes must be session-only and must not mutate the seeded defaults in Postgres. |
| FR-083 | Each prompt page must provide a reset action to restore that page's prompts to defaults. |
| FR-084 | The first-launch `Yes` reset must restore all prompts to defaults. |
| FR-085 | Prompt edit pages must indicate unsaved or session-modified prompt state. |
| FR-086 | Pipeline runs must use the current session prompt values at the time a stage begins. |

### 7.10 AI State Assigner Prompt Page

| ID | Requirement |
| --- | --- |
| FR-100 | The State Assigner page must present a single editable prompt field. |
| FR-101 | The page must show read-only supporting details associated with the prompt (for example, output rules, prompt identifier, or version metadata) sourced from the seeded NewsNexus12 data. |
| FR-102 | The page must show whether the current prompt is default or session-modified. |
| FR-103 | The page must provide a reset action that restores the default prompt. |

### 7.11 AI Approver Prompt Page and Architecture

| ID | Requirement |
| --- | --- |
| FR-090 | The AI Approver must run a Gateway Prompt first to evaluate article relevance. |
| FR-091 | If the Gateway Prompt determines the article is not relevant, hazard-specific prompts must not run for that article. |
| FR-092 | If the Gateway Prompt determines the article is relevant, hazard-specific prompts must execute. |
| FR-093 | Gateway results and hazard-specific results must be displayed separately. |
| FR-094 | AI Approval Status must be derived from gateway and hazard-specific outputs according to documented normalization rules. |
| FR-095 | The explanation view must show the gateway decision, gateway reasoning, hazard prompt outputs, and final approval normalization. |
| FR-096 | The AI Approver prompt page must present a gateway prompt section at the top and an expandable table of hazard-specific prompts below it. |
| FR-097 | The hazard table must contain three hazard types: chemical, wildfire, and severe weather. Each row must expand to reveal and edit that hazard's prompt text. |

## 8. UX Requirements

| ID | Requirement |
| --- | --- |
| UX-001 | The UI must make the pipeline sequence understandable at a glance. |
| UX-002 | Users must never need to refresh the page to see newly completed stage outputs. |
| UX-003 | Pending fields should use clear loading indicators or placeholder text. |
| UX-004 | Failed fields should be visible but should not dominate the entire page. |
| UX-005 | Score bubbles must be keyboard accessible and expose readable labels for assistive technology. |
| UX-006 | Prompt editors must support multiline text and preserve formatting during the session. |
| UX-007 | The orchestration panel should remain visible while users inspect the article table. |
| UX-008 | Expanding and collapsing a row must not destroy the selected article state. |
| UX-009 | The first-launch modal should be concise and avoid technical language. |
| UX-010 | Empty states must guide the user to run a search before orchestration. |

## 9. Page Wireframes

### 9.1 First-Launch Modal

```text
+------------------------------------------------------+
|                   NewsNexus Lite                     |
|                                                      |
|              Is this your first time?                |
|                                                      |
|  Start with a clean demo, or continue this session.  |
|                                                      |
|       +----------------+    +----------------+       |
|       | Yes, reset demo|    | No, continue   |       |
|       +----------------+    +----------------+       |
+------------------------------------------------------+
```

### 9.2 Main Page (sidebar on the right)

```text
+------------------------------------------------+----------------------+------------------+
| Google RSS Query                               | Orchestration        | Right Sidebar    |
| +------------------------------------------+   | Control Panel        |                  |
| | Query: wildfire chemical spill near ...  |   |                      | > Pipeline       |
| +------------------------------------------+   | [Start Run] [Stop]   |   AI Approver    |
| [Search RSS] [Reset Demo]                      |                      |   Prompts        |
|                                                | 1 Scraping       ... |   State Assigner |
| Article Table                                  | 2 Location Score ... |   Prompts        |
| +-------+--------+------+-----+-----+-----+---+ | 3 State Assign   ... |                  |
| |Title  |Source  |Desc. |Loc. |State|Sem. |AI | | 4 Semantic       ... |                  |
| +-------+--------+------+-----+-----+-----+---+ | 5 AI Approver    ... |                  |
| |A...   |AP      |[i]   |  .  |  .  |  .  | . | |                      |                  |
| | (row expands in place to show detail)    |   | Overall: 42%         |                  |
| |B...   |Local   |[i]   | 82  | TX  |  .  | . | | Current: Semantic    |                  |
| +-------+--------+------+-----+-----+-----+---+ |                      |                  |
+------------------------------------------------+----------------------+------------------+
```

### 9.3 Expanded Article Row

```text
+-----------------------------------------------------------------------------------+
| v Chemical plume reported near Houston facility                                    |
|   Source: Local News    Published: 2026-06-13    URL: open original                |
|   Description: Short article summary appears here...                                |
|                                                                                   |
|   Processing Timeline                                                              |
|   [done] Scraping -> [done] Location -> [running] State -> [pending] Semantic -> AI |
|                                                                                   |
|   Scores                                                                           |
|   +--------------+ +--------------+ +--------------+ +----------------+            |
|   | Location 0.88| | State pending| | Semantic --  | | AI pending     |            |
|   +--------------+ +--------------+ +--------------+ +----------------+            |
|                                                                                   |
|   Selected Bubble Explanation                                                      |
|   Stage: Location Scorer   Confidence: 0.84                                         |
|   Reasoning: Mentions Houston, county emergency notice, and facility coordinates.   |
|   Prompt Output: {...}                                                             |
+-----------------------------------------------------------------------------------+
```

### 9.4 AI Approver Prompts Page

```text
+------------------------------------------------------+------------------+
| AI Approver Prompts                                  | Right Sidebar    |
|                                                      |   Pipeline       |
| Session status: Modified / Default                   | > AI Approver    |
|                                                      |   Prompts        |
| Gateway Prompt                                       |   State Assigner |
| +--------------------------------------------------+ |   Prompts        |
| | Evaluate whether this article is relevant to ... | |                  |
| +--------------------------------------------------+ |                  |
|                                                      |                  |
| Hazard-Specific Prompts (expandable rows)            |                  |
| +--------------------------+ +---------------------+ |                  |
| | > Chemical               | | (expands to edit)   | |                  |
| | > Wildfire               | | (expands to edit)   | |                  |
| | > Severe Weather         | | (expands to edit)   | |                  |
| +--------------------------+ +---------------------+ |                  |
|                                                      |                  |
| [Apply to Session] [Reset Approver Prompts]          |                  |
+------------------------------------------------------+------------------+
```

### 9.5 AI State Assigner Prompts Page

```text
+------------------------------------------------------+------------------+
| AI State Assigner Prompts                            | Right Sidebar    |
|                                                      |   Pipeline       |
| Session status: Default                              |   AI Approver    |
|                                                      |   Prompts        |
| State Assignment Prompt (single editable field)      | > State Assigner |
| +--------------------------------------------------+ |   Prompts        |
| | Identify the most likely U.S. state for this ... | |                  |
| +--------------------------------------------------+ |                  |
|                                                      |                  |
| Supporting Details (read-only, from NewsNexus12)     |                  |
| - promptId / version                                 |                  |
| - output rules                                       |                  |
|                                                      |                  |
| [Apply to Session] [Reset State Assigner Prompt]     |                  |
+------------------------------------------------------+------------------+
```

## 10. Data Model

NewsNexus Lite has two layers. Durable read-only defaults live in Postgres and are seeded by the copy script. Session state lives in browser memory or session storage and is never written back to the defaults.

### 10.1 Session (session-only)

```json
{
  "sessionId": "sess_123",
  "firstLaunchAnswered": true,
  "createdAt": "2026-06-13T19:00:00Z",
  "updatedAt": "2026-06-13T19:05:00Z",
  "promptState": "modified",
  "activeRunId": "run_456"
}
```

### 10.2 Article (session-only)

```json
{
  "id": "art_001",
  "title": "Chemical plume reported near Houston facility",
  "source": "Local News",
  "description": "Emergency officials reported a chemical plume...",
  "url": "https://example.com/article",
  "publishedAt": "2026-06-13T18:21:00Z",
  "rowStatus": "processing",
  "pipeline": {
    "scraping": { "status": "complete" },
    "locationScorer": { "status": "complete", "score": 0.88, "confidence": 0.84 },
    "stateAssigner": { "status": "running" },
    "semanticScorer": { "status": "pending" },
    "aiApprover": { "status": "pending" }
  }
}
```

### 10.3 Score Explanation (session-only)

```json
{
  "articleId": "art_001",
  "stage": "locationScorer",
  "score": 0.88,
  "confidence": 0.84,
  "reasoning": "Mentions Houston, Harris County, and a nearby facility.",
  "explanation": "The article has strong location evidence for Texas.",
  "promptInput": "Score the article for location specificity...",
  "promptOutput": { "score": 0.88, "evidence": ["Houston", "Harris County"], "confidence": 0.84 },
  "createdAt": "2026-06-13T19:04:00Z"
}
```

### 10.4 AI Approval Result (session-only)

```json
{
  "articleId": "art_001",
  "status": "approved",
  "gateway": {
    "isRelevant": true,
    "confidence": 0.91,
    "reasoning": "Article describes a public safety hazard with location evidence.",
    "promptOutput": { "relevance": "relevant", "confidence": 0.91 }
  },
  "hazards": [
    {
      "hazardType": "chemical",
      "status": "matched",
      "score": 0.86,
      "confidence": 0.82,
      "reasoning": "Chemical plume and shelter-in-place language detected.",
      "promptOutput": { "hazard": "chemical", "match": true }
    }
  ],
  "finalReasoning": "Relevant gateway result and chemical hazard match."
}
```

### 10.5 Prompt Configuration

Two copies exist. The default copy is read-only in Postgres (seeded from NewsNexus12). The session copy is editable and starts as a clone of the default.

```json
{
  "approver": {
    "gatewayPrompt": "Evaluate whether this article is relevant...",
    "hazardPrompts": {
      "chemical": "Evaluate chemical hazard relevance...",
      "wildfire": "Evaluate wildfire hazard relevance...",
      "severeWeather": "Evaluate severe weather relevance..."
    }
  },
  "stateAssigner": {
    "assignmentPrompt": "Identify the most likely U.S. state...",
    "supportingDetails": {
      "promptId": "nn12_state_prompt_v3",
      "outputRules": "Return state abbreviation, confidence, and reasoning."
    }
  },
  "isDefault": false,
  "updatedAt": "2026-06-13T19:03:00Z"
}
```

### 10.6 Postgres Default Store (durable, read-only)

Holds the seeded defaults and fixtures so the demo is consistent and resettable. Suggested logical tables: default prompts (approver gateway, three hazard prompts, state assigner prompt and supporting details), and optional article fixtures for offline or mocked runs. This store is written only by the copy script, never by the running app.

## 11. Data Provenance and Copy Script

NewsNexus Lite seeds its default prompts from the NewsNexus12 database via a one-time, read-only copy script.

| ID | Requirement |
| --- | --- |
| CS-001 | The copy script must read prompt content from NewsNexus12 and write it into the Lite Postgres default store. |
| CS-002 | The copy script must be read-only against NewsNexus12 and must never modify it. |
| CS-003 | The script must map NewsNexus12 prompt records to the Lite prompt configuration shape in section 10.5. The exact source tables and columns must be confirmed before implementation (see Open Questions). |
| CS-004 | If a NewsNexus12 source for the gateway or a given hazard prompt does not exist, the script must fall back to an authored default and record that the value was authored rather than copied. |
| CS-005 | Re-running the script must be idempotent: it refreshes defaults without duplicating rows. |

Note on provenance risk: the NewsNexus12 onboarding material describes generic prompt and AI-approver metadata but does not clearly document a gateway-then-hazard prompt structure with chemical, wildfire, and severe-weather prompts. The gateway-and-hazard breakdown may be specific to NewsNexus Lite. Until the NewsNexus12 prompt schema is confirmed, assume some prompts (especially the three hazard prompts) may be authored fresh rather than copied.

## 12. API Endpoints

Endpoint names are illustrative and may be adapted to existing backend conventions. Session-scoped endpoints operate on the current session; prompt reads return the seeded defaults merged with any session edits.

- `GET /api/demo/session` returns session state, articles, active run, and prompt default/modified status.
- `POST /api/demo/first-launch` accepts `{ "isFirstTime": true|false }` and resets the session to defaults when true.
- `POST /api/demo/reset` accepts a `scope` of `all`, `articles`, `prompts`, `approverPrompts`, or `stateAssignerPrompts`.
- `POST /api/rss/search` accepts a query and optional `limit`, `language`, `region`; returns up to 10 articles plus a truncation indicator.
- `POST /api/orchestration/runs` accepts `articleIds`, ordered `stages`, and `useSessionPrompts`; returns a `runId`, status, current stage, overall progress, and per-stage status.
- `GET /api/orchestration/runs/{runId}` returns run status, current stage, overall progress, per-stage status, and article progress counts.
- `GET /api/articles?runId={runId}` returns article snapshots with location score, assigned state, semantic score, and AI approval status, each with a value, optional confidence, and a status.
- `GET /api/articles/{articleId}` returns the article and its per-stage pipeline state for the expanded row.
- `GET /api/articles/{articleId}/explanations/{stage}` returns reasoning, confidence, prompt input, and prompt output for a stage's score bubble.
- `GET /api/prompts` returns the current approver and state-assigner prompts plus an `isDefault` flag.
- `PUT /api/prompts` accepts a `scope` (`approver` or `stateAssigner`) and the edited prompts; updates the session copy only.

Representative request and response payloads from v01 remain valid; the only structural change is that State Assigner now carries a single `assignmentPrompt` plus read-only `supportingDetails`, and prompt writes never alter the Postgres defaults.

## 13. Frontend State Management

Recommended state slices:

| Slice | Contents |
| --- | --- |
| `session` | `sessionId`, `firstLaunchAnswered`, `hasCompletedLaunchChoice`, `lastResetAt`. |
| `rssSearch` | Query fields, loading state, error state, last successful query. |
| `articles` | Article list, expanded row IDs, row statuses, table sorting/filtering if implemented. |
| `orchestration` | Active run ID, current stage, stage statuses, overall progress, polling state, run errors. |
| `prompts` | Default prompt copy (from Postgres), current session prompt copy, dirty flags by prompt group, validation errors. |
| `ui` | Sidebar route, modal state, toast/banner messages, responsive panel state. |

Reset behavior:

| Reset Type | Behavior |
| --- | --- |
| First-launch `Yes` | Clear article list, clear active run, reset orchestration, reset all session prompts to seeded defaults, set launch choice answered. |
| Manual `Reset Demo` | Same as first-launch `Yes`, but leave launch choice answered. |
| Reset prompt page | Restore only that prompt group to seeded defaults, mark that group clean. |
| New RSS search | Replace article list and clear run outputs for previous articles. |
| Browser refresh | Restore current session state if session storage supports it; otherwise initialize empty state and show the first-launch modal. |

State consistency rules:

| ID | Rule |
| --- | --- |
| SM-001 | Article table values should derive from the latest article snapshot returned by polling or refresh. |
| SM-002 | An expanded row should update when its article appears in a newer snapshot. |
| SM-003 | Prompt edits must not mutate default prompt constants or the Postgres defaults. |
| SM-004 | Starting a run should snapshot the prompt version used by each stage for explainability. |
| SM-005 | If polling fails temporarily, keep the last known successful state and show a recoverable warning. |

## 14. Polling and Live Refresh Strategy

Polling is sufficient for NewsNexus Lite.

| ID | Requirement |
| --- | --- |
| POL-001 | After a run starts, poll `GET /api/orchestration/runs/{runId}` until status is `complete`, `failed`, or `cancelled`. |
| POL-002 | Poll article snapshots while the run is active so table columns and expanded rows populate progressively. |
| POL-003 | Poll an expanded article's detail while it is open and not complete. |
| POL-004 | Recommended active polling interval: 1-2 seconds. |
| POL-005 | Stop polling when no run is active. |
| POL-006 | Use backoff after repeated polling failures, with a visible reconnecting or stale-data state. |
| POL-007 | Avoid duplicate poll loops for the same run. |
| POL-008 | Poll responses must be idempotent and safe to repeat. |

## 15. Orchestration Architecture

### 15.1 Stage Sequence

```text
Scraping
  -> Location Scorer
    -> State Assigner
      -> Semantic Scorer
        -> AI Approver
```

### 15.2 Stage Responsibilities

| Stage | Responsibility | Primary Output |
| --- | --- | --- |
| Scraping | Fetch or normalize RSS article data and descriptions. | Clean article metadata and scrape status. |
| Location Scorer | Score whether article contains usable location evidence. | `locationScore`, reasoning, confidence. |
| State Assigner | Assign most likely U.S. state from article evidence. | `assignedState`, reasoning, confidence. |
| Semantic Scorer | Score semantic relevance to the demo criteria. | `semanticScore`, reasoning, confidence. |
| AI Approver | Evaluate relevance and hazard prompts. | Gateway result, hazard results, final approval status. |

### 15.3 AI Approver Decision Flow

```text
Article
  -> Gateway Prompt
      -> Not Relevant
          -> Final status: rejected or not relevant
          -> Skip hazard prompts
      -> Relevant
          -> Chemical Hazard Prompt
          -> Wildfire Hazard Prompt
          -> Severe Weather Hazard Prompt
          -> Normalize hazard outputs
          -> Final status: approved / rejected / needs review
```

Normalization guidance:

| Result | Suggested Meaning |
| --- | --- |
| `approved` | Gateway relevant and at least one hazard-specific prompt strongly matches. |
| `needs_review` | Gateway relevant but hazard outputs are ambiguous, conflicting, or low confidence. |
| `rejected` | Gateway not relevant or hazard prompts do not match. |
| `failed` | Required approver step failed. |

### 15.4 Real-Time Update Contract

Each stage should write partial results as soon as available; the UI should not wait for the full run to complete.

| Event/Snapshot | Purpose |
| --- | --- |
| Run current stage changed | Animate orchestration panel. |
| Article stage started | Show row and expanded-row processing status. |
| Article stage completed | Populate relevant table column and explanation data. |
| Article stage failed | Show row/expanded-row error state. |
| Run completed | Stop polling and show final state. |

## 16. Edge Cases and Error States

| ID | Scenario | Expected Behavior |
| --- | --- | --- |
| EC-001 | User starts orchestration with no articles. | Disable start or show inline message asking user to search first. |
| EC-002 | RSS search returns more than 10 articles. | Display first 10 or top-ranked 10 and indicate truncation. |
| EC-003 | RSS search returns zero articles. | Show empty state and keep orchestration disabled. |
| EC-004 | RSS request fails. | Show error, preserve prior successful results if any. |
| EC-005 | A single article fails scraping. | Mark that article failed for scraping and skip downstream stages for it. |
| EC-006 | A scoring stage fails for one article. | Show failed bubble/status for that stage while other articles continue. |
| EC-007 | AI Gateway says not relevant. | Skip hazard prompts and show gateway result separately. |
| EC-008 | Hazard prompt fails after gateway relevance. | Show partial AI Approver result and final status `needs_review` or `failed`. |
| EC-009 | Polling times out. | Show stale-state warning and allow manual refresh or retry. |
| EC-010 | User edits prompts during an active run. | Edits apply only to stages not yet started, or the UI states they apply to the next run. |
| EC-011 | User resets demo during active run. | Cancel or abandon active run, clear UI state, ignore late results from the old run. |
| EC-012 | User collapses an expanded row while polling. | Stop that row's detail polling but keep run/table polling active. |
| EC-013 | Copy script finds no NewsNexus12 source for a prompt. | Seed an authored default and flag it as authored rather than copied. |

## 17. Acceptance Criteria

### 17.1 Launch and Reset

| ID | Criteria |
| --- | --- |
| AC-001 | On first load, the modal appears with exact text: "Is this your first time?" |
| AC-002 | Selecting `Yes` clears articles, active runs, scores, approvals, and restores default prompts. |
| AC-003 | Selecting `No` leaves existing session articles, prompts, and run state unchanged. |
| AC-004 | Manual reset performs the same data reset without a page reload. |

### 17.2 Main Workflow

| ID | Criteria |
| --- | --- |
| AC-010 | User can submit a Google RSS query and see up to 10 articles in the table. |
| AC-011 | The table contains all required columns in order or an equivalent responsive order, with the sidebar on the right. |
| AC-012 | Starting orchestration animates the five required stages in sequence. |
| AC-013 | Table columns and expanded rows populate progressively as each stage completes. |
| AC-014 | The UI visibly updates at least once every 2 seconds during active processing when backend updates are available. |
| AC-015 | Completed stages remain visible if later stages fail. |

### 17.3 Detail and Explanations

| ID | Criteria |
| --- | --- |
| AC-020 | Clicking an article row expands it in place for that article. |
| AC-021 | Expanded-row scores appear progressively while processing continues. |
| AC-022 | Each available score appears as a color-coded clickable bubble. |
| AC-023 | Clicking a bubble shows reasoning, explanation, confidence, and prompt output. |
| AC-024 | AI Approver detail separates gateway result from hazard-specific results. |

### 17.4 Prompt Pages

| ID | Criteria |
| --- | --- |
| AC-030 | Right sidebar contains `AI Approver Prompts` and `AI State Assigner Prompts`. |
| AC-031 | AI Approver page shows a gateway prompt section and an expandable hazard table with chemical, wildfire, and severe weather. |
| AC-032 | State Assigner page shows a single editable prompt plus read-only supporting details. |
| AC-033 | Prompt edits affect only the current session and do not alter Postgres defaults. |
| AC-034 | Reset actions restore prompt defaults. |
| AC-035 | Prompt pages show whether current prompts are default or modified. |

### 17.5 Data Provenance

| ID | Criteria |
| --- | --- |
| AC-040 | The copy script populates Lite defaults from NewsNexus12 without modifying NewsNexus12. |
| AC-041 | Re-running the copy script is idempotent. |
| AC-042 | Prompts with no NewsNexus12 source are seeded as authored defaults and flagged as such. |

### 17.6 Error Handling

| ID | Criteria |
| --- | --- |
| AC-050 | Empty search results produce a clear empty state. |
| AC-051 | Failed searches produce a clear recoverable error. |
| AC-052 | Failed pipeline stages are visible at row, expanded-row, and orchestration levels. |
| AC-053 | Polling failures do not erase the last known good article data. |
| AC-054 | Reset during processing prevents stale old-run updates from repopulating the UI. |

## 18. Future Enhancements

| ID | Enhancement |
| --- | --- |
| FE-001 | Add server-sent events or WebSocket streaming for lower-latency updates. |
| FE-002 | Add comparison mode to run the same articles against default and edited prompts. |
| FE-003 | Add exportable demo reports with article outputs and explanations. |
| FE-004 | Add configurable hazard prompt categories beyond the initial three. |
| FE-005 | Add saved demo scenarios for common query types. |
| FE-006 | Add side-by-side view of raw RSS data, scraped content, and normalized article fields. |
| FE-007 | Add accessibility audit mode showing keyboard navigation and screen reader labels. |
| FE-008 | Add lightweight analytics for demo usage without storing article content permanently. |
| FE-009 | Add admin-only toggles for live models versus deterministic mocked outputs. |
| FE-010 | Add retry controls for failed articles or failed individual stages. |

## 19. Open Questions

| ID | Question |
| --- | --- |
| OQ-001 | Should prompt edits apply to an already-running stage, only not-yet-started stages, or only the next run? |
| OQ-002 | Are chemical, wildfire, and severe weather the final hazard set for the initial demo? |
| OQ-003 | Should Google RSS queries hit live RSS, a backend proxy, or deterministic fixtures by default? |
| OQ-004 | Should session state survive browser refresh via session storage, or always reinitialize? |
| OQ-005 | What exact scoring thresholds should stakeholders use for green, amber, and red bubbles? |
| OQ-006 | What are the exact NewsNexus12 source tables and columns the copy script should read for the gateway, hazard, and state-assigner prompts? |
| OQ-007 | Does the gateway-plus-hazard structure exist in NewsNexus12, or must the hazard prompts be authored fresh for Lite? |
| OQ-008 | Should the Lite Postgres database stand alone, or reuse the NewsNexus12 db-models package and conventions? |
| OQ-009 | Live models or deterministic mocked outputs for scoring and approval in the default demo configuration? |
