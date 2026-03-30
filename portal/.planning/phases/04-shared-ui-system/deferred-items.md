# Deferred Items — Phase 04

## fire-app src/ directory deletion

**Discovered during:** Plan 04-03, Task 2
**Severity:** High — fire-app cannot build without source files
**Description:** fire-app has 281 deleted files in git status — the entire src/ directory is missing from disk. Only the `.next/` build artifact directory and root config files remain. This was likely caused by Phase 2 monorepo robocopy operations that excluded or failed to copy the src/ directory.

**What was done:** globals.css was restored from git history to enable Plan 04-03 completion.

**What remains:** All other src/ files (pages, components, lib, etc.) are still deleted and need to be restored via `git checkout -- src/` or a full `git restore src/` in the fire-app repo.

**Resolution:** Run `git restore src/` in `c:/Software code GITs/LandManagment Website/fire-app/` to restore all deleted source files. Then verify `pnpm build` passes in fire-app.
