---
created_at: 2026-06-15
updated_at: 2026-06-15
created_by: codex (gpt-5)
modified_by: codex (gpt-5)
---

# TODO Assessment

1. The TODO contradicts itself on lockfile handling.

   Why it matters: Phase 1, Phase 3, and Phase 4 require adding npm dependencies and
   running a normal install. This repo has `portal/package-lock.json`, so a normal npm
   install should update the lockfile. However Phase 7 says to confirm "no
   backend/API/demo/lockfile changes," and Appendix A lists lockfiles as untouched.
   That can lead an implementer to either avoid the required install, leave
   `package-lock.json` stale, or fail the final gate despite doing the correct package
   work.

   Remediation: Update the TODO to distinguish manual edits from generated lockfile
   updates. Keep "no lockfile hand-edits," but explicitly state that
   `portal/package-lock.json` changes produced by normal npm install are expected and
   should be committed with the dependency changes. Move `portal/package-lock.json`
   from "Untouched" to "Modified when dependencies are installed," and adjust the
   Phase 7 hard-constraint check to say "no hand-edited or unrelated lockfile changes."
