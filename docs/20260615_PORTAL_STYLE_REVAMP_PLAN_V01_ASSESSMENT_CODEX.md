---
created_at: 2026-06-15
updated_at: 2026-06-15
created_by: codex (gpt-5)
modified_by: codex (gpt-5)
---

# Portal Style Revamp Plan V01 Assessment

1. The description modal plan does not actually surface scraped article body content.

   Why it matters: PRD §6.5 requires the Description modal to show the article description and scraped article body/link when available. The plan says scraped body is "already present on the Article record (`article.description`, `article.url`)" and makes `apiClient.getArticle()` optional. In the current backend, scraping output is stored at `article.pipeline.scraping.body`, but orchestration snapshots intentionally strip that field before updating frontend state. The full `GET /api/articles/:articleId` endpoint can return it, while the in-state article usually cannot. Implementing the plan as written will likely show only RSS description/link and miss available scraped body after a run.

   Remediation: Update the plan so `DescriptionModal` fetches `apiClient.getArticle(articleId)` when opened or when the scraping stage is complete, types the returned article enough to read `pipeline.scraping.body`, `scrapingSource`, and `scrapedAt`, and falls back to the current slice's `description`/`url` while loading or when no scraped body exists. Keep the API endpoint unchanged.

2. The self-containment grep acceptance check is too broad and conflicts with existing Lite copy.

   Why it matters: The plan alternates between `grep -r "NewsNexus12" portal/src` and `grep -r "NewsNexus12" portal/` as a required empty check. Both currently produce legitimate matches that are not runtime coupling, including `NewsNexus12Lite` package/docs text and the prompts page copy "Read-only - sourced from NewsNexus12 defaults." PRD §6.7 says prompt page copy is unchanged, so a literal empty grep over `portal/src` would either fail the plan's acceptance criteria or pressure the implementer to change copy outside the visual-only scope.

   Remediation: Replace the acceptance check with targeted coupling checks, such as searching for sibling-path imports/references (`../NewsNexus12`, `/home/.../NewsNexus12`, `app://`-style links, symlinks) and verifying `portal/src` imports resolve only within Lite or npm packages. Allow product text such as `NewsNexus12Lite` and existing "sourced from NewsNexus12 defaults" copy.
